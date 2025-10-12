-- Phase 1: Database Architecture & Security Foundation (Complete Fix)

-- 1.1 Create Role System
CREATE TYPE public.app_role AS ENUM ('admin', 'service_user', 'client_admin', 'user', 'store_owner');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 1.2 Create Multi-Client Access System
CREATE TABLE public.user_client_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, client_id)
);

ALTER TABLE public.user_client_access ENABLE ROW LEVEL SECURITY;

-- 1.3 Create Store-Level Access System
CREATE TABLE public.store_owner_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE public.store_owner_access ENABLE ROW LEVEL SECURITY;

-- 1.4 Create Security Definer Functions
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_roles(_user_id UUID)
RETURNS TABLE(role public.app_role)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_access_client(_user_id UUID, _client_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.user_client_access WHERE user_id = _user_id AND client_id = _client_id
  ) OR EXISTS (
    SELECT 1 FROM public.profiles WHERE user_id = _user_id AND client_id = _client_id
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_accessible_clients(_user_id UUID)
RETURNS TABLE(client_id TEXT)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.clients
  WHERE EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin')
  UNION
  SELECT client_id FROM public.user_client_access WHERE user_id = _user_id
  UNION
  SELECT client_id FROM public.profiles WHERE user_id = _user_id AND client_id IS NOT NULL
$$;

CREATE OR REPLACE FUNCTION public.can_access_business(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  ) OR EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.client_id = p.client_id
    WHERE b.id = _business_id AND p.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.user_client_access uca ON b.client_id = uca.client_id
    WHERE b.id = _business_id AND uca.user_id = _user_id
  ) OR EXISTS (
    SELECT 1 FROM public.store_owner_access WHERE user_id = _user_id AND business_id = _business_id
  )
$$;

-- Migrate existing role data
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role::public.app_role
FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 1.5 Update RLS Policies

-- user_roles table
CREATE POLICY "Admins can manage all user roles"
ON public.user_roles FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid());

-- user_client_access table
CREATE POLICY "Admins can manage client access"
ON public.user_client_access FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can view their own client access"
ON public.user_client_access FOR SELECT
USING (user_id = auth.uid());

-- store_owner_access table
CREATE POLICY "Admins can manage store owner access"
ON public.store_owner_access FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client admins can manage store owner access in their client"
ON public.store_owner_access FOR ALL
USING (
  public.has_role(auth.uid(), 'client_admin') AND
  EXISTS (
    SELECT 1 FROM public.businesses b
    INNER JOIN public.profiles p ON b.client_id = p.client_id
    WHERE b.id = store_owner_access.business_id AND p.user_id = auth.uid()
  )
);

CREATE POLICY "Store owners can view their own access"
ON public.store_owner_access FOR SELECT
USING (user_id = auth.uid());

-- Update storage.objects policies
DROP POLICY IF EXISTS "Admin users can list json-exports files" ON storage.objects;
CREATE POLICY "Admin users can list json-exports files"
ON storage.objects FOR SELECT
USING (bucket_id = 'json-exports' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin users can upload to json-exports" ON storage.objects;
CREATE POLICY "Admin users can upload to json-exports"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'json-exports' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin users can update json-exports files" ON storage.objects;
CREATE POLICY "Admin users can update json-exports files"
ON storage.objects FOR UPDATE
USING (bucket_id = 'json-exports' AND public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin users can delete json-exports files" ON storage.objects;
CREATE POLICY "Admin users can delete json-exports files"
ON storage.objects FOR DELETE
USING (bucket_id = 'json-exports' AND public.has_role(auth.uid(), 'admin'));

-- Update client_categories
DROP POLICY IF EXISTS "Admin users can manage client categories" ON public.client_categories;
CREATE POLICY "Admin users can manage client categories"
ON public.client_categories FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

-- Update profiles
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admin users can view all profiles" ON public.profiles;
CREATE POLICY "Admin users can view all profiles"
ON public.profiles FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin users can update all profiles" ON public.profiles;
CREATE POLICY "Admin users can update all profiles"
ON public.profiles FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Update clients
DROP POLICY IF EXISTS "Admin users can manage clients" ON public.clients;
CREATE POLICY "Admin users can manage clients"
ON public.clients FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admin users can insert clients" ON public.clients;

CREATE POLICY "Service users can view assigned clients"
ON public.clients FOR SELECT
USING (
  public.has_role(auth.uid(), 'service_user') AND
  id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))
);

-- Update businesses
DROP POLICY IF EXISTS "Users can view businesses from their client" ON public.businesses;
CREATE POLICY "Users can view businesses from their client"
ON public.businesses FOR SELECT
USING (
  public.has_role(auth.uid(), 'admin') OR
  (client_id = get_user_client_id()) OR
  (public.has_role(auth.uid(), 'service_user') AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))) OR
  (public.has_role(auth.uid(), 'store_owner') AND id IN (SELECT business_id FROM public.store_owner_access WHERE user_id = auth.uid())) OR
  ((client_id IS NULL) AND (auth.uid() = user_id))
);

DROP POLICY IF EXISTS "Users can create businesses for their client" ON public.businesses;
CREATE POLICY "Users can create businesses for their client"
ON public.businesses FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (client_id = get_user_client_id()) OR
  (public.has_role(auth.uid(), 'service_user') AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))) OR
  (public.has_role(auth.uid(), 'store_owner') AND NOT EXISTS (SELECT 1 FROM public.businesses WHERE user_id = auth.uid())) OR
  ((client_id IS NULL) AND (auth.uid() = user_id))
);

DROP POLICY IF EXISTS "Users can update businesses from their client" ON public.businesses;
CREATE POLICY "Users can update businesses from their client"
ON public.businesses FOR UPDATE
USING (
  public.has_role(auth.uid(), 'admin') OR
  (client_id = get_user_client_id()) OR
  (public.has_role(auth.uid(), 'service_user') AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))) OR
  (public.has_role(auth.uid(), 'store_owner') AND id IN (SELECT business_id FROM public.store_owner_access WHERE user_id = auth.uid())) OR
  ((client_id IS NULL) AND (auth.uid() = user_id))
)
WITH CHECK (
  public.has_role(auth.uid(), 'admin') OR
  (client_id = get_user_client_id()) OR
  (public.has_role(auth.uid(), 'service_user') AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))) OR
  (public.has_role(auth.uid(), 'store_owner') AND id IN (SELECT business_id FROM public.store_owner_access WHERE user_id = auth.uid())) OR
  ((client_id IS NULL) AND (auth.uid() = user_id))
);

DROP POLICY IF EXISTS "Users can delete businesses from their client" ON public.businesses;
CREATE POLICY "Users can delete businesses from their client"
ON public.businesses FOR DELETE
USING (
  public.has_role(auth.uid(), 'admin') OR
  (client_id = get_user_client_id()) OR
  (public.has_role(auth.uid(), 'service_user') AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))) OR
  (public.has_role(auth.uid(), 'store_owner') AND id IN (SELECT business_id FROM public.store_owner_access WHERE user_id = auth.uid())) OR
  ((client_id IS NULL) AND (auth.uid() = user_id))
);

-- Drop old function
DROP FUNCTION IF EXISTS public.is_admin_user();

-- Add triggers
CREATE TRIGGER update_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_client_access_updated_at
BEFORE UPDATE ON public.user_client_access
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Drop role column
ALTER TABLE public.profiles DROP COLUMN IF EXISTS role;
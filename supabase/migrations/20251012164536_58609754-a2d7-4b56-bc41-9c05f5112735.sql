-- Add new roles to the app_role enum (skip if already exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'client_admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'client_admin';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'store_owner' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'store_owner';
  END IF;
END $$;

-- Create store_owner_access table
CREATE TABLE IF NOT EXISTS public.store_owner_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES public.businesses(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, business_id)
);

ALTER TABLE public.store_owner_access ENABLE ROW LEVEL SECURITY;

-- Create helper functions
CREATE OR REPLACE FUNCTION public.can_access_as_store_owner(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.store_owner_access
    WHERE user_id = _user_id AND business_id = _business_id
  )
$$;

CREATE OR REPLACE FUNCTION public.can_manage_store_owner_access(_user_id UUID, _business_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    public.has_role(_user_id, 'admin')
    OR (
      public.has_role(_user_id, 'client_admin')
      AND EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.user_id = _user_id
          AND p.client_id = (
            SELECT b.client_id FROM public.businesses b WHERE b.id = _business_id
          )
      )
    )
$$;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Admins can manage store owner access" ON public.store_owner_access;
DROP POLICY IF EXISTS "Client admins can manage store owner access safely" ON public.store_owner_access;
DROP POLICY IF EXISTS "Store owners can view their own access" ON public.store_owner_access;
DROP POLICY IF EXISTS "Store owners can view their assigned business" ON public.businesses;
DROP POLICY IF EXISTS "Store owners can update their assigned business" ON public.businesses;
DROP POLICY IF EXISTS "Store owners can delete their assigned business" ON public.businesses;

-- RLS policies for store_owner_access
CREATE POLICY "Admins can manage store owner access"
  ON public.store_owner_access
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Client admins can manage store owner access safely"
  ON public.store_owner_access
  FOR ALL
  TO authenticated
  USING (public.can_manage_store_owner_access(auth.uid(), business_id))
  WITH CHECK (public.can_manage_store_owner_access(auth.uid(), business_id));

CREATE POLICY "Store owners can view their own access"
  ON public.store_owner_access
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- RLS policies for store_owner on businesses table
CREATE POLICY "Store owners can view their assigned business"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'store_owner')
    AND public.can_access_as_store_owner(auth.uid(), id)
  );

CREATE POLICY "Store owners can update their assigned business"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'store_owner')
    AND public.can_access_as_store_owner(auth.uid(), id)
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'store_owner')
    AND public.can_access_as_store_owner(auth.uid(), id)
  );

CREATE POLICY "Store owners can delete their assigned business"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'store_owner')
    AND public.can_access_as_store_owner(auth.uid(), id)
  );
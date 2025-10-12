-- Step 1: Drop ALL existing policies on businesses (comprehensive cleanup)
DROP POLICY IF EXISTS "Users can view businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses for their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can view businesses via profile match" ON public.businesses;
DROP POLICY IF EXISTS "Admin can view all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Service users can view assigned client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view their client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Store owners can view their assigned business" ON public.businesses;
DROP POLICY IF EXISTS "Users can view their own legacy businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admin can insert all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Service users can insert to assigned clients" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert to their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can insert legacy businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admin can update all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Service users can update assigned client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Store owners can update their assigned business" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their own legacy businesses" ON public.businesses;
DROP POLICY IF EXISTS "Admin can delete all businesses" ON public.businesses;
DROP POLICY IF EXISTS "Service users can delete assigned client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete their client businesses" ON public.businesses;
DROP POLICY IF EXISTS "Store owners can delete their assigned business" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete their own legacy businesses" ON public.businesses;

-- Keep the service role policy
-- "Service role can manage all businesses" - stays

-- Step 2: Create SECURITY DEFINER function for store owner access
CREATE OR REPLACE FUNCTION public.can_access_as_store_owner(_user_id uuid, _business_id uuid)
RETURNS boolean
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

-- Step 3: Create separate SELECT policies
CREATE POLICY "Admin can view all businesses"
ON public.businesses FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can view assigned client businesses"
ON public.businesses FOR SELECT
USING (
  public.has_role(auth.uid(), 'service_user')
  AND client_id IN (
    SELECT client_id FROM public.user_client_access WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can view their client businesses"
ON public.businesses FOR SELECT
USING (
  (public.has_role(auth.uid(), 'user') OR public.has_role(auth.uid(), 'client_admin'))
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND client_id = businesses.client_id
  )
);

CREATE POLICY "Store owners can view their assigned business"
ON public.businesses FOR SELECT
USING (
  public.has_role(auth.uid(), 'store_owner')
  AND public.can_access_as_store_owner(auth.uid(), id)
);

CREATE POLICY "Users can view their own legacy businesses"
ON public.businesses FOR SELECT
USING (client_id IS NULL AND user_id = auth.uid());

-- Step 4: Create separate INSERT policies
CREATE POLICY "Admin can insert all businesses"
ON public.businesses FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can insert to assigned clients"
ON public.businesses FOR INSERT
WITH CHECK (
  public.has_role(auth.uid(), 'service_user')
  AND client_id IN (
    SELECT client_id FROM public.user_client_access WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert to their client"
ON public.businesses FOR INSERT
WITH CHECK (
  (public.has_role(auth.uid(), 'user') OR public.has_role(auth.uid(), 'client_admin'))
  AND client_id = public.get_user_client_id()
);

CREATE POLICY "Users can insert legacy businesses"
ON public.businesses FOR INSERT
WITH CHECK (client_id IS NULL AND user_id = auth.uid());

-- Step 5: Create separate UPDATE policies
CREATE POLICY "Admin can update all businesses"
ON public.businesses FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can update assigned client businesses"
ON public.businesses FOR UPDATE
USING (
  public.has_role(auth.uid(), 'service_user')
  AND client_id IN (
    SELECT client_id FROM public.user_client_access WHERE user_id = auth.uid()
  )
)
WITH CHECK (
  public.has_role(auth.uid(), 'service_user')
  AND client_id IN (
    SELECT client_id FROM public.user_client_access WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their client businesses"
ON public.businesses FOR UPDATE
USING (
  (public.has_role(auth.uid(), 'user') OR public.has_role(auth.uid(), 'client_admin'))
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND client_id = businesses.client_id
  )
)
WITH CHECK (
  (public.has_role(auth.uid(), 'user') OR public.has_role(auth.uid(), 'client_admin'))
  AND client_id = public.get_user_client_id()
);

CREATE POLICY "Store owners can update their assigned business"
ON public.businesses FOR UPDATE
USING (
  public.has_role(auth.uid(), 'store_owner')
  AND public.can_access_as_store_owner(auth.uid(), id)
)
WITH CHECK (
  public.has_role(auth.uid(), 'store_owner')
  AND public.can_access_as_store_owner(auth.uid(), id)
);

CREATE POLICY "Users can update their own legacy businesses"
ON public.businesses FOR UPDATE
USING (client_id IS NULL AND user_id = auth.uid())
WITH CHECK (client_id IS NULL AND user_id = auth.uid());

-- Step 6: Create separate DELETE policies
CREATE POLICY "Admin can delete all businesses"
ON public.businesses FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service users can delete assigned client businesses"
ON public.businesses FOR DELETE
USING (
  public.has_role(auth.uid(), 'service_user')
  AND client_id IN (
    SELECT client_id FROM public.user_client_access WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their client businesses"
ON public.businesses FOR DELETE
USING (
  (public.has_role(auth.uid(), 'user') OR public.has_role(auth.uid(), 'client_admin'))
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND client_id = businesses.client_id
  )
);

CREATE POLICY "Store owners can delete their assigned business"
ON public.businesses FOR DELETE
USING (
  public.has_role(auth.uid(), 'store_owner')
  AND public.can_access_as_store_owner(auth.uid(), id)
);

CREATE POLICY "Users can delete their own legacy businesses"
ON public.businesses FOR DELETE
USING (client_id IS NULL AND user_id = auth.uid());

-- Step 7: Fix store_owner_access policies
DROP POLICY IF EXISTS "Client admins can manage store owner access in their client" ON public.store_owner_access;
DROP POLICY IF EXISTS "Client admins can manage store owner access safely" ON public.store_owner_access;

CREATE OR REPLACE FUNCTION public.can_manage_store_owner_access(_user_id uuid, _business_id uuid)
RETURNS boolean
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

CREATE POLICY "Client admins can manage store owner access safely"
ON public.store_owner_access FOR ALL
USING (public.can_manage_store_owner_access(auth.uid(), business_id))
WITH CHECK (public.can_manage_store_owner_access(auth.uid(), business_id));
-- Allow client_admin users to read their assigned client
CREATE POLICY "Client admins can view their client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'client_admin'::app_role)
  AND id IN (
    SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- Allow regular users to read their assigned client
CREATE POLICY "Users can view their client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'user'::app_role)
  AND id IN (
    SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);

-- Allow store owners to read their assigned client
CREATE POLICY "Store owners can view their client"
ON public.clients
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'store_owner'::app_role)
  AND id IN (
    SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid()
  )
);
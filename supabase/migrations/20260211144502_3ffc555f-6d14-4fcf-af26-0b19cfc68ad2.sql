-- Fix: All policies on user_country_access are RESTRICTIVE which means NO access is granted
-- because there are no permissive policies. We need to convert "Users can view their own country access"
-- to a PERMISSIVE policy.

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Users can view their own country access" ON public.user_country_access;

-- Re-create as PERMISSIVE so regular users can actually read their own country access
CREATE POLICY "Users can view their own country access"
ON public.user_country_access
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Also need to make the admin/service policies permissive for them to work
DROP POLICY IF EXISTS "Admins can manage country access" ON public.user_country_access;
CREATE POLICY "Admins can manage country access"
ON public.user_country_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Service users can manage country access for assigned client users" ON public.user_country_access;
CREATE POLICY "Service users can manage country access for assigned client users"
ON public.user_country_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'service_user'::app_role) AND EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = user_country_access.user_id
  AND p.client_id IN (
    SELECT get_user_accessible_clients.client_id
    FROM get_user_accessible_clients(auth.uid())
  )
))
WITH CHECK (has_role(auth.uid(), 'service_user'::app_role) AND EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.user_id = user_country_access.user_id
  AND p.client_id IN (
    SELECT get_user_accessible_clients.client_id
    FROM get_user_accessible_clients(auth.uid())
  )
));

DROP POLICY IF EXISTS "Client admins can manage country access for their client users" ON public.user_country_access;
CREATE POLICY "Client admins can manage country access for their client users"
ON public.user_country_access
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'client_admin'::app_role) AND EXISTS (
  SELECT 1 FROM profiles p1
  JOIN profiles p2 ON p1.client_id = p2.client_id
  WHERE p1.user_id = auth.uid()
  AND p2.user_id = user_country_access.user_id
))
WITH CHECK (has_role(auth.uid(), 'client_admin'::app_role) AND EXISTS (
  SELECT 1 FROM profiles p1
  JOIN profiles p2 ON p1.client_id = p2.client_id
  WHERE p1.user_id = auth.uid()
  AND p2.user_id = user_country_access.user_id
));

DROP POLICY IF EXISTS "Service role can manage all country access" ON public.user_country_access;
CREATE POLICY "Service role can manage all country access"
ON public.user_country_access
FOR ALL
TO authenticated
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
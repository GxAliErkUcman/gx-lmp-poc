-- Create table for country-based access restrictions
-- If a user has entries here, they can only see businesses in those countries
-- If they have NO entries, they can see all businesses (no restriction)
CREATE TABLE public.user_country_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  country_code text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE (user_id, country_code)
);

-- Enable RLS
ALTER TABLE public.user_country_access ENABLE ROW LEVEL SECURITY;

-- Admins can manage all country access
CREATE POLICY "Admins can manage country access"
ON public.user_country_access
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Service users can manage country access for users in their assigned clients
CREATE POLICY "Service users can manage country access for assigned client users"
ON public.user_country_access
FOR ALL
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

-- Client admins can manage country access for users in their client
CREATE POLICY "Client admins can manage country access for their client users"
ON public.user_country_access
FOR ALL
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

-- Users can view their own country access
CREATE POLICY "Users can view their own country access"
ON public.user_country_access
FOR SELECT
USING (user_id = auth.uid());

-- Service role can manage all
CREATE POLICY "Service role can manage all country access"
ON public.user_country_access
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);
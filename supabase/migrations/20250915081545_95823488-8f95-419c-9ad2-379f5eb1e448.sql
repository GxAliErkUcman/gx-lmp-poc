-- Create a security definer function to check if user is admin (prevents infinite recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop the existing restrictive policy
DROP POLICY "Only service role can manage clients" ON public.clients;

-- Create new policies that allow both service role and admin users
CREATE POLICY "Service role can manage all clients" 
ON public.clients 
FOR ALL 
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

CREATE POLICY "Admin users can manage clients" 
ON public.clients 
FOR ALL 
USING (public.is_admin_user());

CREATE POLICY "Admin users can insert clients" 
ON public.clients 
FOR INSERT 
WITH CHECK (public.is_admin_user());
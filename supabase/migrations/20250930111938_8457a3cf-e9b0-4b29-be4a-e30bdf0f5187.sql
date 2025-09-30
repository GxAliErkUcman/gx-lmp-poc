-- Add explicit policy to deny unauthenticated access to profiles table
CREATE POLICY "Deny unauthenticated access to profiles"
ON public.profiles
FOR SELECT
TO anon
USING (false);
-- Add policy for users to view their own profile
-- This is critical for get_user_client_id() to work properly in all contexts
CREATE POLICY "Users can view their own profile"
ON public.profiles
FOR SELECT
USING (auth.uid() = user_id);
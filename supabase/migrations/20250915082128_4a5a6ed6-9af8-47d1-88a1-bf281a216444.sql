-- Allow admin users to view all profiles for user management
CREATE POLICY "Admin users can view all profiles" 
ON public.profiles 
FOR SELECT 
USING (public.is_admin_user());
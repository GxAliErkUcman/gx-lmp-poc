-- Backfill profiles for any auth.users missing in public.profiles
INSERT INTO public.profiles (user_id, email, first_name, last_name, role)
SELECT 
  u.id,
  u.email,
  COALESCE(NULLIF(split_part(u.email, '@', 1), ''), 'User') AS first_name,
  'User' AS last_name,
  'user'::text AS role
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL;

-- Allow admins to update any profile (needed to assign/remove client_id)
CREATE POLICY IF NOT EXISTS "Admin users can update all profiles"
ON public.profiles
FOR UPDATE
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Drop the unsafe UPDATE policy that allows client_id tampering
DROP POLICY IF EXISTS "Users can update their own profile (except role)" ON public.profiles;

-- Recreate: users can update their own profile but client_id must remain unchanged
CREATE POLICY "Users can update their own profile (except role)"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND client_id IS NOT DISTINCT FROM (
    SELECT p.client_id FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1
  )
);

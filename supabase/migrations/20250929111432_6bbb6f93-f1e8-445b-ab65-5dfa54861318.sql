-- Drop the existing restrictive policy that only allows users to see their own profile
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create a new policy that allows users to view profiles within their client
CREATE POLICY "Users can view profiles within their client" 
ON public.profiles 
FOR SELECT 
USING (
  -- Admin users can see all profiles (already covered by separate policy)
  -- Regular users can see profiles within their own client
  client_id = get_user_client_id()
);
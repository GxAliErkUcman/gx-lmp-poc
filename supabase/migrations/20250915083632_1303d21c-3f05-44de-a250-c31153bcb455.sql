-- Create a security definer function to get user's client_id
CREATE OR REPLACE FUNCTION public.get_user_client_id()
RETURNS UUID AS $$
  SELECT client_id FROM public.profiles 
  WHERE user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE SQL SECURITY DEFINER STABLE SET search_path = public;

-- Drop existing user-based policies
DROP POLICY "Users can view their own businesses" ON public.businesses;
DROP POLICY "Users can create their own businesses" ON public.businesses;
DROP POLICY "Users can update their own businesses" ON public.businesses;
DROP POLICY "Users can delete their own businesses" ON public.businesses;

-- Create new client-based policies
CREATE POLICY "Users can view businesses from their client" 
ON public.businesses 
FOR SELECT 
USING (
  client_id = public.get_user_client_id() OR
  (client_id IS NULL AND auth.uid() = user_id) -- fallback for businesses without client_id
);

CREATE POLICY "Users can create businesses for their client" 
ON public.businesses 
FOR INSERT 
WITH CHECK (
  client_id = public.get_user_client_id() OR
  (client_id IS NULL AND auth.uid() = user_id) -- fallback for businesses without client_id
);

CREATE POLICY "Users can update businesses from their client" 
ON public.businesses 
FOR UPDATE 
USING (
  client_id = public.get_user_client_id() OR
  (client_id IS NULL AND auth.uid() = user_id) -- fallback for businesses without client_id
)
WITH CHECK (
  client_id = public.get_user_client_id() OR
  (client_id IS NULL AND auth.uid() = user_id) -- fallback for businesses without client_id
);

CREATE POLICY "Users can delete businesses from their client" 
ON public.businesses 
FOR DELETE 
USING (
  client_id = public.get_user_client_id() OR
  (client_id IS NULL AND auth.uid() = user_id) -- fallback for businesses without client_id
);
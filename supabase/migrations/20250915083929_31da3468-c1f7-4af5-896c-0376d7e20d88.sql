-- Drop and recreate client-based policies 
DROP POLICY IF EXISTS "Users can view businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can create businesses for their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can update businesses from their client" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete businesses from their client" ON public.businesses;

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
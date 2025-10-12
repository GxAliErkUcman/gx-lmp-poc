-- Add explicit join-based policy to ensure users see businesses in their client
CREATE POLICY "Users can view businesses via profile match"
ON public.businesses
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.user_id = auth.uid() AND p.client_id = businesses.client_id
  )
);
-- Create storage policies for business photos bucket
CREATE POLICY "Users can view business photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-photos');

CREATE POLICY "Users can upload their own business photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own business photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own business photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
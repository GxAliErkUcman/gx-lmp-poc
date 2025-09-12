-- Create storage policies for business-photos bucket to allow authenticated users to upload and access files

-- Policy to allow authenticated users to upload their own photos
-- Using user_id in the file path structure: user_id/filename
CREATE POLICY "Authenticated users can upload business photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'business-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to view their own photos
CREATE POLICY "Authenticated users can view their business photos" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'business-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to update their own photos
CREATE POLICY "Authenticated users can update their business photos" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'business-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Policy to allow authenticated users to delete their own photos
CREATE POLICY "Authenticated users can delete their business photos" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'business-photos' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);
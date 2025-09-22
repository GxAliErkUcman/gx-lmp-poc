-- Create storage policies for json-exports bucket to allow admin users to list and access files

-- Policy to allow admin users to list objects in json-exports bucket
CREATE POLICY "Admin users can list json-exports files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'json-exports' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy to allow admin users to insert objects in json-exports bucket
CREATE POLICY "Admin users can upload to json-exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'json-exports' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy to allow admin users to update objects in json-exports bucket
CREATE POLICY "Admin users can update json-exports files" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'json-exports' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Policy to allow admin users to delete objects in json-exports bucket
CREATE POLICY "Admin users can delete json-exports files" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'json-exports' 
  AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);
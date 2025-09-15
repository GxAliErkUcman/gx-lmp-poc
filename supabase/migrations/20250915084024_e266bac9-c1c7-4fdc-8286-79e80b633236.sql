-- Migrate existing businesses without client_id to use their creator's client_id
UPDATE public.businesses 
SET client_id = (
  SELECT p.client_id 
  FROM public.profiles p 
  WHERE p.user_id = businesses.user_id
)
WHERE client_id IS NULL 
AND EXISTS (
  SELECT 1 FROM public.profiles p 
  WHERE p.user_id = businesses.user_id 
  AND p.client_id IS NOT NULL
);
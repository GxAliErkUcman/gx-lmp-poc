-- Add goldmine field for unstructured data per location
ALTER TABLE public.businesses 
ADD COLUMN goldmine text;
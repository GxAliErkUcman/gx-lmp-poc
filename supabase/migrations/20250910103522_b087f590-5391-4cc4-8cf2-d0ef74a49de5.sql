-- Create businesses table with comprehensive Google Business Profile schema
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  primary_category TEXT,
  additional_categories TEXT[], -- Array of strings
  
  -- Address fields
  street TEXT,
  suite TEXT,
  city TEXT,
  postal_code TEXT,
  region TEXT,
  country TEXT,
  
  service_area TEXT[], -- Array of service areas
  phone TEXT,
  website TEXT,
  
  -- Business hours stored as JSONB
  hours JSONB DEFAULT '{
    "monday": "09:00-18:00",
    "tuesday": "09:00-18:00", 
    "wednesday": "09:00-18:00",
    "thursday": "09:00-18:00",
    "friday": "09:00-18:00",
    "saturday": "10:00-14:00",
    "sunday": "Closed"
  }'::jsonb,
  
  description TEXT,
  attributes TEXT[], -- Array of business attributes
  
  -- Products stored as JSONB array
  products JSONB DEFAULT '[]'::jsonb,
  
  -- Photos stored as JSONB array  
  photos JSONB DEFAULT '[]'::jsonb,
  
  -- Coordinates
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Google IDs
  place_id TEXT,
  cid TEXT,
  business_profile_id TEXT,
  kg_id TEXT,
  
  opening_date DATE,
  
  -- Reviews
  review_count INTEGER DEFAULT 0,
  review_rating NUMERIC(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own businesses" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own businesses" 
ON public.businesses 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own businesses" 
ON public.businesses 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own businesses" 
ON public.businesses 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for business photos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('business-photos', 'business-photos', true);

-- Create storage policies for business photos
CREATE POLICY "Users can view business photos" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'business-photos');

CREATE POLICY "Users can upload business photos" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their business photos" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their business photos" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'business-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
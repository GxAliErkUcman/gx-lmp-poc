-- Drop existing businesses table and recreate with exact schema matching
DROP TABLE IF EXISTS businesses CASCADE;

-- Create new businesses table matching JSON schema exactly
CREATE TABLE public.businesses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  
  -- Required fields
  "storeCode" TEXT NOT NULL UNIQUE,
  "businessName" TEXT NOT NULL,
  "addressLine1" TEXT NOT NULL,
  country TEXT NOT NULL,
  "primaryCategory" TEXT NOT NULL,
  
  -- Optional address fields
  "addressLine2" TEXT,
  "addressLine3" TEXT,
  "addressLine4" TEXT,
  "addressLine5" TEXT,
  "postalCode" TEXT,
  district TEXT,
  city TEXT,
  state TEXT,
  latitude NUMERIC,
  longitude NUMERIC,
  
  -- Category and business info
  "additionalCategories" TEXT, -- comma-separated string instead of array
  website TEXT,
  "primaryPhone" TEXT,
  "additionalPhones" TEXT,
  adwords TEXT,
  "openingDate" DATE,
  "fromTheBusiness" TEXT,
  labels TEXT,
  
  -- Individual day hours instead of JSON object
  "mondayHours" TEXT,
  "tuesdayHours" TEXT,
  "wednesdayHours" TEXT,
  "thursdayHours" TEXT,
  "fridayHours" TEXT,
  "saturdayHours" TEXT,
  "sundayHours" TEXT,
  "specialHours" TEXT,
  "moreHours" JSONB,
  
  -- Status
  "temporarilyClosed" BOOLEAN DEFAULT false,
  
  -- Photos as URLs
  "logoPhoto" TEXT,
  "coverPhoto" TEXT,
  "otherPhotos" TEXT, -- comma-separated URLs
  
  -- Service URLs
  "appointmentURL" TEXT,
  "menuURL" TEXT,
  "reservationsURL" TEXT,
  "orderAheadURL" TEXT,
  
  -- Services and social media
  "customServices" JSONB,
  "socialMediaUrls" JSONB,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT businesses_store_code_length CHECK (char_length("storeCode") >= 1 AND char_length("storeCode") <= 64),
  CONSTRAINT businesses_business_name_length CHECK (char_length("businessName") >= 1 AND char_length("businessName") <= 300),
  CONSTRAINT businesses_address_line1_length CHECK (char_length("addressLine1") >= 1 AND char_length("addressLine1") <= 80),
  CONSTRAINT businesses_country_length CHECK (char_length(country) >= 2),
  CONSTRAINT businesses_primary_category_length CHECK (char_length("primaryCategory") >= 2),
  CONSTRAINT businesses_latitude_range CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),
  CONSTRAINT businesses_longitude_range CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),
  CONSTRAINT businesses_from_business_length CHECK ("fromTheBusiness" IS NULL OR char_length("fromTheBusiness") <= 750),
  CONSTRAINT businesses_website_length CHECK (website IS NULL OR char_length(website) <= 2083)
);

-- Enable Row Level Security
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
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

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_businesses_updated_at
BEFORE UPDATE ON public.businesses
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for store code uniqueness and performance
CREATE INDEX idx_businesses_store_code ON public.businesses("storeCode");
CREATE INDEX idx_businesses_user_id ON public.businesses(user_id);

-- Create validation function for opening hours format
CREATE OR REPLACE FUNCTION public.validate_opening_hours(hours_text TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  IF hours_text IS NULL OR hours_text = '' OR hours_text = 'x' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if it matches the pattern: HH:MM-HH:MM format with optional multiple ranges
  RETURN hours_text ~ '^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$';
END;
$$ LANGUAGE plpgsql;

-- Add constraints for opening hours validation
ALTER TABLE public.businesses 
ADD CONSTRAINT businesses_monday_hours_valid CHECK (validate_opening_hours("mondayHours")),
ADD CONSTRAINT businesses_tuesday_hours_valid CHECK (validate_opening_hours("tuesdayHours")),
ADD CONSTRAINT businesses_wednesday_hours_valid CHECK (validate_opening_hours("wednesdayHours")),
ADD CONSTRAINT businesses_thursday_hours_valid CHECK (validate_opening_hours("thursdayHours")),
ADD CONSTRAINT businesses_friday_hours_valid CHECK (validate_opening_hours("fridayHours")),
ADD CONSTRAINT businesses_saturday_hours_valid CHECK (validate_opening_hours("saturdayHours")),
ADD CONSTRAINT businesses_sunday_hours_valid CHECK (validate_opening_hours("sundayHours"));

-- Create function to generate unique store codes
CREATE OR REPLACE FUNCTION public.generate_store_code()
RETURNS TEXT AS $$
DECLARE
  new_code TEXT;
  counter INTEGER := 1;
BEGIN
  LOOP
    new_code := 'STORE' || LPAD(counter::TEXT, 6, '0');
    
    -- Check if this code already exists
    IF NOT EXISTS (SELECT 1 FROM public.businesses WHERE "storeCode" = new_code) THEN
      RETURN new_code;
    END IF;
    
    counter := counter + 1;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
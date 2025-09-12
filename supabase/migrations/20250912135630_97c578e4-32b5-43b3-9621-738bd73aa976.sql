-- Add status column to businesses table for handling incomplete/pending locations
ALTER TABLE public.businesses 
ADD COLUMN status TEXT NOT NULL DEFAULT 'pending' 
CHECK (status IN ('pending', 'active'));

-- Create index for better performance when filtering by status
CREATE INDEX idx_businesses_status ON public.businesses(status);

-- Update existing businesses to have 'active' status
UPDATE public.businesses 
SET status = 'active' 
WHERE status = 'pending';

-- Create function to validate business completeness
CREATE OR REPLACE FUNCTION public.is_business_complete(business_row businesses)
RETURNS boolean AS $$
BEGIN
  -- Check if all required fields are filled
  RETURN (
    business_row."businessName" IS NOT NULL AND business_row."businessName" != '' AND
    business_row."addressLine1" IS NOT NULL AND business_row."addressLine1" != '' AND
    business_row."country" IS NOT NULL AND business_row."country" != '' AND
    business_row."primaryCategory" IS NOT NULL AND business_row."primaryCategory" != ''
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public';
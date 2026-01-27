-- Add is_async column to businesses table
-- This flag indicates locations that exist in Jasoner but are missing from the Eco-Movement API feed
ALTER TABLE public.businesses 
ADD COLUMN is_async BOOLEAN NOT NULL DEFAULT false;

-- Add comment for documentation
COMMENT ON COLUMN public.businesses.is_async IS 'True when location exists in Jasoner but is missing from Eco-Movement API feed. Only used for Energie 360°.';
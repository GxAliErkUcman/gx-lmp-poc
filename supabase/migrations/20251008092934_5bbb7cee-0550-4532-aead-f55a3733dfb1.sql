-- Add relevantLocation column to businesses table
-- This will store the Google Place ID and relationship type for parent locations
ALTER TABLE public.businesses 
ADD COLUMN "relevantLocation" JSONB NULL;

COMMENT ON COLUMN public.businesses."relevantLocation" IS 'Stores relationship to parent location (e.g., mall, airport). Contains placeId and relationType (DEPARTMENT_OF or INDEPENDENT_ESTABLISHMENT_IN)';
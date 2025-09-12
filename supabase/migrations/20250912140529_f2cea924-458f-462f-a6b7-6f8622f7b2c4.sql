-- Allow incomplete imports by relaxing NOT NULL constraints on essential fields
ALTER TABLE public.businesses ALTER COLUMN "businessName" DROP NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN "addressLine1" DROP NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN "country" DROP NOT NULL;
ALTER TABLE public.businesses ALTER COLUMN "primaryCategory" DROP NOT NULL;

-- Ensure storeCode is auto-generated when not provided
ALTER TABLE public.businesses ALTER COLUMN "storeCode" SET DEFAULT public.generate_store_code();
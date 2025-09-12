-- Fix function search path security issues
DROP FUNCTION IF EXISTS public.validate_opening_hours(TEXT);
DROP FUNCTION IF EXISTS public.generate_store_code();

-- Recreate validation function with proper search path
CREATE OR REPLACE FUNCTION public.validate_opening_hours(hours_text TEXT)
RETURNS BOOLEAN 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
BEGIN
  IF hours_text IS NULL OR hours_text = '' OR hours_text = 'x' THEN
    RETURN TRUE;
  END IF;
  
  -- Check if it matches the pattern: HH:MM-HH:MM format with optional multiple ranges
  RETURN hours_text ~ '^((([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2}), ?)*(([0-9]{1,2}):([0-9]{2}) ?- ?([0-9]{1,2}):([0-9]{2})))$';
END;
$$;

-- Recreate store code generation function with proper search path
CREATE OR REPLACE FUNCTION public.generate_store_code()
RETURNS TEXT 
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
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
$$;
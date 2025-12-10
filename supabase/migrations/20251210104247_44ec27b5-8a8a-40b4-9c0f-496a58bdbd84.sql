-- Create a trigger to automatically track business deletions BEFORE they happen
CREATE OR REPLACE FUNCTION public.track_business_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Insert deletion record with all relevant info stored in old_value
  INSERT INTO public.business_field_history (
    business_id,
    field_name,
    old_value,
    new_value,
    changed_by,
    changed_by_email,
    change_source
  )
  VALUES (
    OLD.id,
    'business_deleted',
    jsonb_build_object(
      'storeCode', OLD."storeCode",
      'businessName', OLD."businessName",
      'client_id', OLD.client_id
    )::text,
    NULL,
    auth.uid(),
    (SELECT email FROM auth.users WHERE id = auth.uid()),
    'crud'
  );
  
  RETURN OLD;
END;
$$;

-- Create the trigger on the businesses table
DROP TRIGGER IF EXISTS track_business_deletion_trigger ON public.businesses;
CREATE TRIGGER track_business_deletion_trigger
  BEFORE DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.track_business_deletion();
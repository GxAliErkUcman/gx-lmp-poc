-- Ensure the trigger exists on the businesses table
DROP TRIGGER IF EXISTS trigger_json_export_on_business_change ON public.businesses;

CREATE TRIGGER trigger_json_export_on_business_change
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_json_export();
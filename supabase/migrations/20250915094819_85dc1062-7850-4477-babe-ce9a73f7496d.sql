-- Create trigger for automatic JSON export on business changes
DROP TRIGGER IF EXISTS businesses_json_export_trigger ON public.businesses;

CREATE TRIGGER businesses_json_export_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW EXECUTE FUNCTION public.trigger_json_export();
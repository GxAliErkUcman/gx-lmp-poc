
-- Attach trigger_json_export to businesses table (INSERT, UPDATE, DELETE)
CREATE TRIGGER on_business_change_json_export
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_json_export();

-- Attach trigger_crud_backup to businesses table (INSERT, UPDATE, DELETE)
CREATE TRIGGER on_business_change_crud_backup
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_crud_backup();

-- Attach track_business_deletion to businesses table (DELETE)
CREATE TRIGGER on_business_delete_track
  BEFORE DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.track_business_deletion();

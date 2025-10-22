-- Create trigger function to call crud-backup edge function on business changes
CREATE OR REPLACE FUNCTION trigger_crud_backup()
RETURNS TRIGGER AS $$
DECLARE
  client_uuid TEXT;
BEGIN
  -- Get the client_id from the affected row
  IF TG_OP = 'DELETE' THEN
    client_uuid := OLD.client_id;
  ELSE
    client_uuid := NEW.client_id;
  END IF;

  -- Only trigger backup if client_id exists
  IF client_uuid IS NOT NULL THEN
    -- Call the edge function to generate CRUD backup (non-blocking)
    PERFORM net.http_post(
      url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/crud-backup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU'
      ),
      body := jsonb_build_object('client_id', client_uuid)
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger on businesses table for CRUD operations
DROP TRIGGER IF EXISTS business_crud_backup_trigger ON businesses;

CREATE TRIGGER business_crud_backup_trigger
  AFTER INSERT OR UPDATE OR DELETE ON businesses
  FOR EACH ROW
  EXECUTE FUNCTION trigger_crud_backup();
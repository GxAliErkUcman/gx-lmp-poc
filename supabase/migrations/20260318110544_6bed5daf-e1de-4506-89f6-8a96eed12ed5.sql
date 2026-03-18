-- Fix: increase pg_net timeout from default 5s to 30s for JSON export trigger
CREATE OR REPLACE FUNCTION public.trigger_json_export()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  client_uuid UUID;
BEGIN
  -- Get the client_id from the affected row
  IF TG_OP = 'DELETE' THEN
    client_uuid := OLD.client_id;
  ELSE
    client_uuid := NEW.client_id;
  END IF;

  -- Only trigger export if client_id exists
  IF client_uuid IS NOT NULL THEN
    -- Call the edge function to generate JSON export with extended timeout
    PERFORM net.http_post(
      url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/generate-json-export',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU'
      ),
      body := jsonb_build_object('client_id', client_uuid::text),
      timeout_milliseconds := 30000
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;

-- Also fix CRUD backup trigger with extended timeout
CREATE OR REPLACE FUNCTION public.trigger_crud_backup()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    PERFORM net.http_post(
      url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/crud-backup',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU'
      ),
      body := jsonb_build_object('client_id', client_uuid),
      timeout_milliseconds := 30000
    );
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$function$;
-- Create storage bucket for JSON exports (private, admin access only)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('json-exports', 'json-exports', false);

-- Create RLS policies for the json-exports bucket - admin access only
CREATE POLICY "Admin can view all JSON exports" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'json-exports' AND auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "System can upload JSON exports" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'json-exports');

CREATE POLICY "System can update JSON exports" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'json-exports');

CREATE POLICY "System can delete JSON exports" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'json-exports');

-- Create function to trigger JSON export generation
CREATE OR REPLACE FUNCTION public.trigger_json_export()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_uuid UUID;
BEGIN
  -- Get the user_id from the affected row
  IF TG_OP = 'DELETE' THEN
    user_uuid := OLD.user_id;
  ELSE
    user_uuid := NEW.user_id;
  END IF;

  -- Call the edge function to generate JSON export
  PERFORM net.http_post(
    url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/generate-json-export',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU'
    ),
    body := jsonb_build_object('user_id', user_uuid::text)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$;

-- Create triggers on businesses table for automatic JSON export generation
CREATE TRIGGER businesses_json_export_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.businesses
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_json_export();

-- Enable pg_net extension for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;
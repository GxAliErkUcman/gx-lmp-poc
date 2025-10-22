-- Create json-backups storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('json-backups', 'json-backups', false, 52428800, ARRAY['application/json']);

-- RLS Policies for json-backups bucket
CREATE POLICY "Admins can view all backup files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'json-backups' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

CREATE POLICY "Service users can view assigned client backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'json-backups'
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'service_user'
  )
  AND (storage.foldername(name))[1] IN (
    SELECT client_id FROM public.get_user_accessible_clients(auth.uid())
  )
);

CREATE POLICY "Client admins can view their client backups"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'json-backups'
  AND (
    EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = auth.uid() AND role = 'client_admin'
    )
  )
  AND (storage.foldername(name))[1] = (
    SELECT client_id FROM public.profiles WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Service role can manage backup files"
ON storage.objects FOR ALL
TO service_role
USING (bucket_id = 'json-backups');

-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule backup job every Monday at 10AM
SELECT cron.schedule(
  'weekly-client-backups',
  '0 10 * * 1', -- Every Monday at 10AM
  $$
  SELECT net.http_post(
    url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/scheduled-backup',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU'
    ),
    body := jsonb_build_object('scheduled', true)
  ) as request_id;
  $$
);
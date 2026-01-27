-- Schedule daily Eco-Movement sync for Energie 360° at 05:00 Vienna time (04:00 UTC)
SELECT cron.schedule(
  'eco-movement-daily-sync',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://zygzuoodjenpbvfgfika.supabase.co/functions/v1/import-eco-movement',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp5Z3p1b29kamVucGJ2ZmdmaWthIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzUwMDM3OCwiZXhwIjoyMDczMDc2Mzc4fQ.WRHSCPqKHI-FYNrLrhvDfZYs-uYqA97vEgf8lG8gSZU"}'::jsonb,
    body := '{"client_id": "e77c44c5-0585-4225-a5ea-59a38edb85fb"}'::jsonb
  ) AS request_id;
  $$
);
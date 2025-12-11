-- Create table to track which store codes exist in the API feed
CREATE TABLE public.api_feed_locations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id text NOT NULL,
  store_code text NOT NULL,
  last_seen_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(client_id, store_code)
);

-- Enable RLS
ALTER TABLE public.api_feed_locations ENABLE ROW LEVEL SECURITY;

-- Admins and service users can view
CREATE POLICY "Admins can view api feed locations"
ON public.api_feed_locations
FOR SELECT
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Service users can view assigned client api feed locations"
ON public.api_feed_locations
FOR SELECT
USING (has_role(auth.uid(), 'service_user'::app_role) AND client_id IN (
  SELECT client_id FROM get_user_accessible_clients(auth.uid())
));

-- Service role can manage (for edge function)
CREATE POLICY "Service role can manage api feed locations"
ON public.api_feed_locations
FOR ALL
USING ((auth.jwt() ->> 'role'::text) = 'service_role'::text);

-- Create index for fast lookups
CREATE INDEX idx_api_feed_locations_client_store ON public.api_feed_locations(client_id, store_code);
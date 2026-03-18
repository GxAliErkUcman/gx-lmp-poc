
-- Table to track edge function executions for monitoring and retry
CREATE TABLE public.edge_function_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  status text NOT NULL DEFAULT 'running',
  request_body jsonb,
  response_body jsonb,
  error_message text,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  retried_at timestamptz,
  retry_of uuid REFERENCES public.edge_function_logs(id)
);

-- Index for querying by status and recency
CREATE INDEX idx_edge_function_logs_status ON public.edge_function_logs(status, created_at DESC);
CREATE INDEX idx_edge_function_logs_function ON public.edge_function_logs(function_name, created_at DESC);

-- RLS: only admins and service role can access
ALTER TABLE public.edge_function_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all logs"
  ON public.edge_function_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Service role can manage all logs"
  ON public.edge_function_logs FOR ALL
  TO public
  USING ((auth.jwt() ->> 'role') = 'service_role');

-- Auto-cleanup: keep only last 500 logs
CREATE OR REPLACE FUNCTION public.cleanup_edge_function_logs()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
BEGIN
  DELETE FROM public.edge_function_logs
  WHERE id IN (
    SELECT id FROM public.edge_function_logs
    ORDER BY created_at DESC
    OFFSET 500
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_cleanup_edge_function_logs
  AFTER INSERT ON public.edge_function_logs
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.cleanup_edge_function_logs();

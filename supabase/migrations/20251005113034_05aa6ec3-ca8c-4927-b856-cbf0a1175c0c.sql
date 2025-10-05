-- Add lsc_id column to clients table
ALTER TABLE public.clients 
ADD COLUMN lsc_id BIGINT UNIQUE;

-- Add comment to explain the column
COMMENT ON COLUMN public.clients.lsc_id IS 'LSC ID used for JSON export filename formatting (LSCID.json)';

-- Create index for faster lookups
CREATE INDEX idx_clients_lsc_id ON public.clients(lsc_id);
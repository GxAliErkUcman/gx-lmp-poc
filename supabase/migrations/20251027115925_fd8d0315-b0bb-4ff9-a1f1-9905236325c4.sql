-- Create client_custom_services table
CREATE TABLE IF NOT EXISTS public.client_custom_services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  service_name TEXT NOT NULL CHECK (char_length(service_name) BETWEEN 1 AND 140),
  service_description TEXT CHECK (service_description IS NULL OR char_length(service_description) BETWEEN 1 AND 250),
  service_category_id TEXT CHECK (service_category_id IS NULL OR char_length(service_category_id) BETWEEN 7 AND 42),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(client_id, service_name)
);

-- Enable RLS
ALTER TABLE public.client_custom_services ENABLE ROW LEVEL SECURITY;

-- Admins can manage all custom services
CREATE POLICY "Admins can manage all custom services"
ON public.client_custom_services FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Service users can manage for assigned clients
CREATE POLICY "Service users can manage assigned client services"
ON public.client_custom_services FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'service_user') 
  AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))
)
WITH CHECK (
  public.has_role(auth.uid(), 'service_user') 
  AND client_id IN (SELECT client_id FROM public.get_user_accessible_clients(auth.uid()))
);

-- Client admins can manage their client's services
CREATE POLICY "Client admins can manage their client services"
ON public.client_custom_services FOR ALL
TO authenticated
USING (
  public.has_role(auth.uid(), 'client_admin')
  AND client_id = public.get_user_client_id()
)
WITH CHECK (
  public.has_role(auth.uid(), 'client_admin')
  AND client_id = public.get_user_client_id()
);

-- Users can view their client's services
CREATE POLICY "Users can view their client services"
ON public.client_custom_services FOR SELECT
TO authenticated
USING (client_id = public.get_user_client_id());

-- Store owners can view their client's services
CREATE POLICY "Store owners can view their client services"
ON public.client_custom_services FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'store_owner')
  AND client_id IN (
    SELECT b.client_id 
    FROM public.businesses b
    INNER JOIN public.store_owner_access soa ON b.id = soa.business_id
    WHERE soa.user_id = auth.uid()
  )
);

-- Add update trigger
CREATE TRIGGER update_client_custom_services_updated_at
  BEFORE UPDATE ON public.client_custom_services
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
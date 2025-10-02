-- Create client_categories table
CREATE TABLE public.client_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id text NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  category_name text NOT NULL,
  source_category_id bigint REFERENCES public.categories(id) ON DELETE SET NULL,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(client_id, category_name)
);

-- Enable RLS
ALTER TABLE public.client_categories ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Admin users can manage client categories"
  ON public.client_categories FOR ALL
  USING (is_admin_user());

CREATE POLICY "Users can view their client's categories"
  ON public.client_categories FOR SELECT
  USING (client_id = get_user_client_id());
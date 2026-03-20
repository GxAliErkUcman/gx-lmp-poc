
-- SEO weight profiles: named sets of weights that can be assigned to clients
CREATE TABLE public.seo_weight_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  base_score integer NOT NULL DEFAULT 45,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Items within a profile
CREATE TABLE public.seo_weight_profile_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid NOT NULL REFERENCES public.seo_weight_profiles(id) ON DELETE CASCADE,
  factor_key text NOT NULL,
  weight integer NOT NULL DEFAULT 5,
  UNIQUE(profile_id, factor_key)
);

-- Add profile reference to clients
ALTER TABLE public.clients ADD COLUMN seo_weight_profile_id uuid REFERENCES public.seo_weight_profiles(id) ON DELETE SET NULL;

-- RLS for profiles
ALTER TABLE public.seo_weight_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_weight_profile_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage profiles
CREATE POLICY "Admins can manage seo weight profiles" ON public.seo_weight_profiles
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Authenticated users can read profiles
CREATE POLICY "Authenticated users can read seo weight profiles" ON public.seo_weight_profiles
  FOR SELECT TO authenticated
  USING (true);

-- Admins can manage profile items
CREATE POLICY "Admins can manage seo weight profile items" ON public.seo_weight_profile_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Authenticated users can read profile items
CREATE POLICY "Authenticated users can read seo weight profile items" ON public.seo_weight_profile_items
  FOR SELECT TO authenticated
  USING (true);

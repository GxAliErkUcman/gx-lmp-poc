
CREATE TABLE public.seo_weights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  factor_key text NOT NULL UNIQUE,
  factor_label text NOT NULL,
  category text NOT NULL,
  weight integer NOT NULL DEFAULT 5,
  base_score integer NOT NULL DEFAULT 45,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

ALTER TABLE public.seo_weights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage seo weights"
ON public.seo_weights FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Authenticated users can read seo weights"
ON public.seo_weights FOR SELECT
TO authenticated
USING (true);

-- Insert default weights matching current algorithm
INSERT INTO public.seo_weights (factor_key, factor_label, category, weight) VALUES
  ('additionalCategories', 'Additional Categories', 'Core Identity', 8),
  ('fromTheBusiness', 'Business Description', 'Core Identity', 7),
  ('postalCode', 'Postal Code', 'Address & Geo', 7),
  ('latLong', 'Latitude & Longitude', 'Address & Geo', 8),
  ('primaryPhone', 'Primary Phone', 'Contact & Web', 8),
  ('website', 'Website', 'Contact & Web', 9),
  ('socialMediaUrls', 'Social Media Profiles', 'Contact & Web', 3),
  ('openingHours', 'Weekly Opening Hours', 'Opening Hours', 10),
  ('specialHours', 'Special/Holiday Hours', 'Opening Hours', 8),
  ('coverPhoto', 'Cover Photo', 'Photos & Media', 8),
  ('otherPhotos', 'Other Photos', 'Photos & Media', 7),
  ('customServices', 'Custom Services', 'Services & Extras', 8),
  ('labels', 'Labels', 'Services & Extras', 2),
  ('serviceUrls', 'Service URLs', 'Services & Extras', 3);

-- Also store base_score as a single config row
UPDATE public.seo_weights SET base_score = 45;

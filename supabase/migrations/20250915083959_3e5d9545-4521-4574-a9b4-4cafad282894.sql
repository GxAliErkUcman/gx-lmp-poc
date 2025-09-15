-- Backfill businesses.client_id from profiles for legacy rows
UPDATE public.businesses b
SET client_id = p.client_id
FROM public.profiles p
WHERE b.client_id IS NULL
  AND b.user_id = p.user_id
  AND p.client_id IS NOT NULL;
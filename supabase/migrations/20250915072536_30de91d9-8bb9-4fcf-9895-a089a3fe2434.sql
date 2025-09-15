-- Fix the get_client_statistics function with ambiguous column references
CREATE OR REPLACE FUNCTION public.get_client_statistics()
 RETURNS TABLE(client_id uuid, client_name text, user_count bigint, active_locations bigint, pending_locations bigint, last_updated timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id as client_id,
    c.name as client_name,
    COALESCE(user_stats.user_count, 0) as user_count,
    COALESCE(business_stats.active_locations, 0) as active_locations,
    COALESCE(business_stats.pending_locations, 0) as pending_locations,
    GREATEST(c.updated_at, business_stats.last_business_update) as last_updated
  FROM public.clients c
  LEFT JOIN (
    SELECT 
      p.client_id,
      COUNT(*) as user_count
    FROM public.profiles p
    WHERE p.client_id IS NOT NULL
    GROUP BY p.client_id
  ) user_stats ON c.id = user_stats.client_id
  LEFT JOIN (
    SELECT 
      b.client_id,
      COUNT(CASE WHEN b.status = 'active' THEN 1 END) as active_locations,
      COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_locations,
      MAX(b.updated_at) as last_business_update
    FROM public.businesses b
    WHERE b.client_id IS NOT NULL
    GROUP BY b.client_id
  ) business_stats ON c.id = business_stats.client_id
  ORDER BY c.name;
END;
$$;

-- Update the business RLS policies to properly handle client_id
DROP POLICY IF EXISTS "Users can create their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can update their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can delete their own businesses" ON public.businesses;
DROP POLICY IF EXISTS "Users can view their own businesses" ON public.businesses;

-- Create updated RLS policies for businesses
CREATE POLICY "Users can view their own businesses" 
ON public.businesses 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own businesses" 
ON public.businesses 
FOR INSERT 
WITH CHECK (
  auth.uid() = user_id AND 
  (client_id IS NULL OR client_id = (SELECT client_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can update their own businesses" 
ON public.businesses 
FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id AND 
  (client_id IS NULL OR client_id = (SELECT client_id FROM public.profiles WHERE user_id = auth.uid()))
);

CREATE POLICY "Users can delete their own businesses" 
ON public.businesses 
FOR DELETE 
USING (auth.uid() = user_id);
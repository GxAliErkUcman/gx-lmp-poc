-- Fix the ambiguous column reference in get_client_statistics
DROP FUNCTION IF EXISTS public.get_client_statistics();

CREATE OR REPLACE FUNCTION public.get_client_statistics()
RETURNS TABLE(
  client_id text, 
  client_name text, 
  user_count bigint, 
  active_locations bigint, 
  pending_locations bigint, 
  last_updated timestamp with time zone
)
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
    -- Count unique users per client from both profiles and user_client_access
    SELECT 
      combined_users.client_id,
      COUNT(DISTINCT combined_users.user_id) as user_count
    FROM (
      -- Users assigned via profiles.client_id
      SELECT 
        p.client_id,
        p.user_id
      FROM public.profiles p
      WHERE p.client_id IS NOT NULL
      
      UNION
      
      -- Service users assigned via user_client_access
      SELECT 
        uca.client_id,
        uca.user_id
      FROM public.user_client_access uca
    ) combined_users
    GROUP BY combined_users.client_id
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
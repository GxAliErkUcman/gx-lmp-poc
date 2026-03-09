import { supabase } from '@/integrations/supabase/client';
import type { Business } from '@/types/business';

/**
 * Fetches all rows from the businesses table, paginating in batches of 1000
 * to bypass Supabase's default row limit.
 * Optionally filters by client_id.
 */
export async function fetchAllBusinesses(clientId?: string): Promise<Business[]> {
  const PAGE_SIZE = 1000;
  let allData: Business[] = [];
  let from = 0;
  let hasMore = true;

  while (hasMore) {
    let query = supabase
      .from('businesses')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const rows = (data || []) as Business[];
    allData = allData.concat(rows);

    if (rows.length < PAGE_SIZE) {
      hasMore = false;
    } else {
      from += PAGE_SIZE;
    }
  }

  return allData;
}

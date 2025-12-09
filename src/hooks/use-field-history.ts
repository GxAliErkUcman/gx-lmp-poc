import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface FieldHistoryRecord {
  id: string;
  business_id: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  changed_at: string;
  change_source: string;
  changed_by_email?: string;
}

interface UseFieldHistoryResult {
  history: FieldHistoryRecord[];
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch all field history for a business
 */
export function useFieldHistory(businessId: string | null): UseFieldHistoryResult {
  const [history, setHistory] = useState<FieldHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!businessId) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('business_field_history')
        .select('*')
        .eq('business_id', businessId)
        .order('changed_at', { ascending: false });

      if (fetchError) throw fetchError;

      const records = (data || []) as FieldHistoryRecord[];
      setHistory(records);
    } catch (err) {
      console.error('Error fetching field history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [businessId]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

/**
 * Hook to fetch history for a specific field
 */
export function useFieldHistoryForField(
  businessId: string | null,
  fieldName: string | null
): UseFieldHistoryResult {
  const [history, setHistory] = useState<FieldHistoryRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    if (!businessId || !fieldName) {
      setHistory([]);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('business_field_history')
        .select('*')
        .eq('business_id', businessId)
        .eq('field_name', fieldName)
        .order('changed_at', { ascending: false })
        .limit(6);

      if (fetchError) throw fetchError;

      const records = (data || []) as FieldHistoryRecord[];
      setHistory(records);
    } catch (err) {
      console.error('Error fetching field history:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch history');
    } finally {
      setLoading(false);
    }
  }, [businessId, fieldName]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  return { history, loading, error, refetch: fetchHistory };
}

/**
 * Hook to get a summary of field changes for a business
 */
export function useFieldChangeSummary(businessId: string | null): {
  summary: Map<string, number>;
  loading: boolean;
  error: string | null;
} {
  const [summary, setSummary] = useState<Map<string, number>>(new Map());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSummary = async () => {
      if (!businessId) {
        setSummary(new Map());
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const { data, error: fetchError } = await supabase
          .from('business_field_history')
          .select('field_name')
          .eq('business_id', businessId);

        if (fetchError) throw fetchError;

        const counts = new Map<string, number>();
        (data || []).forEach((record: { field_name: string }) => {
          const current = counts.get(record.field_name) || 0;
          counts.set(record.field_name, current + 1);
        });

        setSummary(counts);
      } catch (err) {
        console.error('Error fetching field change summary:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch summary');
      } finally {
        setLoading(false);
      }
    };

    fetchSummary();
  }, [businessId]);

  return { summary, loading, error };
}

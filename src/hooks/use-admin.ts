import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useAdmin = () => {
  const { user } = useAuth();

  const checkAdminAccess = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      return !error && profile && profile.role === 'admin';
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }, [user]);

  return { checkAdminAccess };
};
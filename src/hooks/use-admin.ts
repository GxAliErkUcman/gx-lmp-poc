import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type AppRole = 'admin' | 'service_user' | 'client_admin' | 'user' | 'store_owner';

export const useAdmin = () => {
  const { user } = useAuth();

  const checkAdminAccess = useCallback(async (): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      return !error && roles && roles.some((r: { role: AppRole }) => r.role === 'admin');
    } catch (error) {
      console.error('Error checking admin access:', error);
      return false;
    }
  }, [user]);

  const getUserRoles = useCallback(async (): Promise<AppRole[]> => {
    if (!user) return [];
    
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error || !roles) return [];
      return roles.map((r: { role: AppRole }) => r.role);
    } catch (error) {
      console.error('Error fetching user roles:', error);
      return [];
    }
  }, [user]);

  const hasRole = useCallback(async (role: AppRole): Promise<boolean> => {
    if (!user) return false;
    
    try {
      const { data: roles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('role', role);

      return !error && roles && roles.length > 0;
    } catch (error) {
      console.error('Error checking role:', error);
      return false;
    }
  }, [user]);

  return { checkAdminAccess, getUserRoles, hasRole };
};
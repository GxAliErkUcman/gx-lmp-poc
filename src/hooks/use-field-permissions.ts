import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useAdmin, AppRole } from './use-admin';

interface FieldPermission {
  field_name: string;
  field_group: string;
  locked_for_user: boolean;
  locked_for_store_owner: boolean;
  locked_for_client_admin: boolean;
}

export const useFieldPermissions = (clientId?: string) => {
  const { user } = useAuth();
  const { getUserRoles } = useAdmin();
  const [permissions, setPermissions] = useState<FieldPermission[]>([]);
  const [userRole, setUserRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPermissions = useCallback(async () => {
    if (!clientId || !user) {
      setLoading(false);
      return;
    }

    try {
      // Get user's role
      const roles = await getUserRoles();
      const primaryRole = roles.includes('admin' as AppRole) 
        ? 'admin' 
        : roles.includes('service_user' as AppRole)
        ? 'service_user'
        : roles.includes('client_admin' as AppRole)
        ? 'client_admin'
        : roles.includes('store_owner' as AppRole)
        ? 'store_owner'
        : 'user';
      
      setUserRole(primaryRole as AppRole);

      // Fetch permissions for this client
      const { data, error } = await supabase
        .from('client_permissions')
        .select(`
          locked_for_user,
          locked_for_store_owner,
          locked_for_client_admin,
          lockable_fields!inner(
            field_name,
            field_group
          )
        `)
        .eq('client_id', clientId);

      if (error) throw error;

      const formattedPermissions = data?.map((p: any) => ({
        field_name: p.lockable_fields.field_name,
        field_group: p.lockable_fields.field_group,
        locked_for_user: p.locked_for_user,
        locked_for_store_owner: p.locked_for_store_owner,
        locked_for_client_admin: p.locked_for_client_admin,
      })) || [];

      setPermissions(formattedPermissions);
    } catch (error) {
      console.error('Error fetching field permissions:', error);
    } finally {
      setLoading(false);
    }
  }, [clientId, user, getUserRoles]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const isFieldLocked = useCallback((fieldName: string): boolean => {
    // Admin and service users always have full access
    if (userRole === 'admin' || userRole === 'service_user') {
      return false;
    }

    const permission = permissions.find(p => p.field_name === fieldName);
    if (!permission) return false;

    // Check lock based on user's role
    if (userRole === 'user') {
      return permission.locked_for_user;
    } else if (userRole === 'store_owner') {
      return permission.locked_for_store_owner;
    } else if (userRole === 'client_admin') {
      return permission.locked_for_client_admin;
    }

    return false;
  }, [permissions, userRole]);

  const isImportDisabled = useCallback((): boolean => {
    return isFieldLocked('import_function');
  }, [isFieldLocked]);

  const isGroupLocked = useCallback((groupName: string): boolean => {
    const groupFields = permissions.filter(p => p.field_group === groupName);
    if (groupFields.length === 0) return false;

    // Admin and service users always have full access
    if (userRole === 'admin' || userRole === 'service_user') {
      return false;
    }

    // Check if all fields in the group are locked for this role
    return groupFields.every(field => {
      if (userRole === 'user') return field.locked_for_user;
      if (userRole === 'store_owner') return field.locked_for_store_owner;
      if (userRole === 'client_admin') return field.locked_for_client_admin;
      return false;
    });
  }, [permissions, userRole]);

  return {
    isFieldLocked,
    isImportDisabled,
    isGroupLocked,
    loading,
    userRole,
    refetch: fetchPermissions,
  };
};

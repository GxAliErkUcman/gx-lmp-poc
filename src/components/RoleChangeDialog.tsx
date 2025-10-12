import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Shield } from 'lucide-react';
import type { AppRole } from '@/hooks/use-admin';

interface RoleChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  onRolesUpdated: () => void;
}

const AVAILABLE_ROLES: { value: AppRole; label: string; description: string }[] = [
  { 
    value: 'admin', 
    label: 'Admin', 
    description: 'Full system access - can manage all clients, users, and settings' 
  },
  { 
    value: 'service_user', 
    label: 'Service User', 
    description: 'Can access multiple assigned clients - manage locations and invite users' 
  },
  { 
    value: 'client_admin', 
    label: 'Client Admin', 
    description: 'User + can invite other users to their client' 
  },
  { 
    value: 'user', 
    label: 'User', 
    description: 'Standard access - manage locations within their assigned client' 
  },
  { 
    value: 'store_owner', 
    label: 'Store Owner', 
    description: 'Can only manage their assigned business location(s)' 
  },
];

export const RoleChangeDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  onRolesUpdated 
}: RoleChangeDialogProps) => {
  const { toast } = useToast();
  const [currentRoles, setCurrentRoles] = useState<AppRole[]>([]);
  const [selectedRoles, setSelectedRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && userId) {
      fetchUserRoles();
    }
  }, [open, userId]);

  const fetchUserRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) throw error;

      const roles = (data || []).map(r => r.role as AppRole);
      setCurrentRoles(roles);
      setSelectedRoles(roles);
    } catch (error: any) {
      console.error('Error fetching user roles:', error);
      toast({
        title: "Error",
        description: "Failed to load user roles.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = (role: AppRole) => {
    setSelectedRoles(prev => {
      if (prev.includes(role)) {
        return prev.filter(r => r !== role);
      } else {
        return [...prev, role];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Determine roles to add and remove
      const rolesToAdd = selectedRoles.filter(r => !currentRoles.includes(r));
      const rolesToRemove = currentRoles.filter(r => !selectedRoles.includes(r));

      // Remove roles
      if (rolesToRemove.length > 0) {
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .in('role', rolesToRemove);

        if (deleteError) throw deleteError;
      }

      // Add new roles
      if (rolesToAdd.length > 0) {
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert(rolesToAdd.map(role => ({ user_id: userId, role })));

        if (insertError) throw insertError;
      }

      toast({
        title: "Roles Updated",
        description: `Successfully updated roles for ${userName}.`,
      });

      onRolesUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating roles:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to update roles.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify([...selectedRoles].sort()) !== JSON.stringify([...currentRoles].sort());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Manage Roles - {userName}
          </DialogTitle>
          <DialogDescription>
            Assign roles to control user access and permissions across the system.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Current Roles:</span>
              {currentRoles.length > 0 ? (
                currentRoles.map(role => (
                  <Badge key={role} variant="secondary">
                    {AVAILABLE_ROLES.find(r => r.value === role)?.label || role}
                  </Badge>
                ))
              ) : (
                <span className="text-sm text-muted-foreground italic">No roles assigned</span>
              )}
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h4 className="font-semibold text-sm">Select Roles:</h4>
              {AVAILABLE_ROLES.map((role) => (
                <div key={role.value} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                  <Checkbox
                    id={`role-${role.value}`}
                    checked={selectedRoles.includes(role.value)}
                    onCheckedChange={() => handleRoleToggle(role.value)}
                  />
                  <div className="flex-1 space-y-1">
                    <Label
                      htmlFor={`role-${role.value}`}
                      className="font-medium cursor-pointer"
                    >
                      {role.label}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {role.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Changes'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

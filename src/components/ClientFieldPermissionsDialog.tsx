import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useAdmin } from '@/hooks/use-admin';

interface LockableField {
  id: string;
  field_name: string;
  display_name: string;
  field_group: string;
  sort_order: number;
}

interface Permission {
  id?: string;
  field_id: string;
  locked_for_user: boolean;
  locked_for_store_owner: boolean;
  locked_for_client_admin: boolean;
}

interface GroupedFields {
  [key: string]: LockableField[];
}

interface ClientFieldPermissionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onSuccess?: () => void;
}

const FIELD_GROUP_LABELS: { [key: string]: string } = {
  basic_info: 'Basic Information',
  address_details: 'Address Details',
  location: 'Location Coordinates',
  categories: 'Categories',
  contact: 'Contact Information',
  marketing: 'Marketing Information',
  opening_hours: 'Opening Hours',
  dates: 'Dates',
  status: 'Business Status',
  photos: 'Photos',
  service_urls: 'Service URLs',
  additional_features: 'Additional Features',
  import_function: 'Import Function',
};

export default function ClientFieldPermissionsDialog({
  open,
  onOpenChange,
  clientId,
  onSuccess,
}: ClientFieldPermissionsDialogProps) {
  const [fields, setFields] = useState<LockableField[]>([]);
  const [permissions, setPermissions] = useState<{ [fieldId: string]: Permission }>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openGroups, setOpenGroups] = useState<{ [key: string]: boolean }>({});
  const { checkAdminAccess } = useAdmin();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess().then(setIsAdmin);
  }, [checkAdminAccess]);

  useEffect(() => {
    if (open && clientId) {
      fetchData();
    }
  }, [open, clientId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all lockable fields
      const { data: fieldsData, error: fieldsError } = await supabase
        .from('lockable_fields')
        .select('*')
        .order('sort_order');

      if (fieldsError) throw fieldsError;

      setFields(fieldsData || []);

      // Fetch existing permissions for this client
      const { data: permissionsData, error: permissionsError } = await supabase
        .from('client_permissions')
        .select('*')
        .eq('client_id', clientId);

      if (permissionsError) throw permissionsError;

      // Create a map of field_id to permission
      const permissionsMap: { [fieldId: string]: Permission } = {};
      
      fieldsData?.forEach(field => {
        const existingPerm = permissionsData?.find(p => p.field_id === field.id);
        permissionsMap[field.id] = existingPerm || {
          field_id: field.id,
          locked_for_user: false,
          locked_for_store_owner: false,
          locked_for_client_admin: false,
        };
      });

      setPermissions(permissionsMap);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: 'Error',
        description: 'Failed to load field permissions',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const groupFields = (): GroupedFields => {
    return fields.reduce((acc, field) => {
      if (!acc[field.field_group]) {
        acc[field.field_group] = [];
      }
      acc[field.field_group].push(field);
      return acc;
    }, {} as GroupedFields);
  };

  const toggleGroupOpen = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const toggleGroupLock = (group: string, role: 'user' | 'store_owner' | 'client_admin', locked: boolean) => {
    const groupFields = fields.filter(f => f.field_group === group);
    const newPermissions = { ...permissions };

    groupFields.forEach(field => {
      if (!newPermissions[field.id]) {
        newPermissions[field.id] = {
          field_id: field.id,
          locked_for_user: false,
          locked_for_store_owner: false,
          locked_for_client_admin: false,
        };
      }
      if (role === 'user') {
        newPermissions[field.id].locked_for_user = locked;
      } else if (role === 'store_owner') {
        newPermissions[field.id].locked_for_store_owner = locked;
      } else if (role === 'client_admin') {
        newPermissions[field.id].locked_for_client_admin = locked;
      }
    });

    setPermissions(newPermissions);
  };

  const toggleFieldLock = (fieldId: string, role: 'user' | 'store_owner' | 'client_admin', locked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [fieldId]: {
        ...prev[fieldId],
        [`locked_for_${role}`]: locked,
      },
    }));
  };

  const isGroupAllLocked = (group: string, role: 'user' | 'store_owner' | 'client_admin'): boolean => {
    const groupFields = fields.filter(f => f.field_group === group);
    return groupFields.every(field => permissions[field.id]?.[`locked_for_${role}`]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Prepare upsert data
      const upsertData = Object.values(permissions).map(perm => ({
        client_id: clientId,
        field_id: perm.field_id,
        locked_for_user: perm.locked_for_user,
        locked_for_store_owner: perm.locked_for_store_owner,
        locked_for_client_admin: isAdmin ? perm.locked_for_client_admin : false, // Client admins can't lock for themselves
      }));

      const { error } = await supabase
        .from('client_permissions')
        .upsert(upsertData, {
          onConflict: 'client_id,field_id',
        });

      if (error) throw error;

      toast({
        title: 'Success',
        description: 'Field permissions updated successfully',
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving permissions:', error);
      toast({
        title: 'Error',
        description: 'Failed to save field permissions',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const groupedFields = groupFields();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manage Field Permissions</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-4">
              <div className="grid grid-cols-4 gap-4 pb-2 border-b font-semibold text-sm">
                <div>Field / Section</div>
                <div className="text-center">Lock for Users</div>
                <div className="text-center">Lock for Store Owners</div>
                {isAdmin && <div className="text-center">Lock for Client Admins</div>}
              </div>

              {Object.entries(groupedFields).map(([group, groupFields]) => (
                <Collapsible
                  key={group}
                  open={openGroups[group]}
                  onOpenChange={() => toggleGroupOpen(group)}
                >
                  <div className="space-y-2">
                    {/* Group Header */}
                    <div className="grid grid-cols-4 gap-4 items-center bg-muted/50 p-3 rounded-lg">
                      <CollapsibleTrigger className="flex items-center gap-2 font-medium">
                        {openGroups[group] ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                        {FIELD_GROUP_LABELS[group] || group}
                      </CollapsibleTrigger>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isGroupAllLocked(group, 'user')}
                          onCheckedChange={(checked) => 
                            toggleGroupLock(group, 'user', checked as boolean)
                          }
                        />
                      </div>
                      <div className="flex justify-center">
                        <Checkbox
                          checked={isGroupAllLocked(group, 'store_owner')}
                          onCheckedChange={(checked) => 
                            toggleGroupLock(group, 'store_owner', checked as boolean)
                          }
                        />
                      </div>
                      {isAdmin && (
                        <div className="flex justify-center">
                          <Checkbox
                            checked={isGroupAllLocked(group, 'client_admin')}
                            onCheckedChange={(checked) => 
                              toggleGroupLock(group, 'client_admin', checked as boolean)
                            }
                          />
                        </div>
                      )}
                    </div>

                    {/* Individual Fields */}
                    <CollapsibleContent className="space-y-2 ml-6">
                      {groupFields.map((field) => (
                        <div key={field.id} className="grid grid-cols-4 gap-4 items-center py-2 border-b">
                          <Label className="text-sm">{field.display_name}</Label>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permissions[field.id]?.locked_for_user || false}
                              onCheckedChange={(checked) => 
                                toggleFieldLock(field.id, 'user', checked as boolean)
                              }
                            />
                          </div>
                          <div className="flex justify-center">
                            <Checkbox
                              checked={permissions[field.id]?.locked_for_store_owner || false}
                              onCheckedChange={(checked) => 
                                toggleFieldLock(field.id, 'store_owner', checked as boolean)
                              }
                            />
                          </div>
                          {isAdmin && (
                            <div className="flex justify-center">
                              <Checkbox
                                checked={permissions[field.id]?.locked_for_client_admin || false}
                                onCheckedChange={(checked) => 
                                  toggleFieldLock(field.id, 'client_admin', checked as boolean)
                                }
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          </ScrollArea>
        )}

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Save Permissions
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

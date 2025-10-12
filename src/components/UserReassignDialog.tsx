import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, RefreshCw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface UserReassignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  userRoles: string[];
  onReassigned: () => void;
}

interface Client {
  id: string;
  name: string;
}

export const UserReassignDialog = ({ 
  open, 
  onOpenChange, 
  userId, 
  userName,
  userRoles,
  onReassigned 
}: UserReassignDialogProps) => {
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [selectedClient, setSelectedClient] = useState<string>('');
  const [selectedClients, setSelectedClients] = useState<string[]>([]);
  const [currentClientId, setCurrentClientId] = useState<string | null>(null);
  const [currentClientAccess, setCurrentClientAccess] = useState<string[]>([]);

  const isServiceUser = userRoles.includes('service_user');

  useEffect(() => {
    if (open && userId) {
      fetchData();
    }
  }, [open, userId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch all clients
      const { data: clientsData, error: clientsError } = await supabase
        .from('clients')
        .select('id, name')
        .order('name');

      if (clientsError) throw clientsError;
      setClients(clientsData || []);

      // Fetch current user profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('user_id', userId)
        .single();

      if (profileError) throw profileError;
      setCurrentClientId(profileData?.client_id || null);
      setSelectedClient(profileData?.client_id || '');

      // If service user, fetch their client access
      if (isServiceUser) {
        const { data: accessData, error: accessError } = await supabase
          .from('user_client_access')
          .select('client_id')
          .eq('user_id', userId);

        if (accessError) throw accessError;
        const clientIds = (accessData || []).map(a => a.client_id);
        setCurrentClientAccess(clientIds);
        setSelectedClients(clientIds);
      }
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load client data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClientToggle = (clientId: string) => {
    setSelectedClients(prev => {
      if (prev.includes(clientId)) {
        return prev.filter(id => id !== clientId);
      } else {
        return [...prev, clientId];
      }
    });
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      if (isServiceUser) {
        // For service users, manage user_client_access table
        const clientsToAdd = selectedClients.filter(id => !currentClientAccess.includes(id));
        const clientsToRemove = currentClientAccess.filter(id => !selectedClients.includes(id));

        // Remove clients
        if (clientsToRemove.length > 0) {
          const { error: deleteError } = await supabase
            .from('user_client_access')
            .delete()
            .eq('user_id', userId)
            .in('client_id', clientsToRemove);

          if (deleteError) throw deleteError;
        }

        // Add new clients
        if (clientsToAdd.length > 0) {
          const { error: insertError } = await supabase
            .from('user_client_access')
            .insert(clientsToAdd.map(client_id => ({ user_id: userId, client_id })));

          if (insertError) throw insertError;
        }

        toast({
          title: "Client Access Updated",
          description: `Successfully updated client access for ${userName}.`,
        });
      } else {
        // For regular users, update the client_id in profiles
        if (!selectedClient) {
          toast({
            title: "Error",
            description: "Please select a client.",
            variant: "destructive"
          });
          return;
        }

        const { error } = await supabase
          .from('profiles')
          .update({ client_id: selectedClient })
          .eq('user_id', userId);

        if (error) throw error;

        toast({
          title: "User Reassigned",
          description: `Successfully reassigned ${userName} to the selected client.`,
        });
      }

      onReassigned();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error reassigning user:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to reassign user.",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = isServiceUser 
    ? JSON.stringify([...selectedClients].sort()) !== JSON.stringify([...currentClientAccess].sort())
    : selectedClient !== (currentClientId || '');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5" />
            Reassign User - {userName}
          </DialogTitle>
          <DialogDescription>
            {isServiceUser 
              ? 'Select multiple clients this service user can access.'
              : 'Select the client this user should be assigned to.'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4">
            {isServiceUser ? (
              <>
                <div className="text-sm font-medium">
                  Current Access: {currentClientAccess.length} {currentClientAccess.length === 1 ? 'client' : 'clients'}
                </div>
                <div className="border rounded-lg p-4 space-y-3 max-h-[400px] overflow-y-auto">
                  {clients.map((client) => (
                    <div key={client.id} className="flex items-start space-x-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <Checkbox
                        id={`client-${client.id}`}
                        checked={selectedClients.includes(client.id)}
                        onCheckedChange={() => handleClientToggle(client.id)}
                      />
                      <Label
                        htmlFor={`client-${client.id}`}
                        className="flex-1 cursor-pointer font-normal"
                      >
                        <div className="font-medium">{client.name}</div>
                        <div className="text-xs text-muted-foreground">ID: {client.id}</div>
                      </Label>
                    </div>
                  ))}
                </div>
                <div className="text-sm text-muted-foreground">
                  Selected: {selectedClients.length} {selectedClients.length === 1 ? 'client' : 'clients'}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="client-select">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="client-select">
                      <SelectValue placeholder="Select a client" />
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((client) => (
                        <SelectItem key={client.id} value={client.id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {currentClientId && (
                  <div className="text-sm text-muted-foreground">
                    Current: {clients.find(c => c.id === currentClientId)?.name || 'Unknown'}
                  </div>
                )}
              </>
            )}

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

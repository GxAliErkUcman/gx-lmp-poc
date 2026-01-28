import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import type { Business } from '@/types/business';

interface ServiceUserCreateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  clientName: string;
  onUserCreated: () => void;
}

export default function ServiceUserCreateDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onUserCreated,
}: ServiceUserCreateDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'client_admin' | 'user' | 'store_owner' | 'service_user'>('user');
  const [loading, setLoading] = useState(false);

  // Store selection (only for owners)
  const [stores, setStores] = useState<Business[]>([]);
  const [storesLoading, setStoresLoading] = useState(false);
  const [selectedStoreIds, setSelectedStoreIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!open) return;
    if (role !== 'store_owner') return;

    const fetchStores = async () => {
      setStoresLoading(true);
      try {
        const { data, error } = await supabase
          .from('businesses')
          .select('*')
          .eq('client_id', clientId)
          .order('businessName');
        if (error) throw error;
        setStores((data || []) as Business[]);
      } catch (err) {
        console.error('Error loading stores:', err);
        toast({ title: 'Error', description: 'Failed to load stores', variant: 'destructive' });
      } finally {
        setStoresLoading(false);
      }
    };

    fetchStores();
  }, [open, role, clientId]);

  const handleToggleStore = (id: string) => {
    setSelectedStoreIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const filteredStores = stores.filter((b) =>
    (b.businessName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.storeCode || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (b.city || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSubmit = async () => {
    if (!email || !firstName || !lastName) {
      toast({ title: 'Error', description: 'Please fill in all fields', variant: 'destructive' });
      return;
    }

    if (role === 'store_owner' && selectedStoreIds.length === 0) {
      toast({ title: 'Select stores', description: 'Pick at least one store for the owner.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          firstName,
          lastName,
          clientId,
          role,
          storeIds: role === 'store_owner' ? selectedStoreIds : [],
        },
      });

      // Handle edge function errors - data contains the response body even on error
      if (error || data?.error) {
        const errorMessage = data?.error || error?.message || 'Failed to create user';
        const isEmailExists = data?.code === 'email_exists' || errorMessage.includes('already exists');
        
        toast({
          title: isEmailExists ? 'User Already Exists' : 'Error',
          description: errorMessage,
          variant: 'destructive',
        });
        return;
      }

      toast({
        title: 'Success',
        description: 'User invited successfully. They will receive an email to set their password.',
      });

      handleClose();
      onUserCreated();
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({ title: 'Error', description: error.message || 'Failed to create user', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('user');
    setSelectedStoreIds([]);
    setSearchQuery('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create User for Client</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Locked Client Selection */}
          <div className="space-y-2">
            <Label htmlFor="client">Client *</Label>
            <div className="relative">
              <Input
                id="client"
                value={clientName}
                disabled
                className="bg-muted pr-10"
              />
              <Lock className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">
              This user will be assigned to {clientName}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email *</Label>
            <Input
              id="email"
              type="email"
              placeholder="user@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name *</Label>
              <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name *</Label>
              <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="role">Role *</Label>
            <Select value={role} onValueChange={(value) => setRole(value as 'client_admin' | 'user' | 'store_owner' | 'service_user')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="service_user">Service User</SelectItem>
                <SelectItem value="client_admin">Client Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="store_owner">Store Owner</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {role === 'service_user'
                ? 'Service Users can access multiple clients and manage their data'
                : role === 'client_admin'
                ? 'Client Admins can manage all users and stores for this client'
                : role === 'user'
                ? 'Users can view and manage all stores for this client'
                : 'Store Owners can only access stores assigned to them'}
            </p>
          </div>

          {role === 'store_owner' && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, store code, or city..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <div className="text-sm text-muted-foreground">
                {selectedStoreIds.length} of {stores.length} stores selected
              </div>

              {storesLoading ? (
                <div className="text-center py-6">Loading stores...</div>
              ) : (
                <ScrollArea className="h-[280px] rounded-md border p-4">
                  <div className="space-y-2">
                    {filteredStores.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        {searchQuery ? 'No stores match your search' : 'No stores available'}
                      </div>
                    ) : (
                      filteredStores.map((b) => (
                        <div key={b.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-muted/50">
                          <Checkbox
                            id={b.id}
                            checked={selectedStoreIds.includes(b.id)}
                            onCheckedChange={() => handleToggleStore(b.id)}
                          />
                          <div className="flex-1 space-y-1">
                            <Label htmlFor={b.id} className="text-sm font-medium cursor-pointer">
                              {b.businessName}
                            </Label>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              <div>Store Code: {b.storeCode}</div>
                              {(b.city || b.state) && (
                                <div>
                                  Location: {b.city}
                                  {b.state && `, ${b.state}`}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create & Invite User'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

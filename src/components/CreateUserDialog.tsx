import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import StoreOwnerAssignmentDialog from './StoreOwnerAssignmentDialog';

interface CreateUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: string;
  onUserCreated: () => void;
}

export default function CreateUserDialog({
  open,
  onOpenChange,
  clientId,
  onUserCreated,
}: CreateUserDialogProps) {
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [role, setRole] = useState<'user' | 'store_owner'>('user');
  const [loading, setLoading] = useState(false);
  const [createdUserId, setCreatedUserId] = useState<string | null>(null);
  const [storeAssignmentOpen, setStoreAssignmentOpen] = useState(false);

  const handleSubmit = async () => {
    if (!email || !firstName || !lastName) {
      toast({
        title: 'Error',
        description: 'Please fill in all fields',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Call the create-user edge function to create the user
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: {
          email,
          firstName,
          lastName,
          clientId,
        },
      });

      if (error) throw error;

      const userId = data.user.id;

      // Assign the role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          role: role,
        });

      if (roleError) throw roleError;

      toast({
        title: 'Success',
        description: `User invited successfully. They will receive an email to set their password.`,
      });

      // If store_owner, open store assignment dialog
      if (role === 'store_owner') {
        setCreatedUserId(userId);
        setStoreAssignmentOpen(true);
      } else {
        // Close and refresh
        handleClose();
        onUserCreated();
      }
    } catch (error: any) {
      console.error('Error creating user:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create user',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRole('user');
    setCreatedUserId(null);
    onOpenChange(false);
  };

  const handleStoreAssignmentComplete = () => {
    handleClose();
    onUserCreated();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
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
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name *</Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as 'user' | 'store_owner')}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="store_owner">Owner</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {role === 'user'
                  ? 'Users can view and manage all stores for this client'
                  : 'Owners can only access stores assigned to them'}
              </p>
            </div>

            <div className="flex justify-end gap-2">
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

      {createdUserId && (
        <StoreOwnerAssignmentDialog
          open={storeAssignmentOpen}
          onOpenChange={setStoreAssignmentOpen}
          userId={createdUserId}
          clientId={clientId}
          onAssigned={handleStoreAssignmentComplete}
        />
      )}
    </>
  );
}

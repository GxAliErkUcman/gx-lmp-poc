import { useState } from 'react';
import { Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface UserSettingsDialogProps {
  triggerClassName?: string;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'icon';
  showLabel?: boolean;
}

export const UserSettingsDialog = ({ 
  triggerClassName = '', 
  variant = 'ghost',
  size = 'sm',
  showLabel = true 
}: UserSettingsDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword.length < 8) {
      toast({ 
        title: 'Password too short', 
        description: 'Use at least 8 characters.', 
        variant: 'destructive' 
      });
      return;
    }
    
    if (newPassword !== confirmPassword) {
      toast({ 
        title: 'Passwords do not match', 
        description: 'Please re-enter matching passwords.', 
        variant: 'destructive' 
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        if (error.message?.includes('New password should be different from the old password') ||
            error.message?.includes('same as the old password')) {
          toast({ 
            title: 'Password unchanged', 
            description: 'Your new password must be different from your current password.', 
            variant: 'destructive' 
          });
          return;
        }
        throw error;
      }
      toast({ title: 'Password updated', description: 'Your password has been changed successfully.' });
      setNewPassword('');
      setConfirmPassword('');
      setOpen(false);
    } catch (err: any) {
      toast({ 
        title: 'Update failed', 
        description: err.message || 'Could not update password.', 
        variant: 'destructive' 
      });
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setNewPassword('');
      setConfirmPassword('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={variant} size={size} className={triggerClassName}>
          <Settings className="w-4 h-4" />
          {showLabel && <span className="hidden sm:inline ml-2">Settings</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Manage your account settings and preferences.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Change Password</h3>
            <form onSubmit={handlePasswordReset} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="settings-new-password">New Password</Label>
                <Input 
                  id="settings-new-password" 
                  type="password" 
                  placeholder="Enter new password (min 8 characters)" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-confirm-password">Confirm Password</Label>
                <Input 
                  id="settings-confirm-password" 
                  type="password" 
                  placeholder="Re-enter new password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                  required 
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update Password'}
              </Button>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

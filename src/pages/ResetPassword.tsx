import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import gxBackground from '@/assets/jasoner-background2.jpg';
import jasonerMascot from '@/assets/jasoner-logo-1.svg';

const ResetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean>(false);

  // Detect recovery token presence and establish a session (supports hash and code flows)
  useEffect(() => {
    const init = async () => {
      const search = new URLSearchParams(location.search);
      const hash = location.hash || '';
      const hasRecoveryType = hash.includes('type=recovery') || location.search.includes('type=recovery');
      const code = search.get('code');

      try {
        // PKCE/code flow: exchange the code for a session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setValidLink(true);
          return;
        }
        // Implicit/hash flow: token is already in the URL fragment
        if (hasRecoveryType) {
          setValidLink(true);
        }
      } catch (e) {
        console.error('Recovery init failed', e);
        setValidLink(false);
      }
    };

    // Also listen for auth events – Supabase sets a temporary session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY') {
        setValidLink(true);
      }
    });

    init();

    return () => subscription.unsubscribe();
  }, [location.hash, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      toast({ title: 'Password too short', description: 'Use at least 8 characters.', variant: 'destructive' });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: 'Passwords do not match', description: 'Please re-enter matching passwords.', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) {
        // Handle specific error cases
        if (error.message?.includes('New password should be different from the old password')) {
          toast({ 
            title: 'Password unchanged', 
            description: 'Your new password must be different from your current password.', 
            variant: 'destructive' 
          });
          return;
        } else if (error.message?.includes('same as the old password')) {
          toast({ 
            title: 'Password unchanged', 
            description: 'Please choose a different password than your current one.', 
            variant: 'destructive' 
          });
          return;
        }
        throw error;
      }
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      navigate('/auth', { replace: true });
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Could not update password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cover bg-center bg-no-repeat relative" style={{ backgroundImage: `url(${gxBackground})` }}>
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img src={jasonerMascot} alt="Jasoner Mascot" className="w-20 h-20 object-contain" />
            </div>
            <CardTitle className="text-2xl font-semibold text-gray-900">Reset Your Password</CardTitle>
            <CardDescription className="text-gray-600">
              {validLink ? 'Enter your new password below.' : 'This link is invalid or expired. Request a new one.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input id="new-password" type="password" placeholder="Enter new password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Re-enter new password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Set New Password'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                <Button className="w-full" onClick={() => navigate('/auth')}>Back to Sign In</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;

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

const SetPassword = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validLink, setValidLink] = useState<boolean>(false);
  const [expired, setExpired] = useState(false);
  const [email, setEmail] = useState<string>('');

  // Detect recovery token presence and establish a session (supports hash and code flows)
  useEffect(() => {
    const init = async () => {
      const search = new URLSearchParams(location.search);
      const hash = location.hash || '';
      setEmail(search.get('email') || '');
      const hasInviteOrRecovery = hash.includes('type=invite') || location.search.includes('type=invite') || hash.includes('type=recovery') || location.search.includes('type=recovery');
      const code = search.get('code');
      const hashParams = new URLSearchParams(hash.replace('#', ''));
      const errorCode = hashParams.get('error_code');
      if (errorCode === 'otp_expired') {
        setExpired(true);
        setValidLink(false);
        return;
      }

      try {
        // PKCE/code flow: exchange the code for a session
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
          setValidLink(true);
          return;
        }
        // Implicit/hash flow: token is already in the URL fragment
        if (hasInviteOrRecovery) {
          setValidLink(true);
        }
      } catch (e) {
        console.error('Account setup init failed', e);
        setValidLink(false);
      }
    };

    // Also listen for auth events – Supabase sets a temporary session
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN' || event === 'PASSWORD_RECOVERY' || event === 'TOKEN_REFRESHED') {
        setValidLink(true);
      }
    });

    init();

    return () => subscription.unsubscribe();
  }, [location.hash, location.search]);

  const handleGenerateNewLink = async () => {
    if (!email) {
      toast({ title: 'Missing email', description: 'Please ask your admin to resend the invite.', variant: 'destructive' });
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-invite-link', {
        body: { email },
      });
      if (error) throw error as any;
      const action_link = (data as any)?.action_link || (data as any)?.properties?.action_link;
      if (action_link) {
        window.location.href = action_link as string;
        return;
      }
      throw new Error('No invite link returned');
    } catch (e: any) {
      toast({ title: 'Could not generate invite', description: e.message || 'Please contact support.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

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
        throw error;
      }
      toast({ title: 'Account created successfully!', description: 'Welcome to Jasoner! You can now sign in with your new password.' });
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      toast({ title: 'Setup failed', description: err.message || 'Could not set up your account.', variant: 'destructive' });
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
            <CardTitle className="text-2xl font-semibold text-gray-900">Welcome to Jasoner!</CardTitle>
            <CardDescription className="text-gray-600">
              {validLink ? 'Please create your password to complete your account setup.' : 'This invitation link is invalid or expired. Please request a new invitation.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {validLink ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">Password</Label>
                  <Input id="new-password" type="password" placeholder="Create your password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input id="confirm-password" type="password" placeholder="Confirm your password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Creating Account...' : 'Create Your Account'}
                </Button>
              </form>
            ) : (
              <div className="space-y-4">
                {expired && (
                  <>
                    <p className="text-sm text-gray-600">Your invitation link has expired. Click below to generate a fresh link.</p>
                    <Button className="w-full" onClick={handleGenerateNewLink} disabled={loading || !email}>
                      {loading ? 'Generating...' : 'Get a new invite link'}
                    </Button>
                  </>
                )}
                <Button variant="outline" className="w-full" onClick={() => navigate('/auth')}>Back to Sign In</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SetPassword;
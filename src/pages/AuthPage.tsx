import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from '@/hooks/use-toast';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAdmin } from '@/hooks/use-admin';
import gxBackground from '@/assets/jasoner-background2.jpg';
import jasonerMascot from '@/assets/jasoner-logo-1.svg';
import { supabase } from '@/integrations/supabase/client';

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(false);
  const [isRecoveryMode, setIsRecoveryMode] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const { signIn, signUp, user } = useAuth();
  const { checkAdminAccess } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/dashboard';

  // Check if user is admin and redirect accordingly (skip during recovery)
  useEffect(() => {
    const handleUserRedirect = async () => {
      const hasRecoveryIndicator = (location.hash || '').includes('type=recovery')
        || location.search.includes('recovery=1')
        || location.search.includes('type=recovery');

      if (user && !checkingAdmin && !isRecoveryMode && !hasRecoveryIndicator) {
        setCheckingAdmin(true);
        const isAdmin = await checkAdminAccess();
        if (isAdmin) {
          navigate('/admin', { replace: true });
        } else {
          navigate(redirect, { replace: true });
        }
      }
    };

    handleUserRedirect();
  }, [user, checkAdminAccess, navigate, redirect, checkingAdmin, isRecoveryMode, location.hash, location.search]);

  // Show loading while checking admin status
  if (user && checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

  // Detect password recovery mode from URL and auth events
  useEffect(() => {
    // Hash params from Supabase links (e.g., #access_token=...&type=recovery)
    const hash = location.hash || '';
    const hashParams = new URLSearchParams(hash.replace('#', '?'));
    const searchParams = new URLSearchParams(location.search);

    if (
      hashParams.get('type') === 'recovery' ||
      searchParams.get('type') === 'recovery' ||
      searchParams.get('recovery') === '1'
    ) {
      setIsRecoveryMode(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [location.hash, location.search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = isLogin 
        ? await signIn(email, password)
        : await signUp(email, password);

      if (error) {
        toast({
          title: "Authentication Error",
          description: error.message,
          variant: "destructive",
        });
      } else if (!isLogin) {
        toast({
          title: "Account Created",
          description: "Please check your email to verify your account.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
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
      const { data, error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      toast({ title: 'Password updated', description: 'You can now sign in with your new password.' });
      setIsRecoveryMode(false);
      setIsLogin(true);
      setNewPassword('');
      setConfirmPassword('');
      navigate('/auth');
    } catch (err: any) {
      toast({ title: 'Update failed', description: err.message || 'Could not update password.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendRecovery = async () => {
    if (!email) {
      toast({ title: 'Enter your email', description: 'Provide an email to send the recovery link.' });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?recovery=1`,
      });
      if (error) throw error;
      toast({ title: 'Email sent', description: 'Check your inbox for the recovery link.' });
    } catch (err: any) {
      toast({ title: 'Send failed', description: err.message || 'Could not send recovery email.', variant: 'destructive' });
    }
  };

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${gxBackground})` }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md bg-white/95 backdrop-blur-sm shadow-2xl border-0">
          <CardHeader className="text-center pb-4">
            <div className="flex justify-center mb-4">
              <img 
                src={jasonerMascot} 
                alt="Jasoner Mascot" 
                className="w-20 h-20 object-contain"
              />
            </div>
          <CardTitle className="text-2xl font-semibold text-gray-900">
            {isRecoveryMode ? 'Reset Your Password' : isLogin ? 'Welcome Back' : 'Join Jasoner'}
          </CardTitle>
          <CardDescription className="text-gray-600">
            {isRecoveryMode
              ? 'Enter your new password below.'
              : isLogin 
                ? 'Sign in to manage your location data' 
                : 'Get started streamlining your locations'}
          </CardDescription>
          </CardHeader>
          <CardContent>
            {isRecoveryMode ? (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm Password</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="Re-enter new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Updating...' : 'Set New Password'}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button type="button" onClick={handleSendRecovery} className="text-primary hover:underline">
                    Forgot password?
                  </button>
                  <button type="button" onClick={() => setIsLogin(!isLogin)} className="text-muted-foreground hover:underline">
                    {isLogin ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
                  </button>
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                </Button>
              </form>
            )}

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
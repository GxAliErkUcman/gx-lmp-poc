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
  const { signIn, signUp, user } = useAuth();
  const { checkAdminAccess } = useAdmin();
  const location = useLocation();
  const navigate = useNavigate();
  const params = new URLSearchParams(location.search);
  const redirect = params.get('redirect') || '/dashboard';

  // Check if user is admin and redirect accordingly
  useEffect(() => {
    const handleUserRedirect = async () => {
      if (user && !checkingAdmin) {
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
  }, [user, checkAdminAccess, navigate, redirect, checkingAdmin]);


  // Show loading while checking admin status
  if (user && checkingAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Redirecting...</div>
      </div>
    );
  }

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


  const handleSendRecovery = async () => {
    if (!email) {
      toast({ title: 'Enter your email', description: 'Provide an email to send the recovery link.' });
      return;
    }
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
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
             {isLogin ? 'Welcome Back' : 'Join Jasoner'}
           </CardTitle>
           <CardDescription className="text-gray-600">
             {isLogin 
               ? 'Sign in to manage your location data' 
               : 'Get started streamlining your locations'}
           </CardDescription>
          </CardHeader>
           <CardContent>
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
           </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPage;
import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import gxBackground from '@/assets/gx-background.jpg';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${gxBackground})` }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* App Name - Top Left */}
      <div className="absolute top-8 left-8 z-20">
        <h1 className="text-2xl font-bold text-white tracking-tight">
          GX Jasoner
        </h1>
      </div>
      
      {/* Auth Box - Positioned Higher */}
      <div className="relative z-10 min-h-screen flex items-start justify-center pt-32">
        <div className="w-full max-w-md mx-4">
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <CardTitle className="text-2xl font-semibold text-gray-900">Welcome</CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                Business Profile Management Platform
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button size="lg" className="w-full" asChild>
                <a href="/auth">Sign In</a>
              </Button>
              <Button size="lg" variant="outline" className="w-full" asChild>
                <a href="/auth">Create Account</a>
              </Button>
              <p className="text-center text-xs text-gray-500 mt-4">
                Streamline your Google Business Profile management
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

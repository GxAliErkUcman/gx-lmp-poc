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
      className="min-h-screen flex items-center justify-center bg-cover bg-center bg-no-repeat"
      style={{ backgroundImage: `url(${gxBackground})` }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      <div className="relative z-10 w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-2">
            GX Jasoner
          </h1>
          <p className="text-white/90 text-lg">
            Business Profile Management Platform
          </p>
        </div>
        
        <Card className="bg-white shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-semibold">Welcome</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button size="lg" className="w-full" asChild>
              <a href="/auth">Sign In</a>
            </Button>
            <Button size="lg" variant="outline" className="w-full" asChild>
              <a href="/auth">Create Account</a>
            </Button>
            <p className="text-center text-sm text-muted-foreground">
              Streamline your Google Business Profile management
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;

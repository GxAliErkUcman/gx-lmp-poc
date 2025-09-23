import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import gxBackground from '@/assets/gx-background.jpg';
import jasonerMascot from '@/assets/jasoner-mascot.png';

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
  }else{
    return <Navigate to="/auth" replace />;
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat relative"
      style={{ backgroundImage: `url(${gxBackground})` }}
    >
      <div className="absolute inset-0 bg-black/40"></div>
      
      {/* Auth Box - Positioned Higher */}
      <div className="relative z-10 min-h-screen flex items-start justify-center pt-24">
        <div className="w-full max-w-md mx-4">
          <Card className="bg-white/95 backdrop-blur-sm shadow-2xl border-0">
            <CardHeader className="text-center pb-4">
              <div className="flex justify-center mb-4">
                <img 
                  src={jasonerMascot} 
                  alt="Jasoner Mascot" 
                  className="w-24 h-24 object-contain"
                />
              </div>
              <CardTitle className="text-2xl font-semibold text-gray-900">Welcome to Jasoner</CardTitle>
              <p className="text-gray-600 text-sm mt-2">
                The place to streamline your location data
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button size="lg" className="w-full" asChild>
                <a href="/auth">Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;

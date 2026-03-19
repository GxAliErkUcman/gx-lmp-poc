import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import LoadingSpinner from '@/components/LoadingSpinner';

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <LoadingSpinner fullScreen />;
  }

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }else{
    return <Navigate to="/auth" replace />;
  }
};

export default Index;

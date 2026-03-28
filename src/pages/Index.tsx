import { useAuth } from '@/contexts/AuthContext';
import { Navigate } from 'react-router-dom';

const Index = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Memuat...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to="/" replace />;
};

export default Index;

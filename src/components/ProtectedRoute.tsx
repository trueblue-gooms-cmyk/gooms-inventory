import { Navigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { LoadingScreen } from './LoadingScreen';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'operator';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { profile, isLoading } = useAppStore();
  
  if (isLoading) return <LoadingScreen />;
  
  if (!profile) return <Navigate to="/login" replace />;
  
  if (requiredRole === 'admin' && profile.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (requiredRole === 'operator' && !['admin', 'operator'].includes(profile.role)) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
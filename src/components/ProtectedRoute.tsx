import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { LoadingScreen } from './LoadingScreen';
import { supabase } from '../integrations/supabase/client';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'operator';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAppStore();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [roleLoading, setRoleLoading] = useState(true);
  
  useEffect(() => {
    async function fetchRole() {
      if (!user) {
        setRoleLoading(false);
        return;
      }
      
      try {
        const { data, error } = await supabase.rpc('get_my_role');
        if (error) throw error;
        setUserRole(data);
      } catch (error) {
        console.error('Error fetching user role:', error);
        setUserRole(null);
      } finally {
        setRoleLoading(false);
      }
    }
    
    fetchRole();
  }, [user]);
  
  if (isLoading || roleLoading) return <LoadingScreen />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (requiredRole === 'admin' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (requiredRole === 'operator' && !['admin', 'operator'].includes(userRole || '')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
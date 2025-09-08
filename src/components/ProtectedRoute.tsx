import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppStore } from '../stores/useAppStore';
import { LoadingScreen } from './LoadingScreen';
import { useUserRole } from '../hooks/useSecureAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: 'admin' | 'operator';
}

export function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const { user, isLoading } = useAppStore();
  const userRole = useUserRole();
  
  // Show loading while checking auth or role
  if (isLoading || (user && userRole === null)) return <LoadingScreen />;
  
  if (!user) return <Navigate to="/login" replace />;
  
  if (requiredRole === 'admin' && userRole !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }
  
  if (requiredRole === 'operator' && !['admin', 'operator'].includes(userRole || '')) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
}
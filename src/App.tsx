import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { NotificationProvider } from './components/ui/NotificationProvider';
import { MainLayout } from './components/layout/MainLayout';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Production } from './pages/Production';
import { Purchases } from './pages/Purchases';
import { Projections } from './pages/Projections';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { ErrorBoundary } from './components/ErrorBoundary';
import { LoadingScreen } from './components/LoadingScreen';
import { supabase } from './integrations/supabase/client';

function App() {
  const { checkSession, isLoading } = useAppStore();

  useEffect(() => {
    // Set up auth state listener FIRST to prevent race conditions
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        // Synchronous state updates only - defer Supabase calls to prevent deadlocks
        if (event === 'SIGNED_IN' && session) {
          setTimeout(() => {
            checkSession();
          }, 0);
        } else if (event === 'SIGNED_OUT') {
          useAppStore.setState({ user: null, profile: null });
        }
      }
    );

    // THEN check for existing session
    checkSession();

    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [checkSession]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <NotificationProvider />
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          
          {/* Protected routes */}
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="inventory" element={<Inventory />} />
            <Route path="production" element={
  <ProtectedRoute requiredRole="operator">
    <Production />
  </ProtectedRoute>
} />
            <Route path="purchases" element={
  <ProtectedRoute requiredRole="operator">
    <Purchases />
  </ProtectedRoute>
} />
            <Route path="projections" element={<Projections />} />
            <Route path="reports" element={<Reports />} />
            <Route path="settings" element={
  <ProtectedRoute requiredRole="admin">
    <Settings />
  </ProtectedRoute>
} />
            <Route path="users" element={
  <ProtectedRoute requiredRole="admin">
    <Users />
  </ProtectedRoute>
} />
          </Route>
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
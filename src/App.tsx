// src/App.tsx - Actualizado con todas las rutas nuevas
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { NotificationProvider } from './components/ui/NotificationProvider';
import { ProtectedRoute } from './components/ProtectedRoute';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { Login } from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Production } from './pages/Production';
import Purchases from './pages/Purchases';
import { Projections } from './pages/Projections';
import { Reports } from './pages/Reports';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { Products } from './pages/Products';
import { RawMaterials } from './pages/RawMaterials';
import { LoadingScreen } from './components/LoadingScreen';
import { supabase } from './integrations/supabase/client';

function AppContent() {
  const { checkSession, isLoading } = useAppStore();
  const location = useLocation();

  useEffect(() => {
    checkSession();
    const { data: authListener } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        setTimeout(() => checkSession(), 0);
      } else if (event === 'SIGNED_OUT') {
        useAppStore.setState({ user: null, profile: null });
      }
    });
    return () => authListener?.subscription.unsubscribe();
  }, []);

  if (isLoading && location.pathname !== '/login') return <LoadingScreen />;

  return (
    <ErrorBoundary>
      <NotificationProvider />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<Products />} />
          <Route path="raw-materials" element={<RawMaterials />} />
          <Route path="inventory" element={
            <ErrorBoundary>
              <Inventory />
            </ErrorBoundary>
          } />
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
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
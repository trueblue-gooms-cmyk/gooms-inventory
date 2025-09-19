// src/App.tsx - Actualizado con todas las rutas nuevas
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAppStore } from './stores/useAppStore';
import { NotificationProvider } from './components/ui/NotificationProvider';
import { MainLayout } from './components/layout/MainLayout';
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalErrorHandler } from './components/GlobalErrorHandler';
import { Login } from './pages/Login';
import Dashboard from './pages/Dashboard';
import { Inventory } from './pages/Inventory';
import { Settings } from './pages/Settings';
import { Users } from './pages/Users';
import { UnifiedProducts } from './pages/UnifiedProducts';
import { InventoryMovements } from './pages/InventoryMovements';
import Laboratory from './pages/Laboratory';
import DataImport from './pages/DataImport';
import { LoadingScreen } from './components/LoadingScreen';
import { OfflineSyncStatus } from './components/OfflineSyncStatus';
import { MobileBottomNavigation } from './components/MobileBottomNavigation';
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
  }, [checkSession]);

  if (isLoading && location.pathname !== '/login') return <LoadingScreen />;

  return (
    <GlobalErrorHandler>
      <ErrorBoundary>
        <NotificationProvider />
        <OfflineSyncStatus variant="floating" />
        <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="products" element={<UnifiedProducts />} />
          <Route path="movements" element={<InventoryMovements />} />
          <Route path="laboratory" element={<Laboratory />} />
          <Route path="data-import" element={<DataImport />} />
          <Route path="inventory" element={
            <ErrorBoundary>
              <Inventory />
            </ErrorBoundary>
          } />
          <Route path="settings" element={<Settings />} />
          <Route path="users" element={<Users />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <MobileBottomNavigation />
      </ErrorBoundary>
    </GlobalErrorHandler>
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
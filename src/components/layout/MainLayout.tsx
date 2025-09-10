// src/components/layout/MainLayout.tsx
import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAppStore, useProfile } from '@/stores/useAppStore';
import { useCanEdit, useIsAdmin } from '@/hooks/useSecureAuth';
import { Box, X } from 'lucide-react';
import { GlobalHeader } from './GlobalHeader';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
  permission?: 'all' | 'edit' | 'admin';
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Box, permission: 'all' },
  { label: 'Productos', href: '/products', icon: Box, permission: 'all' },
  { label: 'Materias Primas', href: '/raw-materials', icon: Box, permission: 'all' },
  { label: 'Inventario', href: '/inventory', icon: Box, permission: 'all' },
  { label: 'Producción', href: '/production', icon: Box, permission: 'edit' },
  { label: 'Compras', href: '/purchases', icon: Box, permission: 'edit' },
  { label: 'Proyecciones', href: '/projections', icon: Box, permission: 'all' },
  { label: 'Reportes', href: '/reports', icon: Box, permission: 'all' },
  { label: 'Configuración', href: '/settings', icon: Box, permission: 'admin' },
  { label: 'Usuarios', href: '/users', icon: Box, permission: 'admin' },
];

export function MainLayout() {
  const location = useLocation();
  const profile = useProfile();
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
  const { sidebarOpen, toggleSidebar, signOut, user } = useAppStore();
  const [isMobile, setIsMobile] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        useAppStore.setState({ sidebarOpen: false });
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  const filteredNavItems = navItems.filter((item) => {
    if (item.permission === 'all') return true;
    if (item.permission === 'edit') return canEdit;
    if (item.permission === 'admin') return isAdmin;
    return false;
  });

  const handleNavClick = () => {
    if (isMobile) {
      toggleSidebar();
    }
  };

  const getInitials = (name?: string, email?: string) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Gooms</span>
          </Link>
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors group ${
                  isActive
                    ? 'bg-orange-50 text-orange-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-orange-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span className="font-medium">{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto px-2 py-0.5 text-xs rounded-full ${
                      isActive
                        ? 'bg-orange-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center">
              <span className="text-sm font-medium text-orange-600">
                {getInitials(profile?.full_name, profile?.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Header integrado */}
        <GlobalHeader
          user={profile}
          onTimeFilterChange={(days) => {
            console.log('Filtro cambiado a:', days, 'días');
          }}
          onRefresh={() => {
            window.location.reload();
          }}
          onSearch={(query) => {
            console.log('Buscar:', query);
          }}
          notifications={0}
          isLoading={false}
        />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto bg-gray-50">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}

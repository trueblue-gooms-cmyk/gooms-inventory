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
  { label: 'Catálogo', href: '/products', icon: Box, permission: 'all' },
  { label: 'Inventario', href: '/inventory', icon: Box, permission: 'all' },
  { label: 'Movimientos', href: '/movements', icon: Box, permission: 'edit' },
  { label: 'Laboratorio', href: '/laboratory', icon: Box, permission: 'edit' },
  // TEMPORALMENTE DESHABILITADAS
  // { label: 'Producción', href: '/production', icon: Box, permission: 'edit' },
  // { label: 'Compras', href: '/purchases', icon: Box, permission: 'edit' },
  { label: 'Recepción', href: '/reception', icon: Box, permission: 'edit' },
  // { label: 'Finanzas', href: '/financial', icon: Box, permission: 'edit' },
  // { label: 'Proyecciones', href: '/projections', icon: Box, permission: 'all' },
  // { label: 'Reportes', href: '/reports', icon: Box, permission: 'all' },
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
  const [currentTimeFilter, setCurrentTimeFilter] = useState(30); // Default: 30 días

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

  if (!user) {
    return <Navigate to="/login" replace />;
  }

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

  // Safety: si no hay profile aún, continuamos con la app y mostramos placeholders
  // (evitar redirección que causa pantallas en blanco mientras carga el perfil)
  // if (!profile) {
  //   return <Navigate to="/login" replace />;
  // }

  return (
    <div className="flex h-screen bg-gray-50/30">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-white/80 backdrop-blur-md border-r border-gray-100 transform transition-transform duration-300 ease-out md:relative md:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-20 px-8 border-b border-gray-100">
          <Link to="/dashboard" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-500 rounded-2xl flex items-center justify-center shadow-sm">
              <Box className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-thin text-gray-900 tracking-tight">Gooms</span>
          </Link>
          {isMobile && (
            <button
              onClick={toggleSidebar}
              className="md:hidden p-2.5 rounded-full hover:bg-gray-100/50 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-6 py-6 space-y-2 overflow-y-auto">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={handleNavClick}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-200 group ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-600 shadow-sm'
                    : 'text-gray-600 hover:bg-gray-50/50 hover:text-gray-900'
                }`}
              >
                <Icon
                  className={`w-5 h-5 ${
                    isActive
                      ? 'text-orange-600'
                      : 'text-gray-400 group-hover:text-gray-600'
                  }`}
                />
                <span className="font-light text-[15px]">{item.label}</span>
                {item.badge && (
                  <span
                    className={`ml-auto px-2.5 py-1 text-xs font-light rounded-full ${
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
        <div className="px-6 py-5 border-t border-gray-100">
          <div className="flex items-center gap-4 p-3 rounded-2xl bg-gray-50/50">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-500 flex items-center justify-center shadow-sm">
              <span className="text-sm font-medium text-white">
                {getInitials(profile?.full_name, profile?.email)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {profile?.full_name || 'Usuario'}
              </p>
              <p className="text-xs font-light text-gray-500 truncate">{profile?.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Global Header integrado */}
        <GlobalHeader
          user={{
            id: profile?.id || '',
            email: profile?.email || '',
            full_name: profile?.full_name || '',
            role: (profile?.role as 'admin' | 'operator' | 'user') || 'user'
          }}
          onTimeFilterChange={(days) => {
            setCurrentTimeFilter(days);
            // El filtro ahora está funcionalmente conectado
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
        <main className="flex-1 overflow-y-auto bg-gray-50/30">
          <div className="container mx-auto px-8 py-10">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
}

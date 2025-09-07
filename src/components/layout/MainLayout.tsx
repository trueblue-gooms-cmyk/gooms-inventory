import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation, Navigate } from 'react-router-dom';
import { useAppStore, useProfile, useCanEdit, useIsAdmin } from '@/stores/useAppStore';
import {
  Home, Package, Factory, ShoppingCart, TrendingUp,
  Settings, Users, FileBarChart, Menu, X, LogOut,
  Box, ChevronDown
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', href: '/dashboard', icon: Home, permission: 'all' },
  { label: 'Inventario', href: '/inventory', icon: Package, permission: 'all' },
  { label: 'Producción', href: '/production', icon: Factory, permission: 'edit' },
  { label: 'Compras', href: '/purchases', icon: ShoppingCart, permission: 'edit' },
  { label: 'Proyecciones', href: '/projections', icon: TrendingUp, permission: 'all' },
  { label: 'Reportes', href: '/reports', icon: FileBarChart, permission: 'all' },
  { label: 'Configuración', href: '/settings', icon: Settings, permission: 'admin' },
  { label: 'Usuarios', href: '/users', icon: Users, permission: 'admin' },
];

export function MainLayout() {
  const location = useLocation();
  const profile = useProfile();
  const canEdit = useCanEdit();
  const isAdmin = useIsAdmin();
  const { sidebarOpen, toggleSidebar, signOut, user } = useAppStore();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  if (!user) return <Navigate to="/login" replace />;

  const filteredNavItems = navItems.filter((item) => {
    if (item.permission === 'all') return true;
    if (item.permission === 'edit') return canEdit;
    if (item.permission === 'admin') return isAdmin;
    return false;
  });

  return (
    <div className="flex h-screen bg-gray-50">
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r transform transition-transform md:relative md:translate-x-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex items-center justify-between h-16 px-6 border-b">
          <Link to="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
              <Box className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold">Gooms</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 py-4 space-y-1">
          {filteredNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive ? 'bg-orange-50 text-orange-600' : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t">
          <button onClick={signOut} className="w-full flex items-center gap-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg">
            <LogOut className="w-4 h-4" />
            <span>Cerrar sesión</span>
          </button>
        </div>
      </aside>
      
      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b h-16 flex items-center px-6">
          <button onClick={toggleSidebar} className="md:hidden p-2">
            <Menu className="w-5 h-5" />
          </button>
        </header>
        
        <main className="flex-1 overflow-y-auto">
          <div className="container mx-auto px-6 py-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
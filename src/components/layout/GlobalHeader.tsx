// src/components/layout/GlobalHeader.tsx
import React, { useState, useEffect } from 'react';
import { 
  Search, 
  RefreshCw, 
  Bell, 
  Calendar,
  Menu,
  X,
  Settings,
  LogOut,
  User,
  ChevronDown,
  Package
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

// Tipos para el sistema
interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  role: 'admin' | 'operator' | 'user';
  avatar_url?: string;
}

interface TimeFilter {
  label: string;
  value: number;
  unit: 'days' | 'months' | 'years';
}

interface GlobalHeaderProps {
  user: UserProfile;
  onTimeFilterChange: (days: number) => void;
  onRefresh: () => void;
  onSearch: (query: string) => void;
  notifications: number;
  isLoading?: boolean;
  currentPath?: string;
}

const timeFilters: TimeFilter[] = [
  { label: 'Últimos 7 días', value: 7, unit: 'days' },
  { label: 'Últimos 30 días', value: 30, unit: 'days' },
  { label: 'Últimos 90 días', value: 90, unit: 'days' },
  { label: 'Último año', value: 365, unit: 'days' },
  { label: 'Todo', value: -1, unit: 'days' },
];

export function GlobalHeader({ 
  user, 
  onTimeFilterChange, 
  onRefresh, 
  onSearch,
  notifications,
  isLoading = false,
  currentPath = '/dashboard'
}: GlobalHeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState(timeFilters[1]); // Default: 30 días
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const navigate = useNavigate();
  const { signOut } = useAppStore();
  const handleLogout = async () => {
    try {
      await signOut();
    } finally {
      setShowUserMenu(false);
      navigate('/login', { replace: true });
    }
  };

  // Cerrar menús al hacer click fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.user-menu') && !target.closest('.notifications-menu')) {
        setShowUserMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleTimeFilterChange = (filter: TimeFilter) => {
    setSelectedFilter(filter);
    onTimeFilterChange(filter.value);
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await onRefresh();
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleSearch = () => {
    onSearch(searchQuery);
  };

  const getRoleLabel = (role: string) => {
    const labels = {
      admin: 'Administrador',
      operator: 'Operador',
      user: 'Usuario'
    };
    return labels[role as keyof typeof labels] || role;
  };

  const getRoleBadgeColor = (role: string) => {
    const colors = {
      admin: 'bg-purple-100 text-purple-700',
      operator: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700'
    };
    return colors[role as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo y nombre */}
          <div className="flex items-center">
            <button
              onClick={() => setShowMobileMenu(!showMobileMenu)}
              className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            >
              {showMobileMenu ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
            
            <div className="flex items-center ml-2 lg:ml-0">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <span className="ml-2 text-xl font-bold text-gray-900 hidden sm:block">Gooms</span>
            </div>
          </div>

          {/* Barra de búsqueda - Desktop */}
          <div className="hidden lg:flex flex-1 max-w-lg mx-8">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
                placeholder="Buscar productos, órdenes..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </div>

          {/* Controles de la derecha */}
          <div className="flex items-center gap-2 lg:gap-4">
            {/* Filtro de tiempo */}
            <div className="relative hidden sm:block">
              <button
                className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  const menu = document.getElementById('time-filter-menu');
                  menu?.classList.toggle('hidden');
                }}
              >
                <Calendar className="w-4 h-4 text-gray-600" />
                <span className="text-sm text-gray-700 hidden md:inline">{selectedFilter.label}</span>
                <ChevronDown className="w-4 h-4 text-gray-600" />
              </button>
              
              <div 
                id="time-filter-menu"
                className="hidden absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                {timeFilters.map((filter) => (
                  <button
                    key={filter.label}
                    onClick={() => {
                      handleTimeFilterChange(filter);
                      document.getElementById('time-filter-menu')?.classList.add('hidden');
                    }}
                    className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 ${
                      selectedFilter.value === filter.value ? 'bg-orange-50 text-orange-600' : 'text-gray-700'
                    }`}
                  >
                    {filter.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Botón de actualizar */}
            <button
              onClick={handleRefresh}
              disabled={refreshing || isLoading}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors disabled:opacity-50"
              title="Actualizar datos"
            >
              <RefreshCw className={`w-5 h-5 text-gray-600 ${refreshing ? 'animate-spin' : ''}`} />
            </button>

            {/* Notificaciones */}
            <div className="relative notifications-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowNotifications(!showNotifications);
                  setShowUserMenu(false);
                }}
                className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Bell className="w-5 h-5 text-gray-600" />
                {notifications > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-900">Notificaciones</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {notifications > 0 ? (
                      <div className="px-4 py-3 hover:bg-gray-50">
                        <p className="text-sm text-gray-600">Tienes {notifications} notificaciones nuevas</p>
                      </div>
                    ) : (
                      <div className="px-4 py-8 text-center">
                        <p className="text-sm text-gray-500">No hay notificaciones nuevas</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Menú de usuario */}
            <div className="relative user-menu">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowUserMenu(!showUserMenu);
                  setShowNotifications(false);
                }}
                className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-orange-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-medium text-sm">
                    {user.full_name?.charAt(0).toUpperCase() || user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-gray-600 hidden sm:block" />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <p className="text-sm font-medium text-gray-900">{user.full_name || 'Usuario'}</p>
                    <p className="text-xs text-gray-500 mt-1">{user.email}</p>
                    <span className={`inline-block mt-2 px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </div>
                  
                  {user.role === 'admin' && (
                    <button
                      onClick={() => {
                        navigate('/settings');
                        setShowUserMenu(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                    >
                      <Settings className="w-4 h-4" />
                      Configuración
                    </button>
                  )}
                  
                  <div className="border-t border-gray-200 mt-2 pt-2">
                    <button onClick={handleLogout} className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                      <LogOut className="w-4 h-4" />
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Barra de búsqueda - Mobile */}
        <div className="lg:hidden pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSearch();
                }
              }}
              placeholder="Buscar..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {showMobileMenu && (
        <div className="lg:hidden border-t border-gray-200 bg-white">
          <nav className="px-4 py-2">
            <a href="/dashboard" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Dashboard
            </a>
            <a href="/products" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Productos
            </a>
            <a href="/inventory" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Inventario
            </a>
            <a href="/production" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Producción
            </a>
            <a href="/purchases" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Compras
            </a>
            <a href="/reports" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
              Reportes
            </a>
            {user.role === 'admin' && (
              <a href="/settings" className="block px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
                Configuración
              </a>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
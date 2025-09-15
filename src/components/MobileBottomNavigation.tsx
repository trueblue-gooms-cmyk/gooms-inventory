// Navegación inferior móvil para PWA
// Compatible con Lovable - Navegación optimizada para móviles
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  TrendingUp, 
  Settings,
  Plus,
  BarChart3,
  Receipt,
  AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useMobileGestures } from '../hooks/useMobileGestures';

interface NavigationItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  path: string;
  badge?: number;
  color?: string;
}

interface MobileBottomNavigationProps {
  className?: string;
  showLabels?: boolean;
}

export const MobileBottomNavigation = ({ 
  className = '', 
  showLabels = true 
}: MobileBottomNavigationProps) => {
  const location = useLocation();
  const { isMobile, hapticFeedback } = useMobileGestures();

  // Solo mostrar en móviles
  if (!isMobile) return null;

  const navigationItems: NavigationItem[] = [
    {
      key: 'dashboard',
      label: 'Inicio',
      icon: <Home className="w-5 h-5" />,
      path: '/dashboard'
    },
    {
      key: 'inventory',
      label: 'Inventario',
      icon: <Package className="w-5 h-5" />,
      path: '/inventory',
      badge: 3 // Ejemplo: productos con stock bajo
    },
    {
      key: 'add',
      label: 'Agregar',
      icon: <Plus className="w-6 h-6" />,
      path: '/add',
      color: 'primary'
    },
    {
      key: 'reports',
      label: 'Reportes',
      icon: <BarChart3 className="w-5 h-5" />,
      path: '/reports'
    },
    {
      key: 'settings',
      label: 'Más',
      icon: <Settings className="w-5 h-5" />,
      path: '/settings'
    }
  ];

  const handleNavClick = (path: string) => {
    hapticFeedback('light');
  };

  const isActive = (path: string) => {
    if (path === '/add') return false; // El botón + no tiene estado activo
    return location.pathname === path || 
           (path === '/dashboard' && location.pathname === '/');
  };

  return (
    <nav className={`mobile-bottom-nav ${className}`}>
      {navigationItems.map((item) => {
        const active = isActive(item.path);
        const isPrimaryButton = item.color === 'primary';

        return (
          <Link
            key={item.key}
            to={item.path}
            onClick={() => handleNavClick(item.path)}
            className={`
              mobile-nav-item
              ${active ? 'active' : ''}
              ${isPrimaryButton ? 'bg-blue-600 text-white hover:bg-blue-700 rounded-full mx-2 py-2' : ''}
              transition-all duration-200
            `}
          >
            <div className="relative">
              {item.icon}
              
              {/* Badge de notificaciones */}
              {item.badge && item.badge > 0 && (
                <Badge 
                  variant="destructive" 
                  className="absolute -top-2 -right-2 min-w-[18px] h-[18px] flex items-center justify-center text-xs px-1"
                >
                  {item.badge > 99 ? '99+' : item.badge}
                </Badge>
              )}
            </div>
            
            {/* Etiqueta */}
            {showLabels && (
              <span className={`
                text-xs font-medium mt-1
                ${isPrimaryButton ? 'text-white' : ''}
              `}>
                {item.label}
              </span>
            )}

            {/* Indicador activo */}
            {active && !isPrimaryButton && (
              <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-blue-600 rounded-full" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};
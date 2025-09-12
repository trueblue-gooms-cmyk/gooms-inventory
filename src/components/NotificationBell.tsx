import { useState, useEffect } from 'react';
import { Bell, X, Package, Clock, ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Notification {
  id: string;
  type: 'stock_low' | 'expiring' | 'purchase_approval' | 'general';
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  is_read: boolean;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Datos de prueba mientras se implementa la base de datos
  const mockNotifications: Notification[] = [
    {
      id: '1',
      type: 'stock_low',
      title: 'Stock Bajo',
      message: 'Alulosa tiene solo 5 unidades disponibles',
      priority: 'high',
      created_at: new Date().toISOString(),
      is_read: false
    },
    {
      id: '2',
      type: 'purchase_approval',
      title: 'Orden Pendiente',
      message: 'Orden PO-2025-001 requiere aprobación',
      priority: 'medium',
      created_at: new Date(Date.now() - 3600000).toISOString(),
      is_read: false
    },
    {
      id: '3',
      type: 'expiring',
      title: 'Producto por Vencer',
      message: 'Lote BATCH-001 vence en 7 días',
      priority: 'critical',
      created_at: new Date(Date.now() - 7200000).toISOString(),
      is_read: false
    }
  ];

  useEffect(() => {
    loadNotifications();
  }, []);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      // Load notifications from the database
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) {
        console.error('Error loading notifications:', error);
        // Fallback to mock data
        setNotifications(mockNotifications);
      } else {
        const realNotifications = (data || []) as Notification[];
        // If no real notifications, show mock data for demo
        setNotifications(realNotifications.length > 0 ? realNotifications : mockNotifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setNotifications(mockNotifications);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: string) => {
    try {
      // Update in database
      await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', id);
    } catch (error) {
      console.error('Error updating notification:', error);
    }
    
    // Update local state
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const markAllAsRead = () => {
    setNotifications([]);
    toast.success('Todas las notificaciones marcadas como leídas');
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'stock_low': return Package;
      case 'expiring': return Clock;
      case 'purchase_approval': return ShoppingCart;
      default: return Bell;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'border-l-destructive bg-destructive/5';
      case 'high': return 'border-l-orange-500 bg-orange-500/5';
      case 'medium': return 'border-l-yellow-500 bg-yellow-500/5';
      default: return 'border-l-primary bg-primary/5';
    }
  };

  const formatTime = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffMinutes < 60) return `Hace ${diffMinutes} min`;
    if (diffMinutes < 1440) return `Hace ${Math.floor(diffMinutes / 60)} h`;
    return `Hace ${Math.floor(diffMinutes / 1440)} días`;
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-muted-foreground hover:text-foreground focus:outline-none transition-colors"
      >
        <Bell className="w-6 h-6" />
        {notifications.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center animate-pulse">
            {notifications.length}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Panel de notificaciones */}
          <div className="absolute right-0 top-12 w-96 bg-popover rounded-lg shadow-xl border border-border z-50 max-h-96 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
              <h3 className="text-lg font-semibold text-popover-foreground">Notificaciones</h3>
              <div className="flex items-center gap-2">
                {notifications.length > 0 && (
                  <button
                    onClick={markAllAsRead}
                    className="text-sm text-primary hover:text-primary/80 font-medium"
                  >
                    Marcar todas
                  </button>
                )}
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-muted-foreground hover:text-foreground p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Cargando...</p>
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Bell className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-lg font-medium">No hay notificaciones</p>
                  <p className="text-sm">Te notificaremos sobre eventos importantes</p>
                </div>
              ) : (
                notifications.map(notification => {
                  const Icon = getIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`border-l-4 p-4 border-b border-border hover:bg-accent/50 cursor-pointer transition-colors ${getPriorityColor(notification.priority)}`}
                      onClick={() => markAsRead(notification.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <h4 className="text-sm font-medium text-popover-foreground truncate">
                              {notification.title}
                            </h4>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="text-muted-foreground hover:text-foreground ml-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-muted-foreground/70 mt-2">
                            {formatTime(notification.created_at)}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer con acciones */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-border bg-muted/50">
                <button
                  onClick={() => {
                    setIsOpen(false);
                    // Navegar a una página de notificaciones completa
                    toast.info('Funcionalidad de notificaciones completas próximamente');
                  }}
                  className="w-full text-sm text-primary hover:text-primary/80 font-medium"
                >
                  Ver todas las notificaciones
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
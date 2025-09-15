import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { QUERY_KEYS } from './useOptimizedQueries';

interface RealtimeNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  data?: {
    product_id?: string;
    location_name?: string;
    days_until_expiry?: number;
    [key: string]: unknown;
  };
}

export const useRealtimeNotifications = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastNotification, setLastNotification] = useState<RealtimeNotification | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    // Subscribe to notifications table
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications'
        },
        (payload) => {
          const newNotification = payload.new as RealtimeNotification;
          setLastNotification(newNotification);
          
          // Configuración específica para notificaciones de vencimiento
          const toastConfig: {
            title: string;
            description: string;
            variant?: 'default' | 'destructive';
            duration?: number;
          } = {
            title: newNotification.title,
            description: newNotification.message,
          };

          // Personalizar según el tipo de notificación
          if (newNotification.type === 'expiry_alert') {
            toastConfig.variant = 'destructive';
            toastConfig.duration = 10000; // 10 segundos para alertas críticas
            
            // Agregar información adicional si está disponible
            if (newNotification.data?.days_until_expiry !== undefined) {
              const days = newNotification.data.days_until_expiry;
              const urgencyText = days <= 1 ? 'URGENTE' : days <= 3 ? 'MUY IMPORTANTE' : 'IMPORTANTE';
              toastConfig.title = `🚨 ${urgencyText}: ${newNotification.title}`;
            }
          } else {
            toastConfig.variant = newNotification.priority === 'critical' ? 'destructive' as const : 'default' as const;
          }

          toast(toastConfig);

          // Invalidar cache de notificaciones e inventario para refrescar datos
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.notifications });
          if (newNotification.type === 'expiry_alert') {
            queryClient.invalidateQueries({ queryKey: ['inventory-rotation'] });
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED');
      });

    // Subscribe to inventory changes for real-time updates
    const inventoryChannel = supabase
      .channel('inventory-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'inventory_current'
        },
        () => {
          // Invalidate inventory cache when inventory changes
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
        }
      )
      .subscribe();

    // Subscribe to movement changes
    const movementsChannel = supabase
      .channel('movements-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_movements'
        },
        () => {
          // Invalidate movements cache when new movements are added
          queryClient.invalidateQueries({ queryKey: ['movements'] });
          queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(notificationsChannel);
      supabase.removeChannel(inventoryChannel);
      supabase.removeChannel(movementsChannel);
    };
  }, [queryClient, toast]);

  // Function to create a new notification
  const createNotification = async (notification: Omit<RealtimeNotification, 'id' | 'created_at'>) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          ...notification,
          user_id: (await supabase.auth.getUser()).data.user?.id
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  // Function to create stock alert notifications
  const createStockAlert = async (productName: string, currentStock: number, minStock: number) => {
    const priority = currentStock <= minStock * 0.5 ? 'critical' : 'high';
    const title = priority === 'critical' ? '🚨 Stock Crítico' : '⚠️ Stock Bajo';
    const message = `${productName}: ${currentStock} unidades (Mínimo: ${minStock})`;

    await createNotification({
      type: 'stock_alert',
      title,
      message,
      priority
    });
  };

  return {
    isConnected,
    lastNotification,
    createNotification,
    createStockAlert
  };
};
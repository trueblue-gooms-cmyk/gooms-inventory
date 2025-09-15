// Hook personalizado para gestión de push notifications
// Compatible con Lovable - Integración completa con PWA
import { useState, useEffect, useCallback } from 'react';
import { pushNotificationService } from '../services/pushNotifications';
import { useToast } from './use-toast';

interface NotificationState {
  isSupported: boolean;
  permission: NotificationPermission;
  isSubscribed: boolean;
  isLoading: boolean;
  error: string | null;
}

export const usePushNotifications = () => {
  const [state, setState] = useState<NotificationState>({
    isSupported: false,
    permission: 'default',
    isSubscribed: false,
    isLoading: true,
    error: null
  });

  const { toast } = useToast();

  // 🔄 ACTUALIZAR ESTADO
  const updateState = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true, error: null }));
      
      const status = await pushNotificationService.getSubscriptionStatus();
      
      setState({
        isSupported: status.isSupported,
        permission: status.permission,
        isSubscribed: status.isSubscribed,
        isLoading: false,
        error: null
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido'
      }));
    }
  }, []);

  // 📱 SOLICITAR PERMISOS
  const requestPermission = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "❌ No soportado",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive"
      });
      return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const permission = await pushNotificationService.requestPermission();
      
      if (permission === 'granted') {
        toast({
          title: "✅ Permisos concedidos",
          description: "Las notificaciones han sido habilitadas exitosamente"
        });
        await updateState();
        return true;
      } else if (permission === 'denied') {
        toast({
          title: "❌ Permisos denegados",
          description: "Puedes habilitarlos desde la configuración del navegador",
          variant: "destructive"
        });
        return false;
      } else {
        toast({
          title: "⏳ Permisos pendientes",
          description: "Responde a la solicitud de permisos del navegador",
          variant: "default"
        });
        return false;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast({
        title: "❌ Error solicitando permisos",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported, toast, updateState]);

  // 📝 SUSCRIBIRSE
  const subscribe = useCallback(async () => {
    if (!state.isSupported) {
      toast({
        title: "❌ No soportado",
        description: "Tu navegador no soporta notificaciones push",
        variant: "destructive"
      });
      return false;
    }

    if (state.permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const subscription = await pushNotificationService.subscribe();
      
      if (subscription) {
        toast({
          title: "🔔 Suscripción exitosa",
          description: "Recibirás notificaciones importantes del inventario"
        });
        await updateState();
        return true;
      }
      
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast({
        title: "❌ Error en suscripción",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [state.isSupported, state.permission, requestPermission, toast, updateState]);

  // 🗑️ DESUSCRIBIRSE
  const unsubscribe = useCallback(async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }));
      
      const success = await pushNotificationService.unsubscribe();
      
      if (success) {
        toast({
          title: "✅ Desuscripción exitosa",
          description: "Ya no recibirás notificaciones push"
        });
        await updateState();
        return true;
      }
      
      return false;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      setState(prev => ({ ...prev, error: errorMessage }));
      toast({
        title: "❌ Error en desuscripción",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  }, [toast, updateState]);

  // 📨 ENVIAR NOTIFICACIÓN DE PRUEBA
  const sendTestNotification = useCallback(async () => {
    if (!state.isSubscribed) {
      toast({
        title: "❌ No suscrito",
        description: "Suscríbete primero para recibir notificaciones",
        variant: "destructive"
      });
      return false;
    }

    try {
      await pushNotificationService.sendTestNotification();
      toast({
        title: "🧪 Notificación enviada",
        description: "Deberías ver una notificación de prueba",
        variant: "default"
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
      toast({
        title: "❌ Error enviando notificación",
        description: errorMessage,
        variant: "destructive"
      });
      return false;
    }
  }, [state.isSubscribed, toast]);

  // 📦 NOTIFICACIONES ESPECÍFICAS DEL INVENTARIO
  const notifyLowStock = useCallback(async (product: { name: string; stock: number; minimum: number }) => {
    if (!state.isSubscribed) return false;
    
    try {
      await pushNotificationService.notifyLowStock(product);
      return true;
    } catch (error) {
      console.error('Error enviando notificación de stock bajo:', error);
      return false;
    }
  }, [state.isSubscribed]);

  const notifyExpiryAlert = useCallback(async (product: { name: string; days_until_expiry: number }) => {
    if (!state.isSubscribed) return false;
    
    try {
      await pushNotificationService.notifyExpiryAlert(product);
      return true;
    } catch (error) {
      console.error('Error enviando alerta de vencimiento:', error);
      return false;
    }
  }, [state.isSubscribed]);

  const notifyReceptionPending = useCallback(async (reception: { id: string; supplier: string; items_count: number }) => {
    if (!state.isSubscribed) return false;
    
    try {
      await pushNotificationService.notifyReceptionPending(reception);
      return true;
    } catch (error) {
      console.error('Error enviando notificación de recepción:', error);
      return false;
    }
  }, [state.isSubscribed]);

  // 🔄 ALTERNAR SUSCRIPCIÓN
  const toggleSubscription = useCallback(async () => {
    if (state.isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe();
    }
  }, [state.isSubscribed, subscribe, unsubscribe]);

  // 🚀 INICIALIZACIÓN
  useEffect(() => {
    updateState();
  }, [updateState]);

  // 📊 CALCULAR ESTADO PARA UI
  const canRequest = state.isSupported && state.permission === 'default';
  const canSubscribe = state.isSupported && state.permission === 'granted' && !state.isSubscribed;
  const canUnsubscribe = state.isSupported && state.isSubscribed;
  const isBlocked = state.permission === 'denied';

  return {
    // Estado
    ...state,
    
    // Estados derivados
    canRequest,
    canSubscribe,
    canUnsubscribe,
    isBlocked,
    
    // Acciones principales
    requestPermission,
    subscribe,
    unsubscribe,
    toggleSubscription,
    
    // Utilidades
    sendTestNotification,
    updateState,
    
    // Notificaciones específicas
    notifyLowStock,
    notifyExpiryAlert,
    notifyReceptionPending
  };
};
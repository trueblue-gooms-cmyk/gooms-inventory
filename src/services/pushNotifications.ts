// Servicio de notificaciones push PWA
// Compatible con Lovable - Gestión completa de push notifications
import { supabase } from '../integrations/supabase/client';

interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: unknown;
  actions?: Array<{
    action: string;
    title: string;
    icon?: string;
  }>;
  tag?: string;
  requireInteraction?: boolean;
}

interface PushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

class PushNotificationService {
  private vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  private swRegistration: ServiceWorkerRegistration | null = null;

  // 🚀 INICIALIZAR SERVICIO
  async init(swRegistration: ServiceWorkerRegistration): Promise<void> {
    this.swRegistration = swRegistration;
    
    if (!this.isSupported()) {
      console.warn('⚠️ Push notifications no soportadas en este navegador');
      return;
    }

    // Configurar listeners para notificaciones
    this.setupNotificationListeners();
    
    console.log('✅ Servicio de push notifications inicializado');
  }

  // 🔍 VERIFICAR SOPORTE
  isSupported(): boolean {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  // 📱 SOLICITAR PERMISOS
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.isSupported()) {
      throw new Error('Push notifications no soportadas');
    }

    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos');
      // Auto-suscribir cuando se conceden permisos
      await this.subscribe();
    } else if (permission === 'denied') {
      console.log('❌ Permisos de notificación denegados');
    } else {
      console.log('⏳ Permisos de notificación pendientes');
    }

    return permission;
  }

  // 📝 SUSCRIBIRSE A PUSH NOTIFICATIONS
  async subscribe(): Promise<PushSubscription | null> {
    if (!this.swRegistration) {
      throw new Error('Service Worker no registrado');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Permisos de notificación no concedidos');
    }

    try {
      // Verificar si ya existe una suscripción
      let subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (!subscription) {
        // Crear nueva suscripción
        subscription = await this.swRegistration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey || '')
        });

        console.log('📝 Nueva suscripción push creada');
      } else {
        console.log('📝 Suscripción push existente encontrada');
      }

      // Guardar suscripción en Supabase
      await this.saveSubscriptionToServer(subscription);
      
      return subscription;

    } catch (error) {
      console.error('❌ Error suscribiendo a push notifications:', error);
      throw error;
    }
  }

  // 🗑️ DESUSCRIBIRSE
  async unsubscribe(): Promise<boolean> {
    if (!this.swRegistration) {
      throw new Error('Service Worker no registrado');
    }

    try {
      const subscription = await this.swRegistration.pushManager.getSubscription();
      
      if (subscription) {
        const success = await subscription.unsubscribe();
        
        if (success) {
          // Remover de servidor
          await this.removeSubscriptionFromServer(subscription);
          console.log('✅ Desuscripción exitosa');
        }
        
        return success;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error desuscribiendo:', error);
      return false;
    }
  }

  // 💾 GUARDAR SUSCRIPCIÓN EN SERVIDOR
  private async saveSubscriptionToServer(subscription: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuario no autenticado');
      }

      const subscriptionData: PushSubscriptionData = {
        endpoint: subscription.endpoint,
        keys: {
          p256dh: this.arrayBufferToBase64(subscription.getKey('p256dh')!),
          auth: this.arrayBufferToBase64(subscription.getKey('auth')!)
        }
      };

      // Guardar en tabla de suscripciones (asumiendo que existe)
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionData.endpoint,
          p256dh_key: subscriptionData.keys.p256dh,
          auth_key: subscriptionData.keys.auth,
          user_agent: navigator.userAgent,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,endpoint'
        });

      if (error) {
        console.error('❌ Error guardando suscripción:', error);
        throw error;
      }

      console.log('✅ Suscripción guardada en servidor');
    } catch (error) {
      console.error('❌ Error guardando suscripción en servidor:', error);
      throw error;
    }
  }

  // 🗑️ REMOVER SUSCRIPCIÓN DEL SERVIDOR
  private async removeSubscriptionFromServer(subscription: PushSubscription): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) return;

      const { error } = await supabase
        .from('push_subscriptions')
        .delete()
        .eq('user_id', user.id)
        .eq('endpoint', subscription.endpoint);

      if (error) {
        console.error('❌ Error removiendo suscripción:', error);
      } else {
        console.log('✅ Suscripción removida del servidor');
      }
    } catch (error) {
      console.error('❌ Error removiendo suscripción del servidor:', error);
    }
  }

  // 📨 ENVIAR NOTIFICACIÓN LOCAL
  async showLocalNotification(payload: NotificationPayload): Promise<void> {
    if (!this.swRegistration) {
      throw new Error('Service Worker no registrado');
    }

    if (Notification.permission !== 'granted') {
      throw new Error('Permisos de notificación no concedidos');
    }

    const options: NotificationOptions = {
      body: payload.body,
      icon: payload.icon || '/icons/icon-192x192.png',
      badge: payload.badge || '/icons/icon-72x72.png',
      data: payload.data || {},
      actions: payload.actions || [],
      tag: payload.tag,
      requireInteraction: payload.requireInteraction || false,
      timestamp: Date.now()
    };

    await this.swRegistration.showNotification(payload.title, options);
    console.log('📨 Notificación local mostrada:', payload.title);
  }

  // 🔔 CONFIGURAR LISTENERS
  private setupNotificationListeners(): void {
    if (!this.swRegistration) return;

    // Escuchar clicks en notificaciones
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLICK') {
        this.handleNotificationClick(event.data.payload);
      }
    });

    // Escuchar cierres de notificaciones
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'NOTIFICATION_CLOSE') {
        this.handleNotificationClose(event.data.payload);
      }
    });
  }

  // 🖱️ MANEJAR CLICK EN NOTIFICACIÓN
  private handleNotificationClick(data: unknown): void {
    console.log('🖱️ Notificación clickeada:', data);
    
    // Lógica personalizada según el tipo de notificación
    if (data?.action === 'open_inventory') {
      window.location.href = '/inventory';
    } else if (data?.action === 'open_alerts') {
      window.location.href = '/inventory?tab=expiry';
    } else if (data?.url) {
      window.location.href = data.url;
    }
  }

  // ❌ MANEJAR CIERRE DE NOTIFICACIÓN
  private handleNotificationClose(data: unknown): void {
    console.log('❌ Notificación cerrada:', data);
    // Lógica adicional si es necesaria
  }

  // 📊 OBTENER ESTADO DE SUSCRIPCIÓN
  async getSubscriptionStatus(): Promise<{
    isSupported: boolean;
    permission: NotificationPermission;
    isSubscribed: boolean;
    subscription: PushSubscription | null;
  }> {
    const isSupported = this.isSupported();
    const permission = isSupported ? Notification.permission : 'denied';
    
    let isSubscribed = false;
    let subscription: PushSubscription | null = null;

    if (this.swRegistration && permission === 'granted') {
      subscription = await this.swRegistration.pushManager.getSubscription();
      isSubscribed = !!subscription;
    }

    return {
      isSupported,
      permission,
      isSubscribed,
      subscription
    };
  }

  // 🔄 UTILIDADES DE CONVERSIÓN
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  // 🧪 NOTIFICACIÓN DE PRUEBA
  async sendTestNotification(): Promise<void> {
    await this.showLocalNotification({
      title: '🧪 Notificación de Prueba',
      body: 'Las notificaciones están funcionando correctamente en Gooms Inventory',
      icon: '/icons/icon-192x192.png',
      tag: 'test-notification',
      data: { type: 'test' },
      actions: [
        {
          action: 'open',
          title: '📱 Abrir App'
        },
        {
          action: 'dismiss',
          title: '❌ Descartar'
        }
      ]
    });
  }

  // 📋 NOTIFICACIONES PREDEFINIDAS PARA INVENTARIO
  async notifyLowStock(product: { name: string; stock: number; minimum: number }): Promise<void> {
    await this.showLocalNotification({
      title: '⚠️ Stock Bajo',
      body: `${product.name}: Solo quedan ${product.stock} unidades (mínimo: ${product.minimum})`,
      tag: `low-stock-${product.name}`,
      data: { type: 'low_stock', product },
      actions: [
        {
          action: 'open_inventory',
          title: '📦 Ver Inventario'
        }
      ]
    });
  }

  async notifyExpiryAlert(product: { name: string; days_until_expiry: number }): Promise<void> {
    await this.showLocalNotification({
      title: '🚨 Producto por Vencer',
      body: `${product.name} vence en ${product.days_until_expiry} días`,
      tag: `expiry-${product.name}`,
      data: { type: 'expiry_alert', product },
      actions: [
        {
          action: 'open_alerts',
          title: '🚨 Ver Alertas'
        }
      ]
    });
  }

  async notifyReceptionPending(reception: { id: string; supplier: string; items_count: number }): Promise<void> {
    await this.showLocalNotification({
      title: '📦 Recepción Pendiente',
      body: `Recepción de ${reception.supplier}: ${reception.items_count} productos esperando`,
      tag: `reception-${reception.id}`,
      data: { type: 'reception_pending', reception },
      actions: [
        {
          action: 'open_reception',
          title: '📋 Procesar'
        }
      ]
    });
  }
}

// Exportar instancia singleton
export const pushNotificationService = new PushNotificationService();
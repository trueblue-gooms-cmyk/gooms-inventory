// Mock Push Notifications Service - aligned with usePushNotifications hook
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
  private vapidPublicKey = 'mock-vapid-key';
  private swRegistration: ServiceWorkerRegistration | null = null;

  async init(swRegistration: ServiceWorkerRegistration): Promise<void> {
    this.swRegistration = swRegistration;
    console.log('✅ Mock push notifications service initialized');
  }

  isSupported(): boolean {
    return 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
  }

  getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  async getSubscriptionStatus(): Promise<{ isSupported: boolean; permission: NotificationPermission; isSubscribed: boolean }>{
    return {
      isSupported: this.isSupported(),
      permission: this.getPermissionStatus(),
      isSubscribed: false,
    };
  }

  async requestPermission(): Promise<NotificationPermission> {
    if (!('Notification' in window)) return 'denied';
    try {
      const permission = await Notification.requestPermission();
      return permission;
    } catch {
      return 'denied';
    }
  }

  async subscribe(): Promise<PushSubscriptionData | null> {
    console.log('Mock subscribing to push notifications');
    return {
      endpoint: 'https://mock.endpoint',
      keys: { p256dh: 'mock', auth: 'mock' },
    };
  }

  async unsubscribe(): Promise<boolean> {
    console.log('Mock unsubscribing from push notifications');
    return true;
  }

  async sendTestNotification(): Promise<void> {
    console.log('Mock sending test notification');
    if (this.getPermissionStatus() === 'granted') {
      new Notification('🔔 Notificación de Prueba', {
        body: 'Las notificaciones están funcionando correctamente',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
      });
    }
  }

  async notifyLowStock(product: { name: string; stock: number; minimum: number }): Promise<void> {
    console.log('Mock low stock notification', product);
  }

  async notifyExpiryAlert(product: { name: string; days_until_expiry: number }): Promise<void> {
    console.log('Mock expiry alert notification', product);
  }

  async notifyReceptionPending(reception: { id: string; supplier: string; items_count: number }): Promise<void> {
    console.log('Mock reception pending notification', reception);
  }
}

export const pushNotificationService = new PushNotificationService();
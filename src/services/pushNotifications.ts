// Mock Push Notifications Service - simplified to avoid table conflicts
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

  // Mock implementation to avoid database conflicts
  async init(swRegistration: ServiceWorkerRegistration): Promise<void> {
    this.swRegistration = swRegistration;
    console.log('✅ Mock push notifications service initialized');
  }

  isSupported(): boolean {
    return 'Notification' in window && 
           'serviceWorker' in navigator && 
           'PushManager' in window;
  }

  async requestPermission(): Promise<boolean> {
    console.log('Mock requesting notification permission');
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }
    return false;
  }

  async subscribe(userId: string): Promise<boolean> {
    console.log('Mock subscribing to push notifications:', userId);
    return true;
  }

  async unsubscribe(userId: string): Promise<boolean> {
    console.log('Mock unsubscribing from push notifications:', userId);
    return true;
  }

  async sendNotification(userIds: string[], payload: NotificationPayload): Promise<void> {
    console.log('Mock sending notification:', { userIds, payload });
  }

  async sendToAll(payload: NotificationPayload): Promise<void> {
    console.log('Mock sending notification to all:', payload);
  }

  async testNotification(): Promise<void> {
    console.log('Mock sending test notification');
    
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('🔔 Notificación de Prueba', {
        body: 'Las notificaciones están funcionando correctamente',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png'
      });
    }
  }

  private setupNotificationListeners(): void {
    console.log('Setting up mock notification listeners');
  }

  getPermissionStatus(): NotificationPermission {
    return 'Notification' in window ? Notification.permission : 'denied';
  }

  async getSubscriptionStatus(userId: string): Promise<string> {
    console.log('Mock getting subscription status:', userId);
    return 'active';
  }

  async sendTestNotification(): Promise<void> {
    console.log('Mock sending test notification');
    await this.testNotification();
  }

  async notifyLowStock(locationId: string, products: any[]): Promise<void> {
    console.log('Mock notifying low stock:', { locationId, products });
  }

  async notifyExpiryAlert(locationId: string, products: any[]): Promise<void> {
    console.log('Mock notifying expiry alert:', { locationId, products });
  }

  async notifyReceptionPending(locationId: string, reception: any): Promise<void> {
    console.log('Mock notifying reception pending:', { locationId, reception });
  }
}

export const pushNotificationService = new PushNotificationService();
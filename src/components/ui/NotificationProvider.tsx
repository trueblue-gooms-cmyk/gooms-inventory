import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';

export function NotificationProvider() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  useEffect(() => {
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      const options = {
        id: latest.id,
        duration: latest.duration,
        onDismiss: () => removeNotification(latest.id),
      };

      switch (latest.type) {
        case 'success':
          toast.success(latest.title, { ...options, description: latest.message });
          break;
        case 'error':
          toast.error(latest.title, { ...options, description: latest.message });
          break;
        case 'warning':
          toast.warning(latest.title, { ...options, description: latest.message });
          break;
        case 'info':
          toast.info(latest.title, { ...options, description: latest.message });
          break;
      }
    }
  }, [notifications, removeNotification]);

  return <Toaster position="bottom-left" richColors closeButton />;
}
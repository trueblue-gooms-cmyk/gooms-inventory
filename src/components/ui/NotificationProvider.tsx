import { useEffect } from 'react';
import { Toaster, toast } from 'sonner';
import { useAppStore } from '@/stores/useAppStore';
import { CheckCircle2, XCircle, AlertCircle, Info } from 'lucide-react';

export function NotificationProvider() {
  const notifications = useAppStore((state) => state.notifications);
  const removeNotification = useAppStore((state) => state.removeNotification);

  useEffect(() => {
    // Watch for new notifications
    if (notifications.length > 0) {
      const latest = notifications[notifications.length - 1];
      
      const options = {
        id: latest.id,
        duration: latest.duration,
        onDismiss: () => removeNotification(latest.id),
        onAutoClose: () => removeNotification(latest.id),
      };

      switch (latest.type) {
        case 'success':
          toast.success(latest.title, {
            ...options,
            description: latest.message,
            icon: <CheckCircle2 className="w-5 h-5" />,
          });
          break;
        case 'error':
          toast.error(latest.title, {
            ...options,
            description: latest.message,
            icon: <XCircle className="w-5 h-5" />,
          });
          break;
        case 'warning':
          toast.warning(latest.title, {
            ...options,
            description: latest.message,
            icon: <AlertCircle className="w-5 h-5" />,
          });
          break;
        case 'info':
          toast.info(latest.title, {
            ...options,
            description: latest.message,
            icon: <Info className="w-5 h-5" />,
          });
          break;
      }
    }
  }, [notifications, removeNotification]);

  return (
    <Toaster
      position="bottom-left"
      expand={false}
      richColors
      closeButton
      duration={5000}
      toastOptions={{
        style: {
          background: 'white',
          border: '1px solid #e5e7eb',
          padding: '16px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        },
        className: 'gooms-toast',
      }}
    />
  );
}

// Helper hook for using notifications in components
export function useNotification() {
  const addNotification = useAppStore((state) => state.addNotification);
  
  return {
    success: (title: string, message?: string) => 
      addNotification({ type: 'success', title, message }),
    error: (title: string, message?: string) => 
      addNotification({ type: 'error', title, message }),
    warning: (title: string, message?: string) => 
      addNotification({ type: 'warning', title, message }),
    info: (title: string, message?: string) => 
      addNotification({ type: 'info', title, message }),
  };
}
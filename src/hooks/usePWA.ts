// Hook personalizado para gestión PWA - Compatible con Lovable
// Maneja instalación, actualizaciones y estado offline
import { useState, useEffect } from 'react';
import { useToast } from './use-toast';
import { pushNotificationService } from '../services/pushNotifications';

interface PWAInstallEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface PWAState {
  isInstallable: boolean;
  isInstalled: boolean;
  isOnline: boolean;
  isUpdating: boolean;
  hasUpdate: boolean;
}

export const usePWA = () => {
  const [pwaState, setPWAState] = useState<PWAState>({
    isInstallable: false,
    isInstalled: false,
    isOnline: navigator.onLine,
    isUpdating: false,
    hasUpdate: false
  });

  const [deferredPrompt, setDeferredPrompt] = useState<PWAInstallEvent | null>(null);
  const [serviceWorker, setServiceWorker] = useState<ServiceWorkerRegistration | null>(null);
  const { toast } = useToast();

  // 🚀 REGISTRAR SERVICE WORKER
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      registerServiceWorker();
    }
  }, []);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      });

      setServiceWorker(registration);

      // Inicializar push notifications
      await pushNotificationService.init(registration);

      // Escuchar actualizaciones
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setPWAState(prev => ({ ...prev, hasUpdate: true }));
              toast({
                title: "🔄 Actualización disponible",
                description: "Nueva versión de la app lista para instalar"
              });
            }
          });
        }
      });

      console.log('✅ Service Worker registrado exitosamente');
      
      // Verificar si ya está instalado
      checkIfInstalled();

    } catch (error) {
      console.error('❌ Error registrando Service Worker:', error);
    }
  };

  // 📱 DETECTAR EVENTO DE INSTALACIÓN
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as PWAInstallEvent);
      setPWAState(prev => ({ ...prev, isInstallable: true }));
      
      // Mostrar toast automático (opcional)
      toast({
        title: "📱 Instalar App",
        description: "Gooms Inventory puede instalarse como app nativa",
        duration: 8000
      });
    };

    const handleAppInstalled = () => {
      setPWAState(prev => ({ ...prev, isInstalled: true, isInstallable: false }));
      setDeferredPrompt(null);
      toast({
        title: "🎉 ¡App instalada!",
        description: "Gooms Inventory se instaló correctamente"
      });
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [toast]);

  // 🌐 DETECTAR CAMBIOS DE CONECTIVIDAD
  useEffect(() => {
    const handleOnline = () => {
      setPWAState(prev => ({ ...prev, isOnline: true }));
      toast({
        title: "🌐 Conectado",
        description: "Conexión a internet restaurada",
        variant: "default"
      });
    };

    const handleOffline = () => {
      setPWAState(prev => ({ ...prev, isOnline: false }));
      toast({
        title: "📴 Sin conexión",
        description: "Modo offline activado. Datos locales disponibles.",
        variant: "destructive",
        duration: 5000
      });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [toast]);

  // 📱 VERIFICAR SI YA ESTÁ INSTALADO
  const checkIfInstalled = () => {
    // PWA está instalado si:
    // 1. Se ejecuta en standalone mode
    // 2. Display mode es standalone
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    const isInWebApk = 'matchMedia' in window && window.matchMedia('(display-mode: standalone)').matches;
    const isIOSStandalone = (window.navigator as any).standalone === true;
    
    const installed = isStandalone || isInWebApk || isIOSStandalone;
    setPWAState(prev => ({ ...prev, isInstalled: installed }));
  };

  // 🚀 INSTALAR PWA
  const installPWA = async () => {
    if (!deferredPrompt) {
      toast({
        title: "❌ No se puede instalar",
        description: "La instalación no está disponible en este momento",
        variant: "destructive"
      });
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('✅ Usuario aceptó la instalación');
      } else {
        console.log('❌ Usuario rechazó la instalación');
      }
      
      setDeferredPrompt(null);
      setPWAState(prev => ({ ...prev, isInstallable: false }));
    } catch (error) {
      console.error('❌ Error instalando PWA:', error);
      toast({
        title: "❌ Error de instalación",
        description: "No se pudo instalar la aplicación",
        variant: "destructive"
      });
    }
  };

  // 🔄 ACTUALIZAR APP
  const updateApp = async () => {
    if (!serviceWorker || !serviceWorker.waiting) {
      return;
    }

    setPWAState(prev => ({ ...prev, isUpdating: true }));

    try {
      // Enviar mensaje al service worker para actualizar
      serviceWorker.waiting.postMessage({ type: 'SKIP_WAITING' });
      
      // Escuchar cuando el nuevo SW toma control
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        toast({
          title: "✅ App actualizada",
          description: "Recargando para aplicar cambios...",
        });
        
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      });

    } catch (error) {
      console.error('❌ Error actualizando app:', error);
      setPWAState(prev => ({ ...prev, isUpdating: false }));
      toast({
        title: "❌ Error de actualización",
        description: "No se pudo actualizar la aplicación",
        variant: "destructive"
      });
    }
  };

  // 🔄 FORZAR SINCRONIZACIÓN
  const syncData = async () => {
    if (!serviceWorker || !pwaState.isOnline) {
      toast({
        title: "❌ No se puede sincronizar",
        description: "Sin conexión o Service Worker no disponible",
        variant: "destructive"
      });
      return;
    }

    try {
      // Background sync is optional and may not be available
      if ('sync' in serviceWorker) {
        await (serviceWorker as any).sync.register('inventory-sync');
      }
      toast({
        title: "🔄 Sincronización iniciada",
        description: "Los datos se están sincronizando en segundo plano"
      });
    } catch (error) {
      console.error('❌ Error sincronizando:', error);
      toast({
        title: "❌ Error de sincronización",
        description: "No se pudo iniciar la sincronización",
        variant: "destructive"
      });
    }
  };

  // 📊 OBTENER INFORMACIÓN DE CACHE
  const getCacheInfo = async () => {
    if (!('caches' in window)) return null;

    try {
      const cacheNames = await caches.keys();
      const cacheInfo = await Promise.all(
        cacheNames.map(async (name) => {
          const cache = await caches.open(name);
          const keys = await cache.keys();
          return {
            name,
            size: keys.length
          };
        })
      );
      return cacheInfo;
    } catch (error) {
      console.error('❌ Error obteniendo info de cache:', error);
      return null;
    }
  };

  // 🗑️ LIMPIAR CACHE
  const clearCache = async () => {
    if (!('caches' in window)) return;

    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      
      toast({
        title: "🗑️ Cache limpiado",
        description: "Todos los datos en cache han sido eliminados"
      });
    } catch (error) {
      console.error('❌ Error limpiando cache:', error);
      toast({
        title: "❌ Error limpiando cache",
        description: "No se pudo limpiar el cache",
        variant: "destructive"
      });
    }
  };

  return {
    // Estado
    ...pwaState,
    
    // Acciones
    installPWA,
    updateApp,
    syncData,
    getCacheInfo,
    clearCache,
    
    // Utilidades
    isSupported: 'serviceWorker' in navigator,
    canInstall: pwaState.isInstallable && !pwaState.isInstalled
  };
};
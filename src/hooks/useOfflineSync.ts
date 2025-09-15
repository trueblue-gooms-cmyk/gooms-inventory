// Hook personalizado para gestión de sincronización offline
// Compatible con Lovable - Integración con sistema de almacenamiento offline
import { useState, useEffect, useCallback } from 'react';
import { offlineStorage } from '../services/offlineStorage';
import { useToast } from './use-toast';

interface SyncState {
  isOnline: boolean;
  isSyncing: boolean;
  hasPendingActions: boolean;
  pendingCount: number;
  lastSync: number | null;
  syncProgress: number;
}

export const useOfflineSync = () => {
  const [syncState, setSyncState] = useState<SyncState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    hasPendingActions: false,
    pendingCount: 0,
    lastSync: null,
    syncProgress: 0
  });

  const { toast } = useToast();

  // 📊 ACTUALIZAR ESTADO DE SINCRONIZACIÓN
  const updateSyncState = useCallback(async () => {
    try {
      const status = await offlineStorage.getSyncStatus();
      setSyncState(prev => ({
        ...prev,
        hasPendingActions: status.hasPendingActions,
        pendingCount: status.pendingCount,
        lastSync: status.lastSync,
        isOnline: status.isOnline
      }));
    } catch (error) {
      console.error('❌ Error actualizando estado de sync:', error);
    }
  }, []);

  // 🔄 EJECUTAR SINCRONIZACIÓN MANUAL
  const syncNow = useCallback(async () => {
    if (!navigator.onLine) {
      toast({
        title: "📴 Sin conexión",
        description: "No se puede sincronizar sin conexión a internet",
        variant: "destructive"
      });
      return { success: 0, failed: 0 };
    }

    if (syncState.isSyncing) {
      toast({
        title: "⏳ Sincronización en progreso",
        description: "Ya hay una sincronización ejecutándose",
        variant: "default"
      });
      return { success: 0, failed: 0 };
    }

    setSyncState(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }));

    try {
      toast({
        title: "🔄 Iniciando sincronización",
        description: `Sincronizando ${syncState.pendingCount} acciones pendientes...`
      });

      // Simular progreso durante la sincronización
      const progressInterval = setInterval(() => {
        setSyncState(prev => ({
          ...prev,
          syncProgress: Math.min(prev.syncProgress + 10, 90)
        }));
      }, 200);

      const result = await offlineStorage.syncPendingActions();
      
      clearInterval(progressInterval);
      setSyncState(prev => ({ ...prev, syncProgress: 100 }));

      // Actualizar datos después de sincronizar
      await offlineStorage.preloadEssentialData();
      await updateSyncState();

      if (result.success > 0) {
        toast({
          title: "✅ Sincronización exitosa",
          description: `${result.success} acciones sincronizadas correctamente`
        });
      }

      if (result.failed > 0) {
        toast({
          title: "⚠️ Algunas acciones fallaron",
          description: `${result.failed} acciones no pudieron sincronizarse`,
          variant: "destructive"
        });
      }

      return result;

    } catch (error) {
      console.error('❌ Error durante sincronización:', error);
      toast({
        title: "❌ Error de sincronización",
        description: "No se pudo completar la sincronización",
        variant: "destructive"
      });
      return { success: 0, failed: 1 };

    } finally {
      setSyncState(prev => ({ 
        ...prev, 
        isSyncing: false, 
        syncProgress: 0 
      }));
    }
  }, [syncState.isSyncing, syncState.pendingCount, toast, updateSyncState]);

  // 📱 AGREGAR ACCIÓN OFFLINE
  const addOfflineAction = useCallback(async (
    type: 'inventory_movement' | 'product_update' | 'reception_create' | 'location_update',
    data: unknown
  ) => {
    try {
      const actionId = await offlineStorage.addPendingAction({ type, data });
      await updateSyncState();

      if (!navigator.onLine) {
        toast({
          title: "📝 Acción guardada",
          description: "La acción se sincronizará cuando recuperes la conexión",
          variant: "default"
        });
      } else {
        // Auto-sincronizar si estamos online
        setTimeout(() => syncNow(), 1000);
      }

      return actionId;
    } catch (error) {
      console.error('❌ Error guardando acción offline:', error);
      toast({
        title: "❌ Error guardando acción",
        description: "No se pudo guardar la acción para sincronización",
        variant: "destructive"
      });
      throw error;
    }
  }, [updateSyncState, toast, syncNow]);

  // 📦 OBTENER DATOS EN CACHÉ
  const getCachedData = useCallback(async (key: string) => {
    try {
      return await offlineStorage.getCachedData(key);
    } catch (error) {
      console.error(`❌ Error obteniendo datos en caché para ${key}:`, error);
      return null;
    }
  }, []);

  // 💾 PRECARGAR DATOS ESENCIALES
  const preloadData = useCallback(async () => {
    if (!navigator.onLine) return;

    try {
      await offlineStorage.preloadEssentialData();
      await updateSyncState();
      
      toast({
        title: "📦 Datos actualizados",
        description: "Datos esenciales descargados para uso offline"
      });
    } catch (error) {
      console.error('❌ Error precargando datos:', error);
      toast({
        title: "❌ Error actualizando datos",
        description: "No se pudieron descargar todos los datos",
        variant: "destructive"
      });
    }
  }, [updateSyncState, toast]);

  // 🌐 DETECTAR CAMBIOS DE CONECTIVIDAD
  useEffect(() => {
    const handleOnline = async () => {
      setSyncState(prev => ({ ...prev, isOnline: true }));
      
      // Auto-sincronizar cuando se recupera la conexión
      if (syncState.hasPendingActions) {
        setTimeout(() => {
          syncNow();
        }, 2000); // Esperar 2 segundos para estabilizar la conexión
      }
      
      // Precargar datos actualizados
      await preloadData();
    };

    const handleOffline = () => {
      setSyncState(prev => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [syncState.hasPendingActions, syncNow, preloadData]);

  // 🔄 ACTUALIZACIÓN PERIÓDICA DEL ESTADO
  useEffect(() => {
    const interval = setInterval(updateSyncState, 30000); // Cada 30 segundos
    updateSyncState(); // Ejecutar inmediatamente

    return () => clearInterval(interval);
  }, [updateSyncState]);

  // 🧹 LIMPIEZA PERIÓDICA DE DATOS OBSOLETOS
  useEffect(() => {
    const cleanupInterval = setInterval(async () => {
      try {
        await offlineStorage.cleanupOldData();
      } catch (error) {
        console.error('❌ Error limpiando datos obsoletos:', error);
      }
    }, 60 * 60 * 1000); // Cada hora

    return () => clearInterval(cleanupInterval);
  }, []);

  // 📊 CALCULAR TIEMPO DESDE ÚLTIMA SINCRONIZACIÓN
  const timeSinceLastSync = syncState.lastSync 
    ? Math.floor((Date.now() - syncState.lastSync) / 1000 / 60) // minutos
    : null;

  return {
    // Estado
    ...syncState,
    timeSinceLastSync,
    
    // Acciones
    syncNow,
    addOfflineAction,
    getCachedData,
    preloadData,
    
    // Utilidades
    canSync: syncState.isOnline && !syncState.isSyncing,
    needsSync: syncState.hasPendingActions && syncState.isOnline,
    isFullyOffline: !syncState.isOnline && syncState.hasPendingActions
  };
};
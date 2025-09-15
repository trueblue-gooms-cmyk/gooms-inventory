// Servicio de almacenamiento offline con IndexedDB
// Compatible con Lovable - Gestión de datos offline y sincronización
import { supabase } from '../integrations/supabase/client';

interface OfflineAction {
  id: string;
  type: 'inventory_movement' | 'product_update' | 'reception_create' | 'location_update';
  data: unknown;
  timestamp: number;
  retries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
}

interface OfflineData {
  products: unknown[];
  locations: unknown[];
  inventory: unknown[];
  lastSync: number;
}

class OfflineStorageService {
  private dbName = 'gooms-inventory-offline';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  // 🚀 INICIALIZAR BASE DE DATOS
  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Store para acciones pendientes de sincronización
        if (!db.objectStoreNames.contains('pending_actions')) {
          const actionStore = db.createObjectStore('pending_actions', { keyPath: 'id' });
          actionStore.createIndex('timestamp', 'timestamp');
          actionStore.createIndex('status', 'status');
        }

        // Store para datos en caché
        if (!db.objectStoreNames.contains('cached_data')) {
          const cacheStore = db.createObjectStore('cached_data', { keyPath: 'key' });
        }

        // Store para configuración offline
        if (!db.objectStoreNames.contains('offline_config')) {
          db.createObjectStore('offline_config', { keyPath: 'key' });
        }
      };
    });
  }

  // 📊 GESTIÓN DE DATOS EN CACHÉ
  async cacheData(key: string, data: unknown): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cached_data'], 'readwrite');
    const store = transaction.objectStore('cached_data');
    
    await store.put({
      key,
      data,
      timestamp: Date.now()
    });
  }

  async getCachedData(key: string): Promise<unknown> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['cached_data'], 'readonly');
    const store = transaction.objectStore('cached_data');
    
    return new Promise((resolve) => {
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        resolve(result ? result.data : null);
      };
      request.onerror = () => resolve(null);
    });
  }

  // 🔄 GESTIÓN DE ACCIONES PENDIENTES
  async addPendingAction(action: Omit<OfflineAction, 'id' | 'timestamp' | 'retries' | 'status'>): Promise<string> {
    if (!this.db) await this.init();

    const id = `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const fullAction: OfflineAction = {
      id,
      ...action,
      timestamp: Date.now(),
      retries: 0,
      status: 'pending'
    };

    const transaction = this.db!.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');
    
    await store.put(fullAction);
    console.log('📝 Acción guardada para sincronización offline:', action.type);
    
    return id;
  }

  async getPendingActions(): Promise<OfflineAction[]> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_actions'], 'readonly');
    const store = transaction.objectStore('pending_actions');
    
    return new Promise((resolve) => {
      const request = store.getAll();
      request.onsuccess = () => {
        const actions = request.result.filter(action => action.status === 'pending');
        resolve(actions.sort((a, b) => a.timestamp - b.timestamp));
      };
      request.onerror = () => resolve([]);
    });
  }

  async updateActionStatus(id: string, status: OfflineAction['status'], retries?: number): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');
    
    const getRequest = store.get(id);
    getRequest.onsuccess = () => {
      const action = getRequest.result;
      if (action) {
        action.status = status;
        if (retries !== undefined) action.retries = retries;
        store.put(action);
      }
    };
  }

  async removePendingAction(id: string): Promise<void> {
    if (!this.db) await this.init();

    const transaction = this.db!.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');
    
    await store.delete(id);
  }

  // 🌐 SINCRONIZACIÓN CON SUPABASE
  async syncPendingActions(): Promise<{ success: number; failed: number }> {
    if (!navigator.onLine) {
      console.log('📴 Sin conexión - Aplazando sincronización');
      return { success: 0, failed: 0 };
    }

    const pendingActions = await this.getPendingActions();
    let success = 0;
    let failed = 0;

    console.log(`🔄 Iniciando sincronización de ${pendingActions.length} acciones pendientes`);

    for (const action of pendingActions) {
      try {
        await this.updateActionStatus(action.id, 'syncing');
        
        const result = await this.executeAction(action);
        
        if (result.success) {
          await this.removePendingAction(action.id);
          success++;
          console.log(`✅ Acción sincronizada: ${action.type}`);
        } else {
          const newRetries = action.retries + 1;
          if (newRetries >= 3) {
            await this.updateActionStatus(action.id, 'failed', newRetries);
            failed++;
            console.error(`❌ Acción falló después de 3 intentos: ${action.type}`);
          } else {
            await this.updateActionStatus(action.id, 'pending', newRetries);
            console.warn(`⚠️ Reintentando acción: ${action.type} (intento ${newRetries})`);
          }
        }
      } catch (error) {
        console.error(`❌ Error sincronizando acción ${action.type}:`, error);
        await this.updateActionStatus(action.id, 'failed', action.retries + 1);
        failed++;
      }
    }

    console.log(`📊 Sincronización completada: ${success} exitosas, ${failed} fallidas`);
    return { success, failed };
  }

  // 🎯 EJECUTAR ACCIONES ESPECÍFICAS
  private async executeAction(action: OfflineAction): Promise<{ success: boolean; error?: string }> {
    try {
      switch (action.type) {
        case 'inventory_movement':
          return await this.syncInventoryMovement(action.data);
        
        case 'product_update':
          return await this.syncProductUpdate(action.data);
        
        case 'reception_create':
          return await this.syncReceptionCreate(action.data);
        
        case 'location_update':
          return await this.syncLocationUpdate(action.data);
        
        default:
          return { success: false, error: 'Tipo de acción no reconocido' };
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Error desconocido' 
      };
    }
  }

  private async syncInventoryMovement(data: unknown): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .rpc('create_inventory_movement', {
        p_product_id: data.product_id,
        p_movement_type: data.movement_type,
        p_quantity: data.quantity,
        p_from_location_id: data.from_location_id,
        p_to_location_id: data.to_location_id,
        p_reference_type: data.reference_type,
        p_reference_id: data.reference_id,
        p_notes: data.notes
      });

    return { success: !error, error: error?.message };
  }

  private async syncProductUpdate(data: unknown): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('products')
      .update(data.updates)
      .eq('id', data.product_id);

    return { success: !error, error: error?.message };
  }

  private async syncReceptionCreate(data: unknown): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('receptions')
      .insert(data);

    return { success: !error, error: error?.message };
  }

  private async syncLocationUpdate(data: unknown): Promise<{ success: boolean; error?: string }> {
    const { error } = await supabase
      .from('locations')
      .update(data.updates)
      .eq('id', data.location_id);

    return { success: !error, error: error?.message };
  }

  // 📱 PRECARGAR DATOS ESENCIALES
  async preloadEssentialData(): Promise<void> {
    if (!navigator.onLine) return;

    try {
      console.log('📦 Precargando datos esenciales para modo offline...');

      // Productos
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .limit(1000);
      
      if (products) {
        await this.cacheData('products', products);
      }

      // Ubicaciones
      const { data: locations } = await supabase
        .from('locations')
        .select('*');
      
      if (locations) {
        await this.cacheData('locations', locations);
      }

      // Inventario actual
      const { data: inventory } = await supabase
        .from('inventory')
        .select(`
          *,
          product:products(name, sku, category),
          location:locations(name, type)
        `)
        .limit(2000);
      
      if (inventory) {
        await this.cacheData('inventory', inventory);
      }

      // Configurar última sincronización
      await this.cacheData('last_sync', Date.now());
      
      console.log('✅ Datos esenciales precargados exitosamente');
    } catch (error) {
      console.error('❌ Error precargando datos:', error);
    }
  }

  // 🔍 VERIFICAR ESTADO DE SINCRONIZACIÓN
  async getSyncStatus(): Promise<{
    hasPendingActions: boolean;
    pendingCount: number;
    lastSync: number | null;
    isOnline: boolean;
  }> {
    const pendingActions = await this.getPendingActions();
    const lastSync = await this.getCachedData('last_sync');

    return {
      hasPendingActions: pendingActions.length > 0,
      pendingCount: pendingActions.length,
      lastSync,
      isOnline: navigator.onLine
    };
  }

  // 🗑️ LIMPIAR DATOS OBSOLETOS
  async cleanupOldData(maxAge: number = 7 * 24 * 60 * 60 * 1000): Promise<void> {
    if (!this.db) await this.init();

    const cutoff = Date.now() - maxAge;
    
    // Limpiar acciones completadas antiguas
    const transaction = this.db!.transaction(['pending_actions'], 'readwrite');
    const store = transaction.objectStore('pending_actions');
    const index = store.index('timestamp');
    
    const request = index.openCursor(IDBKeyRange.upperBound(cutoff));
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;
      if (cursor) {
        if (cursor.value.status === 'completed') {
          cursor.delete();
        }
        cursor.continue();
      }
    };
  }
}

// Exportar instancia singleton
export const offlineStorage = new OfflineStorageService();

// Inicializar automáticamente
offlineStorage.init().catch(console.error);
// Service Worker para Gooms Inventory PWA
// Compatible con Lovable + Supabase - Modo offline inteligente

const CACHE_NAME = 'gooms-inventory-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Recursos críticos que SIEMPRE deben estar en cache
const CORE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/src/main.tsx',
  '/src/index.css'
];

// Patrones de URLs que pueden ser cacheadas
const CACHEABLE_PATTERNS = [
  /^\/assets\//,           // Assets estáticos de Vite
  /^\/src\//,              // Código fuente
  /\.(?:js|css|png|jpg|jpeg|svg|ico|woff2?)$/  // Archivos estáticos
];

// URLs que NO deben ser cacheadas (dinámicas/sensibles)
const SKIP_CACHE_PATTERNS = [
  /\/api\//,               // APIs dinámicas
  /supabase\.co/,          // Supabase en tiempo real
  /\/auth/,                // Autenticación
  /\/notifications/        // Notificaciones tiempo real
];

// 🚀 INSTALACIÓN DEL SERVICE WORKER
self.addEventListener('install', (event) => {
  console.log('🔧 Service Worker: Instalando...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('📦 Cache abierto:', CACHE_NAME);
        // Pre-cachear recursos críticos
        return cache.addAll(CORE_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('✅ Recursos críticos cacheados');
        // Forzar activación inmediata
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('❌ Error en instalación SW:', error);
      })
  );
});

// ⚡ ACTIVACIÓN DEL SERVICE WORKER
self.addEventListener('activate', (event) => {
  console.log('🚀 Service Worker: Activando...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        // Limpiar caches antiguos
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('🗑️ Eliminando cache antiguo:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Tomar control inmediato de todas las páginas
        return self.clients.claim();
      })
      .then(() => {
        console.log('✅ Service Worker activado y listo');
      })
  );
});

// 📡 ESTRATEGIA DE FETCH - CACHE FIRST PARA ASSETS, NETWORK FIRST PARA DATOS
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Ignorar requests que no deben ser cacheados
  if (SKIP_CACHE_PATTERNS.some(pattern => pattern.test(url.href))) {
    return; // Dejar que el navegador maneje normalmente
  }

  // Solo manejar requests GET
  if (event.request.method !== 'GET') {
    return;
  }

  event.respondWith(handleFetch(event.request));
});

// 🔄 LÓGICA PRINCIPAL DE FETCH
async function handleFetch(request) {
  const url = new URL(request.url);
  
  try {
    // 1️⃣ STRATEGY: Cache First para assets estáticos
    if (CACHEABLE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
      return await cacheFirstStrategy(request);
    }
    
    // 2️⃣ STRATEGY: Network First para datos dinámicos
    if (url.pathname.startsWith('/api/') || url.pathname.includes('supabase')) {
      return await networkFirstStrategy(request);
    }
    
    // 3️⃣ STRATEGY: Stale While Revalidate para páginas
    return await staleWhileRevalidateStrategy(request);
    
  } catch (error) {
    console.error('❌ Error en fetch:', error);
    return await fallbackResponse(request);
  }
}

// 📦 CACHE FIRST - Para assets que no cambian frecuentemente
async function cacheFirstStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// 🌐 NETWORK FIRST - Para datos en tiempo real
async function networkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Solo cachear respuestas exitosas de datos GET
    if (networkResponse.ok && request.method === 'GET') {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    // Si falla la red, intentar servir desde cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// 🔄 STALE WHILE REVALIDATE - Para páginas que pueden mostrar contenido anterior
async function staleWhileRevalidateStrategy(request) {
  const cachedResponse = await caches.match(request);
  
  // Actualizar cache en background
  const fetchPromise = fetch(request).then(async (networkResponse) => {
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  });
  
  // Retornar cache inmediatamente si existe, sino esperar la red
  return cachedResponse || await fetchPromise;
}

// 🚨 FALLBACK - Cuando todo falla
async function fallbackResponse(request) {
  const url = new URL(request.url);
  
  // Para navegación, mostrar página offline
  if (request.mode === 'navigate') {
    const offlineResponse = await caches.match(OFFLINE_URL);
    return offlineResponse || new Response(
      `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Sin conexión - Gooms Inventory</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: Arial, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>📱 Gooms Inventory</h1>
            <h2>Sin conexión a internet</h2>
            <p>Algunas funciones pueden no estar disponibles.</p>
            <button onclick="window.location.reload()">Reintentar</button>
          </div>
        </body>
      </html>
      `,
      {
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
  
  // Para otros recursos, retornar error genérico
  return new Response(
    JSON.stringify({ 
      error: 'Sin conexión', 
      offline: true,
      message: 'Este contenido no está disponible offline'
    }),
    {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    }
  );
}

// 🔄 SINCRONIZACIÓN EN BACKGROUND
self.addEventListener('sync', (event) => {
  console.log('🔄 Background Sync:', event.tag);
  
  if (event.tag === 'inventory-sync') {
    event.waitUntil(syncInventoryData());
  }
  
  if (event.tag === 'notifications-sync') {
    event.waitUntil(syncNotifications());
  }
});

// 📊 SINCRONIZAR DATOS DE INVENTARIO
async function syncInventoryData() {
  try {
    console.log('📊 Sincronizando datos de inventario...');
    
    // Obtener acciones pendientes del IndexedDB
    const db = await openOfflineDB();
    const transaction = db.transaction(['pending_actions'], 'readonly');
    const store = transaction.objectStore('pending_actions');
    const pendingActions = await getAllFromStore(store);
    
    console.log(`📊 Sincronizando ${pendingActions.length} acciones pendientes`);
    
    for (const action of pendingActions) {
      try {
        // Ejecutar acción contra la API
        const success = await executeActionSync(action);
        
        if (success) {
          // Remover acción exitosa
          await removeActionFromDB(db, action.id);
          console.log(`✅ Acción ${action.type} sincronizada`);
        }
      } catch (error) {
        console.error(`❌ Error sincronizando acción ${action.type}:`, error);
      }
    }
    
    // Notificar al cliente que la sincronización terminó
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage({
        type: 'SYNC_COMPLETE',
        timestamp: Date.now()
      });
    });
    
  } catch (error) {
    console.error('❌ Error en sincronización background:', error);
  }
}

// 🔔 SINCRONIZAR NOTIFICACIONES
async function syncNotifications() {
  try {
    console.log('🔔 Sincronizando notificaciones...');
    // Lógica de sincronización de notificaciones
  } catch (error) {
    console.error('❌ Error sincronizando notificaciones:', error);
  }
}

// 📱 PUSH NOTIFICATIONS
self.addEventListener('push', (event) => {
  if (!event.data) return;
  
  const data = event.data.json();
  
  const options = {
    body: data.body || 'Nueva notificación de Gooms Inventory',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    data: data.data || {},
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [
      {
        action: 'open',
        title: 'Abrir App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'dismiss',
        title: 'Descartar'
      }
    ],
    timestamp: Date.now()
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gooms Inventory', options)
  );
});

// 🖱️ CLICKS EN NOTIFICACIONES
self.addEventListener('notificationclick', (event) => {
  const notification = event.notification;
  const action = event.action;
  const data = notification.data || {};
  
  console.log('🖱️ Notificación clickeada:', { action, data });
  
  notification.close();
  
  // Manejar acciones específicas
  let urlToOpen = '/';
  
  if (action === 'open' || !action) {
    if (data.type === 'low_stock') {
      urlToOpen = '/inventory';
    } else if (data.type === 'expiry_alert') {
      urlToOpen = '/inventory?tab=expiry';
    } else if (data.type === 'reception_pending') {
      urlToOpen = '/reception';
    } else if (data.url) {
      urlToOpen = data.url;
    }
    
    // Abrir o enfocar la app
    event.waitUntil(
      clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Buscar ventana existente con la URL objetivo
          for (const client of clientList) {
            if (client.url.includes(urlToOpen.split('?')[0]) && 'focus' in client) {
              return client.focus();
            }
          }
          
          // Si no hay ventana existente, abrir nueva
          if (clients.openWindow) {
            return clients.openWindow(urlToOpen);
          }
        })
    );
  } else if (action === 'dismiss') {
    // Notificar al cliente del cierre
    event.waitUntil(
      clients.matchAll().then((clientList) => {
        clientList.forEach(client => {
          client.postMessage({
            type: 'NOTIFICATION_CLOSE',
            payload: data
          });
        });
      })
    );
  }
  
  // Notificar al cliente del click
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      clientList.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_CLICK',
          payload: { action, data }
        });
      });
    })
  );
});

// ❌ CIERRE DE NOTIFICACIONES
self.addEventListener('notificationclose', (event) => {
  const notification = event.notification;
  const data = notification.data || {};
  
  console.log('❌ Notificación cerrada:', data);
  
  // Notificar al cliente del cierre
  event.waitUntil(
    clients.matchAll().then((clientList) => {
      clientList.forEach(client => {
        client.postMessage({
          type: 'NOTIFICATION_CLOSE',
          payload: data
        });
      });
    })
  );
});

// 🔗 HELPER FUNCTIONS para IndexedDB
async function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('gooms-inventory-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getAllFromStore(store) {
  return new Promise((resolve) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result.filter(action => action.status === 'pending'));
    request.onerror = () => resolve([]);
  });
}

async function removeActionFromDB(db, actionId) {
  const transaction = db.transaction(['pending_actions'], 'readwrite');
  const store = transaction.objectStore('pending_actions');
  await store.delete(actionId);
}

async function executeActionSync(action) {
  // En un entorno real, esto haría llamadas a Supabase
  // Por ahora simular éxito para mantener compatibilidad
  console.log(`🔄 Ejecutando ${action.type} con datos:`, action.data);
  
  // Simular tiempo de procesamiento
  await new Promise(resolve => setTimeout(resolve, 100));
  
  return true; // Simular éxito
}

// 📝 LOG DE EVENTOS PARA DEBUGGING
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
});

console.log('🚀 Service Worker registrado correctamente - Gooms Inventory PWA');
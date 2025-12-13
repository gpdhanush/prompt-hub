// Advanced PWA Service Worker with Multiple Caching Strategies
// Version: 1.0.0
const CACHE_VERSION = 'naethra-ems-v1.0.0';
const STATIC_CACHE = `${CACHE_VERSION}-static`;
const DYNAMIC_CACHE = `${CACHE_VERSION}-dynamic`;
const IMAGE_CACHE = `${CACHE_VERSION}-images`;
const API_CACHE = `${CACHE_VERSION}-api`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/assets/images/fav-icon.png',
  '/assets/images/logo.png',
  '/manifest.json',
];

// Cache size limits
const MAX_CACHE_SIZE = 50; // Maximum number of items in dynamic cache
const MAX_IMAGE_CACHE_SIZE = 30;
const MAX_API_CACHE_SIZE = 20;

// Cache duration (in milliseconds)
const CACHE_DURATION = {
  STATIC: 365 * 24 * 60 * 60 * 1000, // 1 year
  DYNAMIC: 7 * 24 * 60 * 60 * 1000, // 7 days
  IMAGE: 30 * 24 * 60 * 60 * 1000, // 30 days
  API: 5 * 60 * 1000, // 5 minutes
};

// Install event - Cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...', CACHE_VERSION);
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting(); // Activate immediately
      })
      .catch((error) => {
        console.error('[SW] Error caching static assets:', error);
      })
  );
});

// Activate event - Clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete old caches that don't match current version
            if (cacheName !== STATIC_CACHE && 
                cacheName !== DYNAMIC_CACHE && 
                cacheName !== IMAGE_CACHE && 
                cacheName !== API_CACHE &&
                cacheName.startsWith('naethra-ems-')) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control of all pages immediately
      })
  );
});

// Helper: Check if request is for an image
function isImageRequest(request) {
  return request.destination === 'image' || 
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i);
}

// Helper: Check if request is for an API call
function isAPIRequest(request) {
  return request.url.includes('/api/') || 
         request.url.includes('api.') ||
         request.method === 'POST' ||
         request.method === 'PUT' ||
         request.method === 'DELETE';
}

// Helper: Check if request should be cached
function shouldCache(request) {
  // Don't cache POST, PUT, DELETE requests
  if (['POST', 'PUT', 'DELETE'].includes(request.method)) {
    return false;
  }
  
  // Don't cache external resources (unless they're our CDN)
  const url = new URL(request.url);
  if (url.origin !== self.location.origin && 
      !url.hostname.includes('firebase') &&
      !url.hostname.includes('gstatic')) {
    return false;
  }
  
  return true;
}

// Helper: Limit cache size
async function limitCacheSize(cacheName, maxSize) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxSize) {
    // Delete oldest entries (simple FIFO)
    const keysToDelete = keys.slice(0, keys.length - maxSize);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
    console.log(`[SW] Cleaned ${keysToDelete.length} old entries from ${cacheName}`);
  }
}

// Helper: Clean expired cache entries
async function cleanExpiredCache(cacheName, maxAge) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  const now = Date.now();
  
  for (const key of keys) {
    const response = await cache.match(key);
    if (response) {
      const cachedDate = response.headers.get('sw-cached-date');
      if (cachedDate) {
        const age = now - parseInt(cachedDate);
        if (age > maxAge) {
          await cache.delete(key);
          console.log(`[SW] Removed expired cache entry: ${key.url}`);
        }
      }
    }
  }
}

// Network First Strategy - For API calls
async function networkFirst(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      // Add cache date header
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, modifiedResponse);
      await limitCacheSize(cacheName, MAX_API_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline.html');
      return offlinePage || new Response('Offline', { status: 503 });
    }
    
    throw error;
  }
}

// Cache First Strategy - For static assets
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      await cache.put(request, modifiedResponse);
      await limitCacheSize(cacheName, MAX_CACHE_SIZE);
    }
    
    return networkResponse;
  } catch (error) {
    console.error('[SW] Fetch failed:', error);
    throw error;
  }
}

// Stale While Revalidate Strategy - For images
async function staleWhileRevalidate(request, cacheName) {
  const cachedResponse = await caches.match(request);
  
  // Return cached version immediately
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.ok && shouldCache(request)) {
      const cache = caches.open(cacheName);
      const responseToCache = networkResponse.clone();
      
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-date', Date.now().toString());
      
      const modifiedResponse = new Response(responseToCache.body, {
        status: responseToCache.status,
        statusText: responseToCache.statusText,
        headers: headers
      });
      
      cache.then(c => c.put(request, modifiedResponse));
      limitCacheSize(cacheName, MAX_IMAGE_CACHE_SIZE);
    }
    
    return networkResponse;
  }).catch(() => {
    // Network failed, but we already returned cached version
    console.log('[SW] Background fetch failed, using cached version');
  });
  
  return cachedResponse || fetchPromise;
}

// Fetch event - Route requests to appropriate strategy
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Route to appropriate caching strategy
  if (isAPIRequest(request)) {
    // API calls: Network First
    event.respondWith(networkFirst(request, API_CACHE));
  } else if (isImageRequest(request)) {
    // Images: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
  } else if (STATIC_ASSETS.includes(url.pathname) || url.pathname === '/') {
    // Static assets: Cache First
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else {
    // Other resources: Network First with fallback
    event.respondWith(networkFirst(request, DYNAMIC_CACHE));
  }
});

// Background Sync - For offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);
  
  if (event.tag === 'sync-forms') {
    event.waitUntil(syncPendingForms());
  }
});

// Helper: Sync pending forms
async function syncPendingForms() {
  // This would sync any pending form submissions
  // Implementation depends on your app's needs
  console.log('[SW] Syncing pending forms...');
  
  // Example: Get pending items from IndexedDB and sync
  // const pendingItems = await getPendingItems();
  // await Promise.all(pendingItems.map(item => syncItem(item)));
}

// Push notification event (handled by Firebase messaging)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body || 'You have a new notification',
      icon: data.icon || '/assets/images/fav-icon.png',
      badge: '/assets/images/fav-icon.png',
      tag: data.tag || 'notification',
      data: data.data || {},
      requireInteraction: data.requireInteraction || false,
      actions: data.actions || [],
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title || 'Notification', options)
    );
  }
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then((clientList) => {
      // Check if there's already a window/tab open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window/tab
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-cache') {
    event.waitUntil(updateCache());
  }
});

async function updateCache() {
  console.log('[SW] Periodic cache update');
  // Clean expired entries
  await cleanExpiredCache(STATIC_CACHE, CACHE_DURATION.STATIC);
  await cleanExpiredCache(DYNAMIC_CACHE, CACHE_DURATION.DYNAMIC);
  await cleanExpiredCache(IMAGE_CACHE, CACHE_DURATION.IMAGE);
  await cleanExpiredCache(API_CACHE, CACHE_DURATION.API);
}

// Message event - Handle messages from main thread
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(DYNAMIC_CACHE).then((cache) => {
        return cache.addAll(event.data.urls);
      })
    );
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});

// Error handling
self.addEventListener('error', (event) => {
  console.error('[SW] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[SW] Unhandled rejection:', event.reason);
});

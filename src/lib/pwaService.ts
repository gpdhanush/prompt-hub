// PWA Service - Advanced PWA utilities
export class PWAService {
  private static registration: ServiceWorkerRegistration | null = null;

  // Register service worker
  static async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Workers are not supported');
      return null;
    }

    try {
      // Register main service worker
      const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      this.registration = registration;

      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              console.log('New service worker available');
            }
          });
        }
      });

      // Listen for controller change (service worker updated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('Service worker controller changed');
      });

      console.log('Service Worker registered:', registration.scope);
      return registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  // Unregister service worker
  static async unregister(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const result = await registration.unregister();
        console.log('Service Worker unregistered:', result);
        return result;
      }
      return false;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  // Update service worker
  static async update(): Promise<void> {
    if (!this.registration) {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        await registration.update();
      }
    } else {
      await this.registration.update();
    }
  }

  // Clear all caches
  static async clearCache(): Promise<void> {
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => caches.delete(cacheName))
      );
      console.log('All caches cleared');
    }
  }

  // Get cache size
  static async getCacheSize(): Promise<number> {
    if (!('caches' in window)) {
      return 0;
    }

    let totalSize = 0;
    const cacheNames = await caches.keys();

    for (const cacheName of cacheNames) {
      const cache = await caches.open(cacheName);
      const keys = await cache.keys();

      for (const key of keys) {
        const response = await cache.match(key);
        if (response) {
          const blob = await response.blob();
          totalSize += blob.size;
        }
      }
    }

    return totalSize;
  }

  // Format bytes to human readable
  static formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  // Check if app is installed
  static isInstalled(): boolean {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as any).standalone === true ||
      document.referrer.includes('android-app://')
    );
  }

  // Check if online
  static isOnline(): boolean {
    return navigator.onLine;
  }

  // Request persistent storage (for browsers that support it)
  static async requestPersistentStorage(): Promise<boolean> {
    if ('storage' in navigator && 'persist' in navigator.storage) {
      try {
        const isPersisted = await navigator.storage.persist();
        console.log('Persistent storage granted:', isPersisted);
        return isPersisted;
      } catch (error) {
        console.error('Error requesting persistent storage:', error);
        return false;
      }
    }
    return false;
  }

  // Get storage estimate
  static async getStorageEstimate(): Promise<{
    usage: number;
    quota: number;
    usageDetails?: any;
  } | null> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        return {
          usage: estimate.usage || 0,
          quota: estimate.quota || 0,
          usageDetails: estimate.usageDetails,
        };
      } catch (error) {
        console.error('Error getting storage estimate:', error);
        return null;
      }
    }
    return null;
  }

  // Send message to service worker
  static async sendMessage(message: any): Promise<void> {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(message);
    }
  }

  // Precache URLs
  static async precacheUrls(urls: string[]): Promise<void> {
    await this.sendMessage({
      type: 'CACHE_URLS',
      urls,
    });
  }
}

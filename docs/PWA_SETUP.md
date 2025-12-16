# Progressive Web App (PWA) - Advanced Configuration

## Overview

This application is now a fully-featured Progressive Web App (PWA) with advanced capabilities including:

- ✅ **Offline Support** - Works without internet connection
- ✅ **Install Prompt** - Users can install the app on their devices
- ✅ **Update Notifications** - Automatic update detection and prompts
- ✅ **Advanced Caching** - Multiple caching strategies for optimal performance
- ✅ **Background Sync** - Sync data when connection is restored
- ✅ **Push Notifications** - Real-time notifications (via Firebase)
- ✅ **App Shortcuts** - Quick access to common features
- ✅ **Standalone Mode** - Runs like a native app

## Features

### 1. Caching Strategies

The service worker uses different caching strategies based on content type:

- **Static Assets** (HTML, CSS, JS): Cache First
  - Fast loading, works offline
  - Updates when service worker updates

- **API Calls**: Network First
  - Always tries network first for fresh data
  - Falls back to cache when offline
  - Caches successful responses

- **Images**: Stale While Revalidate
  - Shows cached version immediately
  - Updates in background
  - Best user experience

- **Dynamic Content**: Network First with Fallback
  - Tries network, uses cache if offline
  - Shows offline page for navigation requests

### 2. Offline Support

- **Offline Page**: Custom offline page shown when connection is lost
- **Cached Resources**: Critical assets cached for offline use
- **Background Sync**: Queues actions when offline, syncs when online

### 3. Install Prompt

- **Smart Prompting**: Only shows when app is installable
- **Dismissible**: Users can dismiss and it won't show for 7 days
- **Install Button**: One-click install experience

### 4. Update Detection

- **Automatic Checks**: Checks for updates every minute
- **Update Prompt**: Shows notification when update is available
- **One-Click Update**: Users can update with a single click
- **Seamless Updates**: Updates without losing app state

### 5. Performance Optimizations

- **Cache Size Limits**: Prevents cache from growing too large
- **Expiration**: Automatic cleanup of expired cache entries
- **Efficient Strategies**: Uses best strategy for each resource type

## Installation

### For Users

1. **Visit the website** on a supported browser (Chrome, Edge, Safari, Firefox)
2. **Look for install prompt** (appears automatically on mobile or via browser menu on desktop)
3. **Click "Install"** or use browser's install option
4. **App installs** and appears on home screen/app launcher

### Browser Support

- ✅ Chrome/Edge (Android, Desktop)
- ✅ Safari (iOS 11.3+, macOS)
- ✅ Firefox (Android, Desktop)
- ✅ Samsung Internet
- ✅ Opera

## Configuration

### Manifest.json

Located at `/public/manifest.json`, contains:

- App name and description
- Icons (192x192, 512x512)
- Theme colors
- Display mode (standalone)
- Shortcuts for quick access
- Share target configuration

### Service Worker

Located at `/public/sw.js`, handles:

- Caching strategies
- Offline support
- Background sync
- Push notifications
- Cache management

### Offline Page

Located at `/public/offline.html`, shown when:

- User navigates while offline
- Network request fails
- Connection is lost

## Usage

### Install Prompt Component

The install prompt appears automatically when:
- App is installable
- User hasn't dismissed it in last 7 days
- App is not already installed

### Update Prompt Component

The update prompt appears when:
- New service worker is available
- User is on an older version

### PWA Hook

Use the `usePWA` hook in your components:

```typescript
import { usePWA } from '@/hooks/usePWA';

function MyComponent() {
  const { isInstalled, isOnline, install, updateServiceWorker } = usePWA();
  
  // Check if app is installed
  if (isInstalled) {
    // Show installed-specific UI
  }
  
  // Check online status
  if (!isOnline) {
    // Show offline indicator
  }
}
```

### PWA Service

Use the `PWAService` for advanced operations:

```typescript
import { PWAService } from '@/lib/pwaService';

// Get cache size
const size = await PWAService.getCacheSize();
console.log('Cache size:', PWAService.formatBytes(size));

// Clear cache
await PWAService.clearCache();

// Check if installed
if (PWAService.isInstalled()) {
  console.log('App is installed');
}

// Request persistent storage
await PWAService.requestPersistentStorage();
```

## Development

### Testing PWA Features

1. **Build the app**: `npm run build`
2. **Serve with HTTPS**: Use a local server with HTTPS (required for service workers)
3. **Test offline**: Use DevTools → Network → Offline
4. **Test install**: Use DevTools → Application → Manifest

### Service Worker Debugging

1. Open DevTools → Application → Service Workers
2. Check registration status
3. View cached resources
4. Test update flow
5. Check console for service worker logs

### Cache Management

- View caches: DevTools → Application → Cache Storage
- Clear caches: DevTools → Application → Clear Storage
- Or use: `PWAService.clearCache()`

## Advanced Features

### Background Sync

The service worker supports background sync for offline actions:

```javascript
// In your component
if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
  const registration = await navigator.serviceWorker.ready;
  // Register your sync tags here
  // Example: await registration.sync.register('sync-tasks');
}
```

### Push Notifications

Push notifications are handled via Firebase Cloud Messaging (FCM). See `docs/FCM_SETUP.md` for details.

### App Shortcuts

Shortcuts are defined in `manifest.json` and appear when:
- User long-presses app icon (Android)
- User right-clicks app icon (Desktop)
- User uses keyboard shortcuts

### Share Target

The app can receive shared content from other apps:

- Configured in `manifest.json`
- Handles shared URLs, text, and files
- Route: `/share` (implement in your app)

## Troubleshooting

### Service Worker Not Registering

1. Check browser console for errors
2. Ensure HTTPS (or localhost for development)
3. Check service worker file exists at `/sw.js`
4. Verify file is served with correct MIME type

### Install Prompt Not Showing

1. Check if app is already installed
2. Check if user dismissed it recently
3. Verify manifest.json is valid
4. Check browser support

### Cache Not Working

1. Check service worker is registered
2. Verify caching strategies in `sw.js`
3. Check cache storage in DevTools
4. Clear cache and re-register service worker

### Updates Not Detecting

1. Check service worker update interval
2. Verify new version is deployed
3. Check browser console for update events
4. Force update: `PWAService.update()`

## Best Practices

1. **Update Cache Version**: Change `CACHE_VERSION` in `sw.js` when deploying updates
2. **Test Offline**: Always test offline functionality before deploying
3. **Monitor Cache Size**: Regularly check and clean cache if needed
4. **User Communication**: Inform users about offline capabilities
5. **Performance**: Use appropriate caching strategies for each resource type

## Security

- Service workers only work over HTTPS (or localhost)
- Cache is isolated per origin
- No cross-origin caching without CORS
- User data is never cached without permission

## Performance Metrics

Monitor these metrics:

- **Cache Hit Rate**: Percentage of requests served from cache
- **Offline Availability**: How much of the app works offline
- **Update Frequency**: How often updates are detected
- **Install Rate**: Percentage of users who install the app

## Future Enhancements

Potential future features:

- [ ] Periodic background sync
- [ ] Web Share API integration
- [ ] File system access
- [ ] Web Bluetooth integration
- [ ] Advanced offline data sync
- [ ] Offline-first data strategy

## Resources

- [MDN: Progressive Web Apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps)
- [Web.dev: PWA](https://web.dev/progressive-web-apps/)
- [Service Worker API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Web App Manifest](https://developer.mozilla.org/en-US/docs/Web/Manifest)

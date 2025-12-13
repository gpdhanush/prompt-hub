# FCM Push Notifications - Troubleshooting Guide

## Issue: Notification Permission Not Requested

### Common Causes:

1. **Permission Already Set**
   - Browser remembers previous permission decision
   - Check browser settings: `chrome://settings/content/notifications` (Chrome) or `about:preferences#privacy` (Firefox)
   - Reset permission for localhost if needed

2. **VAPID Key Not Set**
   - Without VAPID key, FCM token cannot be generated
   - Check console for: `⚠️ VAPID key not set!`
   - Get VAPID key from Firebase Console → Project Settings → Cloud Messaging → Web Push certificates

3. **Service Worker Not Loading**
   - Check browser console for service worker errors
   - Verify `firebase-messaging-sw.js` is accessible at `/firebase-messaging-sw.js`
   - Check Network tab to see if file loads

4. **User Not Logged In**
   - FCM only initializes for authenticated users
   - Make sure you're logged in before checking

## Quick Debug Steps:

### 1. Check Browser Console

Open browser DevTools (F12) and check Console tab for:
- ✅ Service Worker registered
- ✅ Notification permission: granted/default/denied
- ✅ FCM token obtained
- ❌ Any error messages

### 2. Check Service Worker

1. Open DevTools → Application tab
2. Go to "Service Workers" section
3. Verify service worker is registered and running
4. Check for any errors

### 3. Check Notification Permission

In browser console, run:
```javascript
console.log('Permission:', Notification.permission);
```

If it shows `"denied"`, you need to:
1. Go to browser settings
2. Find site permissions
3. Allow notifications for localhost

### 4. Test Manually

Add the debug component to test:

```typescript
import { FCMDebug } from '@/components/FCMDebug';

// Add to any page temporarily
<FCMDebug />
```

### 5. Check VAPID Key

1. Open `.env` file
2. Verify `VITE_FIREBASE_VAPID_KEY` is set
3. Restart dev server after adding

### 6. Clear Browser Data

If permission was previously denied:
1. Clear site data for localhost
2. Or use incognito/private window
3. Refresh page

## Testing Checklist:

- [ ] Service worker registered (check console)
- [ ] Notification permission is "default" or "granted" (not "denied")
- [ ] VAPID key is set in `.env` file
- [ ] User is logged in
- [ ] No errors in browser console
- [ ] `firebase-messaging-sw.js` file is accessible
- [ ] Firebase config values are correct

## Common Error Messages:

### "VAPID key not set"
**Solution:** Add `VITE_FIREBASE_VAPID_KEY` to `.env` file

### "Service Worker registration failed"
**Solution:** 
- Check if `firebase-messaging-sw.js` exists in `public/` directory
- Verify file is accessible at `/firebase-messaging-sw.js`
- Check browser console for specific error

### "Notification permission denied"
**Solution:**
- Go to browser settings
- Allow notifications for localhost
- Or use incognito window

### "No registration token available"
**Solution:**
- Check VAPID key is correct
- Verify service worker is running
- Check Firebase project settings

## Still Not Working?

1. **Check Network Tab:**
   - Verify `firebase-messaging-sw.js` loads (200 status)
   - Check for any failed requests

2. **Check Application Tab:**
   - Service Workers section
   - Storage → Local Storage (check for any FCM data)

3. **Try Different Browser:**
   - Some browsers handle permissions differently
   - Chrome/Edge recommended for best support

4. **Check HTTPS:**
   - Push notifications require HTTPS (or localhost)
   - Make sure you're using `http://localhost` not `http://127.0.0.1`

5. **Verify Firebase Setup:**
   - Firebase project is active
   - Cloud Messaging API is enabled
   - Service account key is properly configured

# Fix FCM Push Notifications in Brave Browser

## Brave Browser Specific Issues

Brave browser has additional privacy features that can interfere with push notifications. Here's how to fix it.

## Quick Fixes

### 1. Disable Brave Shields for Localhost

1. Click the **Brave Shields** icon (lion icon) in the address bar
2. Click **"Shields: Up"** to turn it off for this site
3. Or set it to "Shields: Down" for `localhost:8080`
4. Reload the page

### 2. Check Brave Settings

1. Go to **Settings** → **Shields**
2. Make sure **"Block scripts"** is not blocking your localhost
3. Go to **Settings** → **Privacy and security** → **Site settings** → **Notifications**
4. Make sure notifications are allowed for `localhost:8080`

### 3. Verify VAPID Key Matches Firebase Project

The VAPID key must be from the **exact same Firebase project** as your Firebase config.

**Check your Firebase config:**
- Project ID: `naethra-project-mgmt`
- Messaging Sender ID: `442949069348`

**Verify VAPID key:**
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **naethra-project-mgmt**
3. ⚙️ **Project Settings** → **Cloud Messaging** tab
4. Check **Web Push certificates** → **Key pair**
5. Make sure it matches your `.env` file exactly

### 4. Clear Brave Browser Data

1. Press `Ctrl+Shift+Delete` (or `Cmd+Shift+Delete` on Mac)
2. Select **"Cached images and files"** and **"Cookies and other site data"**
3. Time range: **"All time"**
4. Click **"Clear data"**
5. Reload the page

### 5. Check Service Worker in Brave

1. Open DevTools (F12)
2. Go to **Application** tab
3. Click **Service Workers** in the left sidebar
4. Check if `firebase-messaging-sw.js` is registered
5. If there are errors, click **Unregister** and reload

### 6. Try Incognito Window (Shields Down)

1. Open a new **Private Window** (Ctrl+Shift+N)
2. Navigate to `http://localhost:8080`
3. Grant notification permission
4. Check if FCM token is obtained

### 7. Verify VAPID Key in Browser Console

Open browser console and check:
```javascript
// Check if VAPID key is loaded (won't show actual key for security)
console.log('VAPID loaded:', !!import.meta.env.VITE_FIREBASE_VAPID_KEY);
```

## Common Brave-Specific Issues

### Issue: "Registration failed - push service error"

**Possible causes:**
1. **Brave Shields blocking service worker**
   - Solution: Disable Shields for localhost

2. **VAPID key from wrong Firebase project**
   - Solution: Verify key matches project `naethra-project-mgmt`

3. **Brave's fingerprinting protection**
   - Solution: Add localhost to exceptions in Brave settings

4. **Service worker not loading**
   - Solution: Check Network tab, verify `firebase-messaging-sw.js` loads

### Issue: Service Worker Not Registering

1. Check **Brave Shields** - might be blocking service workers
2. Check **Settings** → **Privacy** → **WebRTC IP Handling** (shouldn't affect this, but worth checking)
3. Try disabling **"Block fingerprinting"** temporarily

## Step-by-Step Debugging

### Step 1: Verify VAPID Key

Your VAPID key should:
- ✅ Be 87 characters long
- ✅ Start with "B" (like `BGQVax7a6k...`)
- ✅ Match the key in Firebase Console exactly
- ✅ Be from project: `naethra-project-mgmt`

### Step 2: Check Brave Shields

1. Look at address bar - is the lion icon (Shields) showing?
2. Click it and set to **"Shields: Down"** for localhost
3. Reload page

### Step 3: Check Service Worker

1. DevTools → **Application** → **Service Workers**
2. Should see `firebase-messaging-sw.js` registered
3. Status should be **"activated and is running"**
4. If not, unregister and reload

### Step 4: Check Network Requests

1. DevTools → **Network** tab
2. Filter by "firebase" or "messaging"
3. Look for failed requests (red)
4. Check for 401/403 errors (invalid VAPID key)

### Step 5: Test in Chrome/Firefox

If it works in Chrome but not Brave:
- It's a Brave-specific issue
- Try disabling Shields
- Check Brave's privacy settings

## Alternative: Use Chrome for Testing

If Brave continues to have issues:
1. Test in Chrome first to verify FCM works
2. Once working in Chrome, apply Brave fixes
3. This helps isolate if it's a Brave issue or general FCM issue

## Still Not Working?

### Double-Check VAPID Key

1. **Copy the key again** from Firebase Console
2. **Remove all spaces** and line breaks
3. **Paste into .env** file:
   ```env
   VITE_FIREBASE_VAPID_KEY=BGQVax7a6k...your-full-key-here
   ```
4. **Restart dev server** (important!)
5. **Hard refresh** browser (Ctrl+Shift+R)

### Regenerate VAPID Key

If the key still doesn't work:
1. Firebase Console → Project Settings → Cloud Messaging
2. If you see an existing key, you can delete it and generate a new one
3. Copy the new key to `.env`
4. Restart dev server
5. Clear browser cache and reload

### Check Firebase Project

Make sure you're using the correct Firebase project:
- Project ID must match: `naethra-project-mgmt`
- All config values must be from the same project
- VAPID key must be from this project

## Expected Behavior

When everything works:
1. ✅ Service Worker registered
2. ✅ Notification permission granted
3. ✅ VAPID key loaded (87 chars, starts with B)
4. ✅ FCM token obtained successfully
5. ✅ FCM token registered with backend

If you see all these, FCM is working! 🎉

# Fix: "Registration failed - push service error"

## What This Error Means

The error `AbortError: Registration failed - push service error` occurs when Firebase Cloud Messaging cannot register for push notifications. This is almost always related to the VAPID key.

## Common Causes

1. **Invalid or Missing VAPID Key**
   - VAPID key is not set in `.env` file
   - VAPID key is incorrect or corrupted
   - VAPID key doesn't match the Firebase project

2. **VAPID Key Format Issues**
   - Key is too short (should be ~87 characters)
   - Key has extra spaces or line breaks
   - Key is from wrong Firebase project

3. **Environment Variable Not Loaded**
   - Dev server not restarted after adding VAPID key
   - `.env` file in wrong location
   - Variable name mismatch

## Step-by-Step Fix

### 1. Verify VAPID Key in Firebase Console

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select project: **naethra-project-mgmt**
3. Click ⚙️ **Project Settings**
4. Go to **Cloud Messaging** tab
5. Scroll to **Web configuration** → **Web Push certificates**
6. **Copy the Key pair** value (it's a long string)

### 2. Check Your .env File

Open `.env` in the root directory and verify:

```env
VITE_FIREBASE_VAPID_KEY=your-actual-vapid-key-here
```

**Important:**
- No quotes around the value
- No spaces before or after the `=`
- The key should be one continuous string (no line breaks)
- Should be ~87 characters long

**Example of correct format:**
```env
VITE_FIREBASE_VAPID_KEY=BK7x8y9zA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q7R8S9T0U1V2W3X4Y5Z6a7b8c9d0e1f2g3h4i5j6k7l8m9n0o1p2q3r4s5t6u7v8w9x0y1z2
```

### 3. Restart Dev Server

**Critical:** After adding/updating the VAPID key:

1. Stop the dev server (Ctrl+C or Cmd+C)
2. Start it again:
   ```bash
   npm run dev
   ```

Environment variables are only loaded when the server starts!

### 4. Clear Browser Cache

1. Open DevTools (F12)
2. Right-click the refresh button
3. Select **"Empty Cache and Hard Reload"**
4. Or use incognito/private window

### 5. Verify Service Worker

1. Open DevTools → **Application** tab
2. Go to **Service Workers** section
3. Check if `firebase-messaging-sw.js` is registered
4. If there are errors, click **Unregister** and reload

### 6. Test Again

After completing the above steps:
1. Reload the page
2. Check browser console
3. You should see: `✅ FCM token obtained successfully`

## Quick Verification

Run this in browser console to check if VAPID key is loaded:

```javascript
// This won't show the actual key (it's not exposed), but will show if it's set
console.log('VAPID key loaded:', !!import.meta.env.VITE_FIREBASE_VAPID_KEY);
```

If it shows `false`, the VAPID key is not being loaded from `.env`.

## Still Not Working?

### Check These:

1. **File Location**
   - `.env` should be in the **root directory** (same level as `package.json`)
   - Not in `src/` or `server/` directory

2. **Variable Name**
   - Must be exactly: `VITE_FIREBASE_VAPID_KEY`
   - Case-sensitive
   - Must start with `VITE_` for Vite to load it

3. **Firebase Project Match**
   - VAPID key must be from the same Firebase project
   - Project ID: `naethra-project-mgmt`
   - Verify in Firebase Console

4. **Generate New VAPID Key**
   - In Firebase Console → Cloud Messaging
   - If key exists, you can regenerate it
   - Copy the new key to `.env`
   - Restart dev server

### Debug Steps

1. **Check if key is being read:**
   ```bash
   # In your terminal, check if env var is set
   echo $VITE_FIREBASE_VAPID_KEY
   ```
   (This won't work in Windows CMD, use Git Bash or PowerShell)

2. **Check browser console:**
   - Look for: `⚠️ VAPID key not set!`
   - If you see this, the key is not loaded

3. **Check Network tab:**
   - Look for requests to Firebase
   - Check for 401/403 errors (invalid key)

## Alternative: Use Firebase SDK v9+ (Modular)

If issues persist, you might need to update the service worker to use the newer Firebase SDK. But first, try the steps above.

## Need More Help?

Check these files:
- `VAPID_KEY_SETUP.md` - Detailed VAPID key setup
- `TROUBLESHOOTING_FCM.md` - General FCM troubleshooting
- `docs/FCM_SETUP.md` - Complete setup guide

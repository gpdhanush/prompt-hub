# Deployment Troubleshooting Guide

## Issue: Version Not Updating After Deployment

If you've updated the version, built, and deployed but still see the old version, follow these steps:

---

## Quick Fix Steps

### 1. **Update Version and Service Worker Cache**

```bash
# Update version in .env
npm run version:patch  # or version:minor, version:major

# This will automatically update service worker cache version
npm run build
```

The `prebuild` script automatically updates the service worker cache version to match your app version.

### 2. **Clear Browser Cache**

**Option A: Hard Refresh (Recommended)**
- **Chrome/Edge**: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Firefox**: `Ctrl+F5` (Windows/Linux) or `Cmd+Shift+R` (Mac)
- **Safari**: `Cmd+Option+R` (Mac)

**Option B: Clear Service Worker Cache**
1. Open Developer Tools (F12)
2. Go to **Application** tab (Chrome) or **Storage** tab (Firefox)
3. Click **Service Workers** in the left sidebar
4. Click **Unregister** for your site
5. Go to **Cache Storage** and delete all caches
6. Refresh the page

**Option C: Clear All Site Data**
1. Open Developer Tools (F12)
2. Go to **Application** tab
3. Click **Clear storage** in the left sidebar
4. Check all boxes
5. Click **Clear site data**
6. Refresh the page

### 3. **Verify Server Files**

Make sure the new build files are actually uploaded to the server:

```bash
# Check dist folder exists and has new files
ls -la dist/

# Check service worker file has new cache version
grep "CACHE_VERSION" dist/sw.js
```

### 4. **Check Server Cache Headers**

Ensure your server is not caching the service worker file. The service worker should have:

```
Cache-Control: public, max-age=0, must-revalidate
```

---

## Complete Deployment Workflow

### Step-by-Step Process:

```bash
# 1. Update version
npm run version:patch

# 2. Build (automatically updates service worker cache version)
npm run build

# 3. Verify build output
ls -la dist/
cat dist/sw.js | grep CACHE_VERSION

# 4. Upload to server
# (Your deployment method here)

# 5. Clear browser cache (see above)
```

---

## Common Issues

### Issue 1: Service Worker Cache Version Not Updating

**Symptom**: Browser still shows old version even after deployment.

**Solution**:
1. Make sure `.env` file has `VITE_APP_VERSION` set
2. Run `npm run build` (the `prebuild` script updates sw.js automatically)
3. Verify `dist/sw.js` has the new cache version
4. Clear browser/service worker cache (see above)

### Issue 2: Build Not Including Updated Service Worker

**Symptom**: Build completes but sw.js still has old cache version.

**Solution**:
```bash
# Manually update service worker cache version
node scripts/update-sw-version.js

# Then build
npm run build
```

### Issue 3: Browser Still Caching Old Version

**Symptom**: Hard refresh doesn't work, still shows old version.

**Solution**:
1. Unregister service worker (see steps above)
2. Clear all caches
3. Close all tabs with your site open
4. Open a new tab and visit the site
5. Check browser console for service worker registration

### Issue 4: Server-Side Caching

**Symptom**: Files are updated but server serves old cached files.

**Solution**:
- Check your web server (nginx/apache) cache settings
- Ensure `sw.js` has no-cache headers
- Restart web server if needed
- Check CDN cache settings (if using Cloudflare, etc.)

---

## Verification Checklist

After deployment, verify:

- [ ] `.env` file has correct `VITE_APP_VERSION`
- [ ] `dist/sw.js` has matching cache version (`naethra-ems-v{VERSION}`)
- [ ] Build files are uploaded to server
- [ ] Server cache headers are correct
- [ ] Browser cache is cleared
- [ ] Service worker is unregistered
- [ ] New version appears after refresh

---

## Testing New Version

1. **Check Version Display**: Look at login page footer for version number
2. **Check Browser Console**: Look for `[SW] Installing service worker...` with new cache version
3. **Check Network Tab**: Verify new files are being loaded (not from cache)
4. **Check Application Tab**: Verify new cache names in Cache Storage

---

## Emergency: Force Cache Clear

If nothing else works, you can force clear all caches:

1. Open browser console
2. Run:
```javascript
// Unregister all service workers
navigator.serviceWorker.getRegistrations().then(function(registrations) {
  for(let registration of registrations) {
    registration.unregister();
  }
});

// Clear all caches
caches.keys().then(function(names) {
  for (let name of names) {
    caches.delete(name);
  }
});

// Reload page
location.reload(true);
```

---

## Prevention: Best Practices

1. **Always update version before building**
   ```bash
   npm run version:patch && npm run build
   ```

2. **Use automated version bumping**
   ```bash
   npm run version:patch  # Automatically increments version
   ```

3. **Verify before deploying**
   ```bash
   # Check service worker cache version matches app version
   grep "CACHE_VERSION" dist/sw.js
   grep "VITE_APP_VERSION" .env
   ```

4. **Test in incognito/private mode** after deployment to verify new version loads

---

## Need More Help?

If issues persist:
1. Check browser console for errors
2. Check network tab for failed requests
3. Verify server logs for errors
4. Check that all build files are present in `dist/` folder


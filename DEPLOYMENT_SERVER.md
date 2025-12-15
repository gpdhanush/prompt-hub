# Server Deployment Guide

## Problem
When deploying Vite build to a server, you may encounter:
- CSS files served as `text/html` instead of `text/css`
- JavaScript files returning 404
- Assets not loading correctly

## Solution

The server needs proper configuration to:
1. Serve static files with correct MIME types
2. Handle SPA routing (fallback to index.html)
3. Serve assets from correct paths

## Deployment Steps

### Step 1: Build Your Project

```bash
npm run build
```

This creates a `dist` folder with all production files.

### Step 2: Upload to Server

Upload the **contents** of the `dist` folder to your web server:
- If using cPanel: Upload to `public_html` or your domain folder
- If using SSH: Copy to `/var/www/html` or your web root

**Important:** Upload the **contents** of dist, not the dist folder itself.

```
dist/
├── index.html          ← Upload this
├── assets/             ← Upload this folder
├── manifest.json       ← Upload this
├── sw.js              ← Upload this
└── ...                ← Upload all other files
```

### Step 3: Configure Server

#### Option A: Apache Server (.htaccess)

1. Copy `.htaccess` file to your web root (same directory as index.html)
2. Ensure Apache has `mod_rewrite` enabled:
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

3. Verify `.htaccess` is allowed in Apache config:
   ```apache
   <Directory /var/www/html>
       AllowOverride All
   </Directory>
   ```

#### Option B: Nginx Server

1. Copy `nginx.conf` content to your Nginx site configuration
2. Update the `root` path to your actual web directory
3. Test configuration:
   ```bash
   sudo nginx -t
   ```
4. Reload Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

### Step 4: Verify File Permissions

Ensure files are readable:
```bash
chmod -R 755 /path/to/web/root
chmod 644 /path/to/web/root/*.html
chmod 644 /path/to/web/root/*.js
chmod 644 /path/to/web/root/*.css
```

### Step 5: Test Deployment

1. Visit your domain: `https://gp.prasowlabs.in`
2. Open browser DevTools (F12)
3. Check Console for errors
4. Check Network tab to verify assets load correctly

## Common Issues & Fixes

### Issue 1: CSS/JS files return 404

**Cause:** Files not uploaded or wrong path

**Fix:**
- Verify `assets/` folder exists in web root
- Check file paths in `index.html` match actual file locations
- Ensure `.htaccess` or Nginx config allows serving these files

### Issue 2: CSS served as HTML

**Cause:** Server returning index.html for asset requests

**Fix:**
- Add `.htaccess` (Apache) or update Nginx config
- Ensure rewrite rules exclude `/assets/` path
- Check MIME type configuration

### Issue 3: Routes return 404

**Cause:** SPA routing not configured

**Fix:**
- Ensure `.htaccess` rewrite rules are active (Apache)
- Or Nginx `try_files` directive includes `/index.html` fallback

### Issue 4: Manifest.json 404

**Cause:** File not uploaded or wrong path

**Fix:**
- Verify `manifest.json` is in web root
- Check file permissions (should be 644)
- Ensure MIME type is set to `application/manifest+json`

## File Structure on Server

After deployment, your server should have:

```
/var/www/html/  (or your web root)
├── index.html
├── manifest.json
├── sw.js
├── firebase-messaging-sw.js
├── robots.txt
├── favicon.ico
├── offline.html
└── assets/
    ├── index-*.js
    ├── index-*.css
    └── images/
        ├── fav-icon.png
        └── logo.png
```

## Quick Deployment Script

```bash
#!/bin/bash
# deploy.sh

# Build the project
npm run build

# Upload to server (adjust paths as needed)
rsync -avz --delete dist/ user@server:/var/www/html/

# Or using SCP
# scp -r dist/* user@server:/var/www/html/
```

## Testing Checklist

- [ ] Homepage loads correctly
- [ ] CSS styles are applied
- [ ] JavaScript executes without errors
- [ ] Navigation works (SPA routing)
- [ ] Assets load (images, fonts, etc.)
- [ ] PWA manifest loads
- [ ] Service worker registers
- [ ] API calls work (check CORS if needed)

## Need Help?

If issues persist:
1. Check server error logs
2. Verify file permissions
3. Test with browser DevTools Network tab
4. Ensure server supports `.htaccess` (Apache) or proper Nginx config

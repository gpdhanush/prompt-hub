# Swagger UI Setup for cPanel Backend

## Overview
This guide explains how to set up Swagger UI in a cPanel environment and fix MIME type errors.

## Prerequisites
- Node.js application running in cPanel
- Access to cPanel File Manager or SSH
- Apache server (most cPanel installations use Apache)

## Step 1: Upload Files to cPanel

### 1.1 Upload Server Files
Upload your entire `server` directory to cPanel. The structure should be:

```
/home/username/
└── server/
    ├── index.js
    ├── .htaccess          ← IMPORTANT: Upload this file
    ├── package.json
    ├── config/
    ├── routes/
    ├── utils/
    ├── public/            ← Contains Swagger UI CSS
    │   └── swagger-ui-custom.css
    └── uploads/
```

### 1.2 Verify File Permissions
Set correct permissions via cPanel File Manager or SSH:

```bash
# Files should be 644
chmod 644 server/.htaccess
chmod 644 server/index.js
chmod 644 server/public/swagger-ui-custom.css

# Directories should be 755
chmod 755 server/
chmod 755 server/public/
chmod 755 server/uploads/
```

## Step 2: Configure Node.js in cPanel

### 2.1 Setup Node.js App
1. Go to **cPanel → Software → Setup Node.js App**
2. Click **Create Application**
3. Configure:
   - **Node.js version**: Select latest stable (18.x or 20.x)
   - **Application root**: `/home/username/server`
   - **Application URL**: Choose your domain/subdomain
   - **Application startup file**: `index.js`
   - **Application mode**: Production

### 2.2 Set Environment Variables
In the Node.js App settings, add environment variables:

```
NODE_ENV=production
PORT=3001
DB_HOST=your_db_host
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name
JWT_SECRET=your_jwt_secret
# ... add all other required env vars
```

### 2.3 Install Dependencies
1. In cPanel Node.js App, click **Run NPM Install**
2. Or via SSH:
   ```bash
   cd ~/server
   npm install
   ```

## Step 3: Fix MIME Type Issues

### 3.1 Upload .htaccess File
The `.htaccess` file in the `server` directory will fix MIME type errors:

- ✅ JavaScript files will be served as `application/javascript`
- ✅ CSS files will be served as `text/css`
- ✅ JSON files will be served as `application/json`

### 3.2 Verify .htaccess is Active
1. Check if Apache `mod_rewrite` and `mod_mime` are enabled (usually enabled by default in cPanel)
2. Verify `.htaccess` is in the correct location (same directory as `index.js`)
3. Check file permissions (should be 644)

## Step 4: Access Swagger UI

### 4.1 Find Your API URL
Your Swagger UI will be available at:
```
https://your-domain.com/api-docs
```

Or if using a subdomain:
```
https://api.your-domain.com/api-docs
```

### 4.2 Verify Swagger Assets
Check that Swagger CSS is loading:
```
https://your-domain.com/swagger-ui-assets/swagger-ui-custom.css
```

This should return CSS content, not 404.

## Step 5: Fix manifest.json 404 Error

The `manifest.json` 404 error is likely from your **frontend**, not backend. 

### 5.1 For Frontend (if using cPanel)
1. Upload `manifest.json` to your frontend root directory
2. Ensure `.htaccess` in frontend includes:
   ```apache
   AddType application/manifest+json webmanifest json
   ```

### 5.2 For Backend (if needed)
If your backend serves a manifest.json, ensure it's in the correct location and `.htaccess` includes the MIME type.

## Step 6: Troubleshooting

### Issue: "Failed to load module script: Expected a JavaScript module"
**Solution:**
1. Verify `.htaccess` is uploaded to `server/` directory
2. Check MIME types in `.htaccess` include:
   ```apache
   AddType application/javascript js mjs
   ```
3. Clear browser cache
4. Restart Node.js app in cPanel

### Issue: Swagger UI CSS not loading
**Solution:**
1. Verify `server/public/swagger-ui-custom.css` exists
2. Check file permissions (644)
3. Verify path in `server/index.js`:
   ```javascript
   customCssUrl: '/swagger-ui-assets/swagger-ui-custom.css'
   ```
4. Test direct URL: `https://your-domain.com/swagger-ui-assets/swagger-ui-custom.css`

### Issue: 404 for manifest.json
**Solution:**
1. This is usually a **frontend** issue
2. Upload `manifest.json` to frontend root
3. Add to frontend `.htaccess`:
   ```apache
   AddType application/manifest+json webmanifest json
   ```

### Issue: API endpoints return 404
**Solution:**
1. Check Node.js app is running in cPanel
2. Verify routes are correct in `server/index.js`
3. Check application URL matches your domain
4. Review Node.js app logs in cPanel

## Step 7: Verify Installation

### 7.1 Test Swagger UI
1. Visit: `https://your-domain.com/api-docs`
2. Should see Swagger UI with modern design
3. Click "Authorize" button
4. Enter JWT token: `Bearer <your-token>`

### 7.2 Test API Endpoints
1. Use Swagger UI "Try it out" feature
2. Or test with curl:
   ```bash
   curl https://your-domain.com/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

### 7.3 Check MIME Types
Open browser DevTools (F12) → Network tab:
- JavaScript files should show `Content-Type: application/javascript`
- CSS files should show `Content-Type: text/css`
- JSON files should show `Content-Type: application/json`

## Additional cPanel Configuration

### Enable mod_rewrite (if needed)
Most cPanel installations have this enabled, but if you need to enable it:

1. Contact your hosting provider, or
2. Via SSH (if you have root access):
   ```bash
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

### Custom Error Logs
Check error logs in cPanel:
- **cPanel → Metrics → Errors**
- Look for MIME type or file not found errors

## Security Notes

1. **Don't expose sensitive data** in Swagger UI
2. **Use HTTPS** in production
3. **Restrict access** to Swagger UI if needed (add authentication)
4. **Keep dependencies updated**: `npm audit` and `npm update`

## Support

If issues persist:
1. Check cPanel error logs
2. Verify Node.js app is running
3. Test `.htaccess` syntax
4. Contact hosting support if Apache modules are missing


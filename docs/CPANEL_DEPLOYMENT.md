# cPanel Deployment Guide for Backend API

## Quick Fix for MIME Type Errors

### Problem
You're seeing these errors:
- `Failed to load module script: Expected a JavaScript module script but the server responded with a MIME type of "application/octet-stream"`
- `manifest.json:1 Failed to load resource: the server responded with a status of 404`

### Solution

## Step 1: Upload .htaccess File

1. **Upload `server/.htaccess` to your cPanel server directory**
   - Location: Same directory as your `index.js` file
   - Path: `/home/username/server/.htaccess` (or your server directory)

2. **Set correct permissions:**
   - File permissions: `644`
   - Directory permissions: `755`

## Step 2: Configure Node.js App in cPanel

1. **Go to cPanel → Software → Setup Node.js App**

2. **Create/Edit Application:**
   - **Application root**: `/home/username/server`
   - **Application URL**: Your domain (e.g., `pms-api.prasowlabs.in`)
   - **Application startup file**: `index.js`
   - **Node.js version**: Latest stable (18.x or 20.x)

3. **Set Environment Variables:**
   ```
   NODE_ENV=production
   PORT=3001
   DB_HOST=localhost
   DB_USER=your_db_user
   DB_PASSWORD=your_db_password
   DB_NAME=your_db_name
   JWT_SECRET=your_secret_key
   # Add all other required variables
   ```

4. **Install Dependencies:**
   - Click "Run NPM Install" in cPanel
   - Or via SSH: `cd ~/server && npm install`

5. **Start/Restart Application:**
   - Click "Restart App" in cPanel Node.js App manager

## Step 3: Verify File Structure

Your server directory should have:
```
server/
├── .htaccess              ← IMPORTANT: Fixes MIME types
├── index.js
├── package.json
├── config/
├── routes/
├── utils/
├── public/
│   └── swagger-ui-custom.css
└── uploads/
```

## Step 4: Test Swagger UI

1. **Access Swagger UI:**
   ```
   https://pms-api.prasowlabs.in/api-docs
   ```

2. **Verify CSS loads:**
   ```
   https://pms-api.prasowlabs.in/swagger-ui-assets/swagger-ui-custom.css
   ```
   Should return CSS content, not 404.

## Step 5: Fix manifest.json 404 (Frontend Issue)

The `manifest.json` 404 is likely from your **frontend**, not backend.

### For Frontend (if also in cPanel):

1. **Upload `manifest.json` to frontend root directory**

2. **Ensure frontend `.htaccess` includes:**
   ```apache
   AddType application/manifest+json webmanifest json
   ```

3. **Verify file exists:**
   ```
   https://your-frontend-domain.com/manifest.json
   ```

## Troubleshooting

### Issue: MIME type errors persist

**Check:**
1. `.htaccess` file is in correct location (same as `index.js`)
2. File permissions are correct (644)
3. Apache `mod_mime` is enabled (usually enabled by default)
4. Clear browser cache
5. Restart Node.js app in cPanel

**Test MIME types:**
```bash
# Via SSH, check file type
file -bi server/public/swagger-ui-custom.css
# Should output: text/css; charset=us-ascii
```

### Issue: Swagger UI CSS not loading

**Check:**
1. File exists: `server/public/swagger-ui-custom.css`
2. File permissions: `644`
3. Directory permissions: `755`
4. Test direct URL in browser
5. Check cPanel error logs

### Issue: Node.js app not starting

**Check:**
1. Application startup file is correct (`index.js`)
2. All environment variables are set
3. Dependencies installed (`npm install`)
4. Check application logs in cPanel
5. Verify Node.js version compatibility

### Issue: API endpoints return 404

**Check:**
1. Node.js app is running (green status in cPanel)
2. Routes are correctly defined in `server/index.js`
3. Application URL matches your domain
4. Check application logs for errors

## Additional cPanel Configuration

### Enable Apache Modules (if needed)

Most cPanel installations have these enabled by default, but verify:
- `mod_rewrite`
- `mod_mime`
- `mod_headers`
- `mod_deflate`
- `mod_expires`

If not enabled, contact your hosting provider.

### Check Error Logs

1. **cPanel → Metrics → Errors**
   - Look for MIME type errors
   - Check for file not found errors

2. **Node.js App Logs**
   - In cPanel Node.js App manager
   - Click "View Logs" or "Error Logs"

## Security Checklist

- [ ] Use HTTPS (SSL certificate installed)
- [ ] Environment variables set securely
- [ ] `.htaccess` doesn't expose sensitive info
- [ ] File permissions are correct (644 for files, 755 for dirs)
- [ ] Node.js app running in production mode
- [ ] Database credentials are secure

## Support

If issues persist:
1. Check cPanel error logs
2. Verify Node.js app status
3. Test `.htaccess` syntax
4. Contact hosting support if Apache modules missing

## Quick Commands (via SSH)

```bash
# Navigate to server directory
cd ~/server

# Check file permissions
ls -la

# Fix permissions if needed
chmod 644 .htaccess
chmod 644 index.js
chmod 755 public/
chmod 644 public/swagger-ui-custom.css

# Check if Node.js app is running
ps aux | grep node

# View recent errors
tail -f ~/logs/error_log
```


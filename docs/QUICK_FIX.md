# Quick Fix for Server Deployment Issues

## Immediate Solution

Your server is not configured to serve static assets correctly. Here's the quick fix:

### For Apache Servers (Most Common)

1. **Copy `.htaccess` file to your web root**
   - The `.htaccess` file I created needs to be in the same directory as your `index.html`
   - Upload it to: `/public_html/` or your domain's root directory

2. **Verify Apache modules are enabled:**
   ```bash
   # SSH into your server and run:
   sudo a2enmod rewrite
   sudo systemctl restart apache2
   ```

3. **Check Apache configuration allows .htaccess:**
   ```apache
   <Directory /var/www/html>
       AllowOverride All
   </Directory>
   ```

### For Nginx Servers

1. **Update your Nginx site configuration** with the content from `nginx.conf`
2. **Reload Nginx:**
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

## File Upload Checklist

Make sure you upload these files to your server:

```
✅ index.html
✅ manifest.json
✅ sw.js
✅ firebase-messaging-sw.js
✅ robots.txt
✅ favicon.ico
✅ .htaccess (for Apache)
✅ assets/ folder (with all CSS and JS files)
```

## Verify Deployment

After uploading, test:

1. **Check if files exist:**
   - Visit: `https://gp.prasowlabs.in/manifest.json` (should show JSON, not 404)
   - Visit: `https://gp.prasowlabs.in/assets/index-*.css` (should download CSS file)

2. **Check MIME types:**
   - Open browser DevTools (F12)
   - Go to Network tab
   - Reload page
   - Check CSS file - Content-Type should be `text/css`, not `text/html`

3. **If still not working:**
   - Check server error logs
   - Verify file permissions (644 for files, 755 for directories)
   - Ensure `.htaccess` is uploaded and Apache allows it

## Common Mistakes

❌ **Uploading the `dist` folder itself** - Upload the **contents** of dist  
❌ **Missing `.htaccess` file** - Required for Apache SPA routing  
❌ **Wrong file permissions** - Files should be 644, directories 755  
❌ **Assets folder not uploaded** - Make sure entire `assets/` folder is uploaded

## Still Having Issues?

1. Check server type (Apache or Nginx)
2. Verify `.htaccess` is in web root
3. Check Apache error logs: `/var/log/apache2/error.log`
4. Test with: `curl -I https://gp.prasowlabs.in/assets/index-*.css`

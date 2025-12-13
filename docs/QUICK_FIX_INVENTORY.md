# Quick Fix for Inventory Module

## Issue 1: Database Tables Not Found

### Solution: Run the Migration

**Option A: Use the simplified migration (Recommended)**
```bash
mysql -u root -p admin_dashboard < database/migrations/add_inventory_management_simple.sql
```

**Option B: Use the main migration**
```bash
mysql -u root -p admin_dashboard < database/migrations/add_inventory_management.sql
```

**Option C: Run directly in MySQL**
```sql
USE admin_dashboard;
SOURCE database/migrations/add_inventory_management_simple.sql;
```

### Verify Tables Were Created
```sql
USE admin_dashboard;
SHOW TABLES LIKE 'inventory%';
```

You should see:
- `inventory_items`
- `inventory_transactions`
- `inventory_attachments`

## Issue 2: Route Not Found Errors

### Check 1: Verify Route Paths
Make sure you're accessing:
- `/it-assets/inventory` (not `/inventory` or `/assets/inventory`)

### Check 2: Browser Console
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for any JavaScript errors
4. Check Network tab for failed API calls

### Check 3: Verify Routes in App.tsx
Routes are configured at lines 456-502 in `src/App.tsx`. The order is:
1. `/it-assets/inventory/create` (most specific)
2. `/it-assets/inventory/history`
3. `/it-assets/inventory/reports`
4. `/it-assets/inventory/:id/edit`
5. `/it-assets/inventory/:id/adjust`
6. `/it-assets/inventory` (most general - must be last)

### Check 4: Test Routes Manually
Try accessing these URLs directly:
- `http://localhost:8080/it-assets/inventory`
- `http://localhost:8080/it-assets/inventory/create`
- `http://localhost:8080/it-assets/inventory/history`

### Check 5: React Router Version
If using React Router v6, routes should work as configured. If you're on v5, you may need to add `exact` prop.

## Common Issues

### Issue: "Cannot read property of undefined"
**Cause**: Component trying to access data before it loads
**Fix**: Check that components handle loading states properly

### Issue: "404 Not Found" in browser
**Cause**: Route not matching or backend API not implemented
**Fix**: 
1. Check browser URL matches route path exactly
2. Verify backend API endpoints exist
3. Check server logs for errors

### Issue: "Table doesn't exist" error
**Cause**: Migration not run or failed
**Fix**: 
1. Run migration script again
2. Check for foreign key constraint errors
3. Verify `asset_categories` and `users` tables exist first

## Step-by-Step Fix

1. **Run Database Migration**
   ```bash
   mysql -u root -p admin_dashboard < database/migrations/add_inventory_management_simple.sql
   ```

2. **Verify Database**
   ```sql
   USE admin_dashboard;
   SELECT COUNT(*) FROM inventory_items;
   ```

3. **Restart Development Server**
   ```bash
   # Stop current server (Ctrl+C)
   npm run dev
   ```

4. **Clear Browser Cache**
   - Hard refresh: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
   - Or clear browser cache completely

5. **Test Routes**
   - Navigate to `/it-assets/inventory`
   - Check browser console for errors
   - Check Network tab for API calls

6. **Check Backend API**
   - Verify backend routes are implemented
   - Check server logs for errors
   - Test API endpoints directly (e.g., `GET /assets/inventory`)

## Still Having Issues?

1. **Check Server Logs**
   - Look for database connection errors
   - Check for SQL syntax errors
   - Verify foreign key constraints

2. **Check Browser Network Tab**
   - See if API calls are being made
   - Check response status codes
   - Look for CORS errors

3. **Verify Dependencies**
   ```sql
   -- Check required tables exist
   SELECT * FROM asset_categories LIMIT 1;
   SELECT * FROM users LIMIT 1;
   ```

4. **Test with Sample Data**
   ```sql
   -- Insert a test inventory item
   INSERT INTO inventory_items 
     (asset_category_id, asset_name, asset_code, current_stock, min_stock_level)
   VALUES
     (1, 'Test Item', 'TEST-001', 10, 5);
   ```

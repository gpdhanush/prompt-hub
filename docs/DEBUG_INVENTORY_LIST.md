# Debug: Inventory Items List Not Loading

## Issue
Inventory items exist in the database and show in recent activity, but the main inventory list shows "No inventory items found".

## Changes Made

### 1. Fixed Count Query
The count query was using regex replacement which could fail. Changed to a more reliable method.

### 2. Added Error Handling
- Added error display in frontend
- Added better logging in backend
- Added debug console logs

### 3. Improved Query Structure
- Separated WHERE clause building
- Ensured proper parameter handling
- Added array safety checks

## Debugging Steps

### Step 1: Check Backend Logs
Look at your server console/logs when you load the inventory page. You should see:
```
Inventory items query: { total: X, itemsCount: Y, ... }
Returning inventory items: Y
```

### Step 2: Test API Directly
Test the API endpoint directly in your browser or Postman:
```
GET http://localhost:YOUR_PORT/api/assets/inventory
```

You should get a response like:
```json
{
  "data": [...],
  "total": 2,
  "page": 1,
  "limit": 10
}
```

### Step 3: Check Browser Console
Open browser DevTools (F12) → Console tab. You should see:
- `Inventory data received: {...}` - if data is received
- `Inventory fetch error: {...}` - if there's an error

### Step 4: Check Network Tab
1. Open DevTools (F12) → Network tab
2. Reload the inventory page
3. Look for the request to `/api/assets/inventory`
4. Check:
   - Status code (should be 200)
   - Response body (should contain your items)
   - Request headers (should include auth token)

### Step 5: Verify Database Query
Run this SQL directly in your database:
```sql
SELECT 
  i.*,
  ac.name as category_name,
  u.name as created_by_name
FROM inventory_items i
LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
LEFT JOIN users u ON i.created_by = u.id
ORDER BY i.asset_name ASC
LIMIT 10 OFFSET 0;
```

This should return your 2 items.

## Common Issues

### Issue 1: Query Returns Empty Array
**Possible causes:**
- JOIN conditions not matching (check if `asset_category_id` exists in `asset_categories`)
- `created_by` user doesn't exist
- Data was inserted incorrectly

**Fix:**
```sql
-- Check if categories exist
SELECT * FROM asset_categories;

-- Check if items exist
SELECT * FROM inventory_items;

-- Check JOIN works
SELECT i.*, ac.name 
FROM inventory_items i
LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id;
```

### Issue 2: API Returns 404
**Fix:** Make sure the backend server is running and the route is registered.

### Issue 3: API Returns 500 Error
**Check server logs** for the actual error message. Common issues:
- Table doesn't exist (run migration)
- Column name mismatch
- SQL syntax error

### Issue 4: Data Structure Mismatch
**Check:** The response should be:
```json
{
  "data": [array of items],
  "total": number,
  "page": number,
  "limit": number
}
```

Not:
```json
{
  "items": [...],
  ...
}
```

## Quick Test Query

Run this to verify your data:
```sql
-- Count items
SELECT COUNT(*) as total FROM inventory_items;

-- Get all items with details
SELECT 
  i.id,
  i.asset_name,
  i.asset_code,
  i.current_stock,
  i.min_stock_level,
  ac.name as category_name
FROM inventory_items i
LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id;
```

## Next Steps

1. **Restart your backend server** to pick up the changes
2. **Clear browser cache** (Ctrl+Shift+R or Cmd+Shift+R)
3. **Check browser console** for any errors
4. **Check server logs** for query results
5. **Test the API endpoint directly** to see the raw response

If items still don't show:
- Share the server log output
- Share the browser console errors
- Share the API response from Network tab

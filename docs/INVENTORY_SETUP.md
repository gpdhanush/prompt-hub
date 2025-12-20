# Inventory Module Setup Guide

## Database Setup

### Step 1: Run the Migration

Execute the inventory management migration script:

```bash
mysql -u root -p prasowla_ntpl_admin < database/migrations/add_inventory_management.sql
```

Or using MySQL command line:
```sql
USE prasowla_ntpl_admin;
SOURCE database/migrations/add_inventory_management.sql;
```

### Step 2: Verify Tables

Check that all tables were created:

```sql
SHOW TABLES LIKE 'inventory%';
```

You should see:
- `inventory_items`
- `inventory_transactions`
- `inventory_attachments`

### Step 3: Verify Views

Check that views were created:

```sql
SHOW FULL TABLES WHERE Table_type = 'VIEW' AND Tables_in_prasowla_ntpl_admin LIKE 'v_%inventory%';
```

You should see:
- `v_low_stock_items`
- `v_inventory_stats`

## Frontend Routes

All inventory routes are configured in `src/App.tsx`:

- `/it-assets/inventory` - Main inventory dashboard
- `/it-assets/inventory/create` - Create new inventory item
- `/it-assets/inventory/:id/edit` - Edit inventory item
- `/it-assets/inventory/:id/adjust` - Adjust stock levels
- `/it-assets/inventory/history` - Transaction history
- `/it-assets/inventory/reports` - Inventory reports

## Troubleshooting

### Route Not Found Issues

If you're getting "route not found" errors:

1. **Check Browser Console**
   - Open browser DevTools (F12)
   - Check Console tab for errors
   - Check Network tab for failed API calls

2. **Verify Route Order**
   - More specific routes should come before general routes
   - Current order is correct (specific → general)

3. **Check Route Path**
   - Ensure you're using the exact path: `/it-assets/inventory`
   - Check for typos in the URL

4. **Verify Component Imports**
   - All components are imported in `src/App.tsx`
   - Check for any import errors

### Database Issues

If tables are not found:

1. **Check Database Name**
   - Ensure you're using the correct database: `prasowla_ntpl_admin`
   - Verify with: `SHOW DATABASES;`

2. **Check Dependencies**
   - Ensure `asset_categories` table exists
   - Ensure `users` table exists
   - Run `add_it_asset_management.sql` first if needed

3. **Check Permissions**
   - Ensure MySQL user has CREATE TABLE permissions
   - Check for any error messages during migration

4. **Verify Foreign Keys**
   - Check that referenced tables exist:
     ```sql
     SELECT * FROM asset_categories LIMIT 1;
     SELECT * FROM users LIMIT 1;
     ```

### API Endpoints

The frontend expects these backend API endpoints:

- `GET /assets/inventory` - List inventory items
- `GET /assets/inventory/:id` - Get inventory item details
- `POST /assets/inventory` - Create inventory item
- `PUT /assets/inventory/:id` - Update inventory item
- `DELETE /assets/inventory/:id` - Delete inventory item
- `POST /assets/inventory/:id/adjust` - Adjust stock
- `GET /assets/inventory/history` - Get transaction history
- `GET /assets/inventory/low-stock` - Get low stock alerts
- `GET /assets/inventory/stats` - Get inventory statistics
- `GET /assets/inventory/reports` - Get inventory reports

### Testing Routes

Test each route manually:

1. Navigate to `/it-assets/inventory` - Should show dashboard
2. Click "New Item" - Should navigate to `/it-assets/inventory/create`
3. Click "Edit" on an item - Should navigate to `/it-assets/inventory/:id/edit`
4. Click "Adjust Stock" - Should navigate to `/it-assets/inventory/:id/adjust`
5. Click "History" - Should navigate to `/it-assets/inventory/history`
6. Click "Reports" - Should navigate to `/it-assets/inventory/reports`

## Sample Data (Optional)

To test with sample data:

```sql
-- Insert sample inventory items
INSERT INTO `inventory_items` 
  (`asset_category_id`, `asset_name`, `asset_code`, `current_stock`, `min_stock_level`, `unit_price`, `location`)
VALUES
  (4, 'USB Mouse', 'INV-001', 50, 10, 15.99, 'Warehouse A'),
  (5, 'USB-C Charger', 'INV-002', 25, 5, 25.00, 'Warehouse A'),
  (6, 'Mechanical Keyboard', 'INV-003', 15, 5, 89.99, 'Warehouse B'),
  (7, 'Wireless Headset', 'INV-004', 8, 3, 79.99, 'Warehouse B');
```

## Support

If issues persist:
1. Check server logs for errors
2. Verify database connection
3. Check API endpoint responses
4. Review browser console for JavaScript errors
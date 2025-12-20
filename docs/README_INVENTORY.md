# Inventory Management Database Migration

## Overview
This migration adds the necessary database tables for the Inventory Management module, which supports stock tracking, adjustments, and transaction history.

## Tables Created

### 1. `inventory_items`
Stores inventory items that can be tracked by quantity (consumables, accessories, etc.)
- Links to `asset_categories` for categorization
- Tracks current stock, minimum stock levels, and pricing
- Supports location and notes

### 2. `inventory_transactions`
Tracks all stock adjustments and movements
- Records additions, reductions, and adjustments
- Maintains audit trail with previous/new stock levels
- Links to users who made the changes

### 3. `inventory_attachments`
Stores file attachments related to inventory items
- Supports document uploads for inventory items
- Tracks file metadata (size, type, URL)

### 4. Views Created
- `v_low_stock_items`: Automatically identifies items below minimum stock levels
- `v_inventory_stats`: Provides summary statistics for inventory dashboard

### 5. Triggers
- `update_inventory_timestamp`: Automatically updates `last_updated` field when stock changes

## Installation

### Option 1: Using MySQL Command Line
```bash
mysql -u root -p prasowla_ntpl_admin < database/migrations/add_inventory_management.sql
```

### Option 2: Using MySQL Workbench
1. Open MySQL Workbench
2. Connect to your database
3. Open the file `database/migrations/add_inventory_management.sql`
4. Execute the script

### Option 3: Using phpMyAdmin
1. Select the `prasowla_ntpl_admin` database
2. Go to the "Import" tab
3. Choose the file `database/migrations/add_inventory_management.sql`
4. Click "Go"

## Verification

After running the migration, verify the tables were created:

```sql
-- Check if tables exist
SHOW TABLES LIKE 'inventory%';

-- Check table structure
DESCRIBE inventory_items;
DESCRIBE inventory_transactions;
DESCRIBE inventory_attachments;

-- Check views
SHOW FULL TABLES WHERE Table_type = 'VIEW';
```

## Dependencies

This migration requires:
- `asset_categories` table (from `add_it_asset_management.sql`)
- `users` table (from base schema)
- `employees` table (from base schema)

Make sure these tables exist before running this migration.

## Rollback (if needed)

If you need to remove these tables:

```sql
DROP VIEW IF EXISTS `v_inventory_stats`;
DROP VIEW IF EXISTS `v_low_stock_items`;
DROP TRIGGER IF EXISTS `update_inventory_timestamp`;
DROP TABLE IF EXISTS `inventory_attachments`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `inventory_items`;
```

## Notes

- The `inventory_items` table is separate from the `assets` table
- `assets` tracks individual items (laptops, phones, etc.)
- `inventory_items` tracks consumables/accessories by quantity (cables, mice, etc.)
- Stock adjustments automatically update the `last_updated` timestamp
- Low stock alerts are calculated automatically via the view
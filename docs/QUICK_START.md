# Quick Start - Fix "Table Not Found" Error

## The Error You're Seeing
```
#1109 - Unknown table 'inventory_items' in information_schema
```

## Quick Fix (Choose One Method)

### ⚡ Method 1: Copy-Paste in phpMyAdmin (Easiest)

1. Open phpMyAdmin
2. Select `admin_dashboard` database
3. Click "SQL" tab
4. Copy and paste this:

```sql
USE `admin_dashboard`;

CREATE TABLE IF NOT EXISTS `inventory_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_category_id` INT UNSIGNED NOT NULL,
  `asset_name` VARCHAR(255) NOT NULL,
  `asset_code` VARCHAR(50) UNIQUE,
  `current_stock` INT NOT NULL DEFAULT 0,
  `min_stock_level` INT NOT NULL DEFAULT 0,
  `unit_price` DECIMAL(10, 2) NULL,
  `location` VARCHAR(255) NULL,
  `notes` TEXT NULL,
  `created_by` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `last_updated` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_category_id`) REFERENCES `asset_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_inventory_category` (`asset_category_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_transactions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT UNSIGNED NOT NULL,
  `type` ENUM('addition', 'reduction', 'adjustment') NOT NULL,
  `quantity_change` INT NOT NULL,
  `previous_stock` INT NOT NULL,
  `new_stock` INT NOT NULL,
  `reason` VARCHAR(100) NOT NULL,
  `notes` TEXT NULL,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_transaction_item` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `inventory_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `inventory_item_id` INT UNSIGNED NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_url` VARCHAR(500) NULL,
  `file_size` BIGINT UNSIGNED NULL,
  `file_type` VARCHAR(100) NULL,
  `comment` TEXT NULL,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_attachment_item` (`inventory_item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

5. Click "Go"
6. You should see "3 rows affected" or similar success message

### ⚡ Method 2: Command Line

```bash
cd /Users/naethra/Desktop/Projects/ntpl/project-mgmt-new/prompt-hub
mysql -u root -p admin_dashboard < database/migrations/CREATE_INVENTORY_TABLES_ONLY.sql
```

### ⚡ Method 3: Full Migration (Recommended)

```bash
cd /Users/naethra/Desktop/Projects/ntpl/project-mgmt-new/prompt-hub
mysql -u root -p admin_dashboard < database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql
```

## Verify It Worked

Run this in phpMyAdmin or MySQL:

```sql
USE admin_dashboard;
SELECT COUNT(*) FROM inventory_items;
```

If you get a number (even 0), it worked! ✅

If you get an error, check:
1. Are you using the correct database? (`admin_dashboard`)
2. Do `asset_categories` and `users` tables exist?
3. Check the error message for clues

## Still Not Working?

1. **Check if dependencies exist:**
   ```sql
   SELECT * FROM asset_categories LIMIT 1;
   SELECT * FROM users LIMIT 1;
   ```
   
   If these fail, run:
   ```bash
   mysql -u root -p admin_dashboard < database/migrations/add_it_asset_management.sql
   ```

2. **Try without foreign keys first:**
   Remove the `FOREIGN KEY` lines from the CREATE TABLE statements and run again.

3. **Check MySQL user permissions:**
   Make sure your MySQL user has CREATE TABLE permissions.

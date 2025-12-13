-- ============================================
-- MINIMAL INVENTORY TABLES CREATION
-- ============================================
-- This creates ONLY the tables without views/triggers
-- Use this if you're getting errors with the full migration
-- ============================================

USE `admin_dashboard`;

-- Drop if exists
DROP TABLE IF EXISTS `inventory_attachments`;
DROP TABLE IF EXISTS `inventory_transactions`;
DROP TABLE IF EXISTS `inventory_items`;

-- Create inventory_items table
CREATE TABLE `inventory_items` (
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
  INDEX `idx_inventory_category` (`asset_category_id`),
  INDEX `idx_inventory_code` (`asset_code`),
  INDEX `idx_inventory_name` (`asset_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create inventory_transactions table
CREATE TABLE `inventory_transactions` (
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
  INDEX `idx_transaction_item` (`inventory_item_id`),
  INDEX `idx_transaction_type` (`type`),
  INDEX `idx_transaction_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create inventory_attachments table
CREATE TABLE `inventory_attachments` (
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

-- Verify
SELECT 'Tables created successfully!' AS status;
SELECT COUNT(*) AS inventory_items_count FROM inventory_items;

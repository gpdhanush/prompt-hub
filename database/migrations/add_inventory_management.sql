-- ============================================
-- INVENTORY MANAGEMENT TABLES
-- ============================================
-- Migration: Add Inventory Management Module
-- Created: 2024
-- Description: Complete schema for Inventory Management system
--              Supports stock tracking, adjustments, and history
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- 1. INVENTORY ITEMS
-- ============================================
-- This table stores inventory items that can be tracked by quantity
-- Separate from assets table which tracks individual items
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
  INDEX `idx_inventory_category` (`asset_category_id`),
  INDEX `idx_inventory_code` (`asset_code`),
  INDEX `idx_inventory_name` (`asset_name`),
  INDEX `idx_inventory_stock` (`current_stock`),
  INDEX `idx_inventory_min_stock` (`min_stock_level`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. INVENTORY TRANSACTIONS
-- ============================================
-- Tracks all stock adjustments and movements
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
  INDEX `idx_transaction_item` (`inventory_item_id`),
  INDEX `idx_transaction_type` (`type`),
  INDEX `idx_transaction_date` (`created_at`),
  INDEX `idx_transaction_user` (`created_by`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. INVENTORY ATTACHMENTS
-- ============================================
-- Stores file attachments related to inventory items
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
  INDEX `idx_attachment_item` (`inventory_item_id`),
  INDEX `idx_attachment_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. TRIGGER: Update inventory item timestamp on stock change
-- ============================================
DROP TRIGGER IF EXISTS `update_inventory_timestamp`;

DELIMITER $$

CREATE TRIGGER `update_inventory_timestamp`
AFTER INSERT ON `inventory_transactions`
FOR EACH ROW
BEGIN
  UPDATE `inventory_items`
  SET `last_updated` = NOW()
  WHERE `id` = NEW.inventory_item_id;
END$$

DELIMITER ;

-- ============================================
-- 5. VIEW: Low Stock Items
-- ============================================
CREATE OR REPLACE VIEW `v_low_stock_items` AS
SELECT 
  i.id,
  i.asset_name,
  i.asset_code,
  i.current_stock,
  i.min_stock_level,
  i.asset_category_id,
  c.name AS category_name,
  (i.min_stock_level - i.current_stock) AS deficit,
  CASE 
    WHEN i.current_stock = 0 THEN 'out_of_stock'
    WHEN i.current_stock <= i.min_stock_level THEN 'low_stock'
    ELSE 'in_stock'
  END AS stock_status
FROM `inventory_items` i
INNER JOIN `asset_categories` c ON i.asset_category_id = c.id
WHERE i.current_stock <= i.min_stock_level
ORDER BY 
  CASE 
    WHEN i.current_stock = 0 THEN 1
    WHEN i.current_stock <= i.min_stock_level THEN 2
    ELSE 3
  END,
  i.current_stock ASC;

-- ============================================
-- 6. VIEW: Inventory Stats Summary
-- ============================================
CREATE OR REPLACE VIEW `v_inventory_stats` AS
SELECT 
  COUNT(*) AS total_items,
  SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
  SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 ELSE 0 END) AS low_stock_count,
  SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) AS in_stock_count,
  SUM(current_stock * COALESCE(unit_price, 0)) AS total_value,
  SUM(current_stock) AS total_quantity
FROM `inventory_items`;

-- ============================================
-- END OF MIGRATION
-- ============================================
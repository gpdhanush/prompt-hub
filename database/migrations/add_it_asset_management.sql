-- ============================================
-- IT ASSET MANAGEMENT TABLES
-- ============================================
-- Migration: Add IT Asset Management Module
-- Created: 2024
-- Description: Complete schema for IT Asset Management system
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- 1. ASSET CATEGORIES (Master Table)
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_categories` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_category_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. ASSETS (Main Inventory Table)
-- ============================================
CREATE TABLE IF NOT EXISTS `assets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_code` VARCHAR(50) NOT NULL UNIQUE,
  `asset_category_id` INT UNSIGNED NOT NULL,
  `brand` VARCHAR(100),
  `model` VARCHAR(100),
  `serial_number` VARCHAR(255),
  `purchase_date` DATE,
  `purchase_price` DECIMAL(10, 2),
  `warranty_expiry` DATE,
  `vendor_name` VARCHAR(255),
  `vendor_contact` VARCHAR(255),
  `status` ENUM('available', 'assigned', 'repair', 'damaged', 'retired', 'lost') DEFAULT 'available',
  `location` VARCHAR(255),
  `notes` TEXT,
  `barcode` VARCHAR(100),
  `qr_code` VARCHAR(255),
  `created_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_category_id`) REFERENCES `asset_categories`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_asset_code` (`asset_code`),
  INDEX `idx_asset_status` (`status`),
  INDEX `idx_asset_category` (`asset_category_id`),
  INDEX `idx_serial_number` (`serial_number`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 3. ASSET LAPTOP DETAILS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_laptop_details` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL UNIQUE,
  `os_type` ENUM('mac', 'windows', 'linux') NOT NULL,
  `mac_address` VARCHAR(17),
  `processor` VARCHAR(255),
  `ram_gb` INT UNSIGNED,
  `storage_gb` INT UNSIGNED,
  `storage_type` ENUM('SSD', 'HDD', 'NVMe') DEFAULT 'SSD',
  `screen_size` VARCHAR(20),
  `graphics_card` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  INDEX `idx_laptop_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. ASSET MOBILE DETAILS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_mobile_details` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL UNIQUE,
  `device_type` ENUM('android', 'iphone') NOT NULL,
  `imei_1` VARCHAR(15),
  `imei_2` VARCHAR(15),
  `storage_gb` INT UNSIGNED,
  `screen_size` VARCHAR(20),
  `battery_capacity` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  INDEX `idx_mobile_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 5. ASSET ACCESSORY DETAILS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_accessory_details` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL UNIQUE,
  `specification` TEXT,
  `compatibility` VARCHAR(255),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  INDEX `idx_accessory_asset` (`asset_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 6. ASSET ASSIGNMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_assignments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL,
  `employee_id` INT UNSIGNED NOT NULL,
  `assigned_date` DATE NOT NULL,
  `returned_date` DATE NULL,
  `condition_on_assign` ENUM('excellent', 'good', 'fair', 'poor') DEFAULT 'good',
  `condition_on_return` ENUM('excellent', 'good', 'fair', 'poor') NULL,
  `status` ENUM('active', 'returned', 'lost', 'damaged') DEFAULT 'active',
  `assigned_by` INT UNSIGNED,
  `returned_to` INT UNSIGNED,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`assigned_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`returned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_assignment_asset` (`asset_id`),
  INDEX `idx_assignment_employee` (`employee_id`),
  INDEX `idx_assignment_status` (`status`),
  INDEX `idx_assigned_date` (`assigned_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 7. ASSET TICKETS (Requests/Issues)
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_tickets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_number` VARCHAR(50) NOT NULL UNIQUE,
  `employee_id` INT UNSIGNED NOT NULL,
  `asset_id` INT UNSIGNED NULL,
  `ticket_type` ENUM('new_request', 'repair', 'replacement', 'return', 'accessory_request', 'damage_report') NOT NULL,
  `category` VARCHAR(100),
  `subject` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `priority` ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
  `status` ENUM('open', 'approved', 'rejected', 'in_progress', 'resolved', 'closed') DEFAULT 'open',
  `admin_comment` TEXT,
  `resolved_at` TIMESTAMP NULL,
  `resolved_by` INT UNSIGNED,
  `sla_deadline` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`resolved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_ticket_number` (`ticket_number`),
  INDEX `idx_ticket_employee` (`employee_id`),
  INDEX `idx_ticket_asset` (`asset_id`),
  INDEX `idx_ticket_status` (`status`),
  INDEX `idx_ticket_type` (`ticket_type`),
  INDEX `idx_ticket_priority` (`priority`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 8. ASSET AUDIT LOGS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL,
  `action` ENUM('created', 'updated', 'assigned', 'returned', 'repaired', 'damaged', 'retired', 'status_changed') NOT NULL,
  `performed_by` INT UNSIGNED NOT NULL,
  `performed_on` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `old_value` TEXT,
  `new_value` TEXT,
  `remarks` TEXT,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`performed_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_audit_asset` (`asset_id`),
  INDEX `idx_audit_performed_by` (`performed_by`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_performed_on` (`performed_on`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. ASSET MAINTENANCE
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_maintenance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `asset_id` INT UNSIGNED NOT NULL,
  `ticket_id` INT UNSIGNED NULL,
  `maintenance_type` ENUM('repair', 'preventive', 'warranty', 'upgrade') NOT NULL,
  `vendor_name` VARCHAR(255),
  `vendor_contact` VARCHAR(255),
  `cost` DECIMAL(10, 2),
  `start_date` DATE NOT NULL,
  `end_date` DATE NULL,
  `status` ENUM('scheduled', 'in_progress', 'completed', 'cancelled') DEFAULT 'scheduled',
  `description` TEXT,
  `notes` TEXT,
  `created_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`ticket_id`) REFERENCES `asset_tickets`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_maintenance_asset` (`asset_id`),
  INDEX `idx_maintenance_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 10. SEED DATA - Asset Categories
-- ============================================
INSERT INTO `asset_categories` (`name`, `description`) VALUES
('Laptop', 'Laptop computers (Mac/Windows/Linux)'),
('Mobile', 'Mobile devices (Android/iPhone)'),
('Testing Device', 'Devices used for testing purposes'),
('Mouse', 'Computer mouse accessories'),
('Charger', 'Charging cables and adapters'),
('Keyboard', 'Keyboard accessories'),
('Headset', 'Audio headsets and headphones'),
('Notebook', 'Physical notebooks'),
('Pen', 'Writing pens'),
('Other', 'Other miscellaneous accessories')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================
-- END OF MIGRATION
-- ============================================

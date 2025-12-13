-- ============================================
-- ASSET APPROVALS TABLE
-- ============================================
-- Migration: Add Asset Approvals Module
-- Created: 2024
-- Description: Approval workflow for asset assignments and requests
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- ASSET APPROVALS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_approvals` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `request_type` ENUM('assignment', 'return', 'maintenance', 'purchase', 'disposal') NOT NULL,
  `asset_id` INT UNSIGNED NULL,
  `assignment_id` INT UNSIGNED NULL,
  `maintenance_id` INT UNSIGNED NULL,
  `ticket_id` INT UNSIGNED NULL,
  `requested_by` INT UNSIGNED NOT NULL,
  `requested_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `approver_id` INT UNSIGNED NULL,
  `approved_at` TIMESTAMP NULL,
  `status` ENUM('pending', 'approved', 'rejected', 'cancelled') DEFAULT 'pending',
  `approval_level` INT UNSIGNED DEFAULT 1,
  `comments` TEXT,
  `rejection_reason` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`asset_id`) REFERENCES `assets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assignment_id`) REFERENCES `asset_assignments`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`maintenance_id`) REFERENCES `asset_maintenance`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`ticket_id`) REFERENCES `asset_tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_approval_type` (`request_type`),
  INDEX `idx_approval_status` (`status`),
  INDEX `idx_approval_requested_by` (`requested_by`),
  INDEX `idx_approval_approver` (`approver_id`),
  INDEX `idx_approval_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- ASSET SETTINGS (Configuration)
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `setting_key` VARCHAR(100) NOT NULL UNIQUE,
  `setting_value` TEXT,
  `setting_type` ENUM('string', 'number', 'boolean', 'json') DEFAULT 'string',
  `description` TEXT,
  `category` VARCHAR(50) DEFAULT 'general',
  `updated_by` INT UNSIGNED NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_setting_key` (`setting_key`),
  INDEX `idx_setting_category` (`category`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default settings
INSERT INTO `asset_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `category`) VALUES
('auto_approve_assignments', 'false', 'boolean', 'Automatically approve asset assignments', 'approvals'),
('require_approval_for_returns', 'false', 'boolean', 'Require approval for asset returns', 'approvals'),
('low_stock_threshold', '10', 'number', 'Default low stock threshold for inventory alerts', 'inventory'),
('warranty_reminder_days', '30', 'number', 'Days before warranty expiry to send reminder', 'notifications'),
('enable_barcode_scanning', 'true', 'boolean', 'Enable barcode scanning for assets', 'features'),
('default_asset_status', 'available', 'string', 'Default status for new assets', 'assets'),
('asset_code_prefix', 'AST', 'string', 'Prefix for auto-generated asset codes', 'assets'),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications for asset events', 'notifications')
ON DUPLICATE KEY UPDATE `setting_key` = VALUES(`setting_key`);

-- ============================================
-- END OF MIGRATION
-- ============================================

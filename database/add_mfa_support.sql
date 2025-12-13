-- ============================================
-- MFA (Multi-Factor Authentication) Support
-- Migration: Add MFA columns and role enforcement table
-- ============================================

-- Add missing MFA columns to users table
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `mfa_backup_codes` JSON NULL AFTER `mfa_secret`,
ADD COLUMN IF NOT EXISTS `mfa_verified_at` DATETIME NULL AFTER `mfa_backup_codes`;

-- Create MFA role enforcement settings table
CREATE TABLE IF NOT EXISTS `mfa_role_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL UNIQUE,
  `mfa_required` TINYINT(1) DEFAULT 0,
  `enforced_by_admin` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_mfa_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create MFA verification attempts table for rate limiting
CREATE TABLE IF NOT EXISTS `mfa_verification_attempts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `ip_address` VARCHAR(45),
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `success` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_mfa_user` (`user_id`),
  INDEX `idx_mfa_ip` (`ip_address`),
  INDEX `idx_mfa_attempted` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default MFA settings for roles
-- Admin → MFA mandatory
-- Team Lead (TL) → MFA mandatory  
-- Employee → optional
INSERT INTO `mfa_role_settings` (`role_id`, `mfa_required`, `enforced_by_admin`)
SELECT r.id, 
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin') THEN 1
    WHEN r.name IN ('Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as mfa_required,
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as enforced_by_admin
FROM `roles` r
WHERE r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader', 'Employee')
ON DUPLICATE KEY UPDATE 
  `mfa_required` = VALUES(`mfa_required`),
  `enforced_by_admin` = VALUES(`enforced_by_admin`);

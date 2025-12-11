-- Additional Employee Profile Schema
-- Run this after the main schema.sql to add employee profile fields

USE `admin_dashboard`;

-- Add columns to employees table for profile details
ALTER TABLE `employees` 
  ADD COLUMN IF NOT EXISTS `photo_path` VARCHAR(500) AFTER `status`,
  ADD COLUMN IF NOT EXISTS `address_line1` VARCHAR(255) AFTER `photo_path`,
  ADD COLUMN IF NOT EXISTS `address_line2` VARCHAR(255) AFTER `address_line1`,
  ADD COLUMN IF NOT EXISTS `city` VARCHAR(100) AFTER `address_line2`,
  ADD COLUMN IF NOT EXISTS `state` VARCHAR(100) AFTER `city`,
  ADD COLUMN IF NOT EXISTS `postal_code` VARCHAR(20) AFTER `state`,
  ADD COLUMN IF NOT EXISTS `country` VARCHAR(100) DEFAULT 'India' AFTER `postal_code`,
  ADD COLUMN IF NOT EXISTS `bank_name` VARCHAR(255) AFTER `country`,
  ADD COLUMN IF NOT EXISTS `bank_account_number` VARCHAR(50) AFTER `bank_name`,
  ADD COLUMN IF NOT EXISTS `bank_ifsc` VARCHAR(20) AFTER `bank_account_number`,
  ADD COLUMN IF NOT EXISTS `bank_branch` VARCHAR(255) AFTER `bank_ifsc`,
  ADD COLUMN IF NOT EXISTS `pan_number` VARCHAR(20) AFTER `bank_branch`,
  ADD COLUMN IF NOT EXISTS `aadhaar_number` VARCHAR(20) AFTER `pan_number`,
  ADD COLUMN IF NOT EXISTS `profile_completed` BOOLEAN DEFAULT FALSE AFTER `aadhaar_number`;

-- Employee Documents table
CREATE TABLE IF NOT EXISTS `employee_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `document_type` ENUM('Aadhaar', 'PAN', 'Bank Passbook', 'Driving License', 'Passport', 'Other') NOT NULL,
  `document_number` VARCHAR(100),
  `file_path` VARCHAR(500) NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `mime_type` VARCHAR(100),
  `file_size` BIGINT UNSIGNED,
  `uploaded_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `verified` BOOLEAN DEFAULT FALSE,
  `verified_by` INT UNSIGNED,
  `verified_at` TIMESTAMP NULL,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`verified_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_emp_doc_employee` (`employee_id`),
  INDEX `idx_emp_doc_type` (`document_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Password change history (for security)
CREATE TABLE IF NOT EXISTS `password_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `password_hash` VARCHAR(255) NOT NULL,
  `changed_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `changed_by` INT UNSIGNED,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_password_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


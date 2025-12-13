-- ============================================
-- TICKET COMMENTS AND ATTACHMENTS TABLES
-- ============================================
-- Migration: Add Ticket Comments and Attachments
-- Created: 2024
-- Description: Adds support for ticket comments and file attachments
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- 1. TICKET COMMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_ticket_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` INT UNSIGNED NOT NULL,
  `comment` TEXT NOT NULL,
  `is_internal` TINYINT(1) DEFAULT 0,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `asset_tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_comment_ticket` (`ticket_id`),
  INDEX `idx_comment_created_by` (`created_by`),
  INDEX `idx_comment_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. TICKET ATTACHMENTS
-- ============================================
CREATE TABLE IF NOT EXISTS `asset_ticket_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `ticket_id` INT UNSIGNED NOT NULL,
  `filename` VARCHAR(255) NOT NULL,
  `file_path` VARCHAR(500) NOT NULL,
  `file_url` VARCHAR(500) NULL,
  `file_size` BIGINT UNSIGNED NULL,
  `file_type` VARCHAR(100) NULL,
  `comment` TEXT NULL,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`ticket_id`) REFERENCES `asset_tickets`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`) ON DELETE RESTRICT,
  INDEX `idx_attachment_ticket` (`ticket_id`),
  INDEX `idx_attachment_uploaded_by` (`uploaded_by`),
  INDEX `idx_attachment_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- END OF MIGRATION
-- ============================================

-- App Issues Module Schema
-- This module allows users to report webapp-level issues with anonymous support

CREATE TABLE IF NOT EXISTS `app_issues` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` CHAR(36) NOT NULL UNIQUE,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT NOT NULL,
  `issue_type` ENUM('bug', 'feedback') NOT NULL DEFAULT 'bug',
  `status` ENUM('open','in_review','assigned','in_progress','need_testing','testing','resolved','closed') NOT NULL DEFAULT 'open',
  `assigned_to` INT UNSIGNED NULL,
  `is_anonymous` TINYINT(1) NOT NULL DEFAULT 0,
  `auto_bug_created` TINYINT(1) NOT NULL DEFAULT 0,
  `linked_bug_id` INT UNSIGNED NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_app_issue_uuid` (`uuid`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`linked_bug_id`) REFERENCES `bugs`(`id`) ON DELETE SET NULL,

  INDEX `idx_app_issue_user` (`user_id`),
  INDEX `idx_app_issue_uuid` (`uuid`),
  INDEX `idx_app_issue_status` (`status`),
  INDEX `idx_app_issue_type` (`issue_type`),
  INDEX `idx_app_issue_assigned` (`assigned_to`),
  INDEX `idx_app_issue_anonymous` (`is_anonymous`),
  INDEX `idx_app_issue_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_issue_replies` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `issue_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `message` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  FOREIGN KEY (`issue_id`) REFERENCES `app_issues`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,

  INDEX `idx_app_issue_reply_issue` (`issue_id`),
  INDEX `idx_app_issue_reply_user` (`user_id`),
  INDEX `idx_app_issue_reply_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `app_issue_attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `issue_id` INT UNSIGNED NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  PRIMARY KEY (`id`),
  FOREIGN KEY (`issue_id`) REFERENCES `app_issues`(`id`) ON DELETE CASCADE,

  INDEX `idx_app_issue_attachment_issue` (`issue_id`),
  INDEX `idx_app_issue_attachment_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

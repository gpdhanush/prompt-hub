-- ============================================
-- PRODUCTION DATABASE MIGRATIONS - PART 04
-- ============================================
-- Kanban Tables (with orphaned data cleanup)
-- Database: prasowla_ntpl_admin
-- ============================================
-- IMPORTANT: This part cleans up orphaned kanban_board_members before adding constraints
-- ============================================

USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- CLEANUP ORPHANED DATA
-- ============================================
-- Remove orphaned kanban_board_members that reference non-existent boards
-- This fixes the foreign key constraint error

-- Delete orphaned kanban_board_members
DELETE kbm FROM `kanban_board_members` kbm
LEFT JOIN `kanban_boards` kb ON kbm.board_id = kb.id
WHERE kb.id IS NULL;

-- Delete orphaned kanban_columns
DELETE kc FROM `kanban_columns` kc
LEFT JOIN `kanban_boards` kb ON kc.board_id = kb.id
WHERE kb.id IS NULL;

-- Delete orphaned kanban_tasks
DELETE kt FROM `kanban_tasks` kt
LEFT JOIN `kanban_boards` kb ON kt.board_id = kb.id
WHERE kb.id IS NULL;

-- Delete orphaned kanban_tasks (by column)
DELETE kt FROM `kanban_tasks` kt
LEFT JOIN `kanban_columns` kc ON kt.column_id = kc.id
WHERE kc.id IS NULL;

-- Delete orphaned kanban_integrations
DELETE ki FROM `kanban_integrations` ki
LEFT JOIN `kanban_boards` kb ON ki.board_id = kb.id
WHERE kb.id IS NULL;

-- Delete orphaned kanban_task_history
DELETE kth FROM `kanban_task_history` kth
LEFT JOIN `kanban_tasks` kt ON kth.task_id = kt.id
WHERE kt.id IS NULL;

-- Delete orphaned kanban_time_logs
DELETE ktl FROM `kanban_time_logs` ktl
LEFT JOIN `kanban_tasks` kt ON ktl.task_id = kt.id
WHERE kt.id IS NULL;

-- ============================================
-- KANBAN BOARDS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_boards` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `project_id` INT UNSIGNED,
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_kanban_board_project` (`project_id`),
  INDEX `idx_kanban_board_active` (`is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN COLUMNS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_columns` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(100) NOT NULL,
  `status` VARCHAR(50) NOT NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `color` VARCHAR(7) DEFAULT '#3B82F6',
  `wip_limit` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON DELETE CASCADE,
  INDEX `idx_kanban_column_board` (`board_id`),
  INDEX `idx_kanban_column_position` (`board_id`, `position`),
  UNIQUE KEY `uk_board_status` (`board_id`, `status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN TASKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` INT UNSIGNED NOT NULL,
  `column_id` INT UNSIGNED NOT NULL,
  `task_code` VARCHAR(20) NOT NULL UNIQUE,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  `status` VARCHAR(50) NOT NULL,
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `assigned_to` INT UNSIGNED,
  `due_date` DATE,
  `tags` JSON,
  `github_repo` VARCHAR(500),
  `last_commit_hash` VARCHAR(40),
  `last_commit_message` TEXT,
  `auto_updated` BOOLEAN DEFAULT FALSE,
  `is_locked` BOOLEAN DEFAULT FALSE,
  `estimated_time` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Estimated time in hours',
  `actual_time` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Actual time tracked in hours',
  `project_id` INT UNSIGNED DEFAULT NULL COMMENT 'Direct project reference',
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_kanban_task_code` (`task_code`),
  INDEX `idx_kanban_task_board` (`board_id`),
  INDEX `idx_kanban_task_column` (`column_id`),
  INDEX `idx_kanban_task_status` (`status`),
  INDEX `idx_kanban_task_position` (`column_id`, `position`),
  INDEX `idx_kanban_task_github` (`github_repo`, `last_commit_hash`),
  INDEX `idx_kanban_task_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN INTEGRATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_integrations` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` INT UNSIGNED NOT NULL,
  `github_repo` VARCHAR(500) NOT NULL,
  `webhook_secret` VARCHAR(255) NOT NULL,
  `auto_status_enabled` BOOLEAN DEFAULT TRUE,
  `status_mapping` JSON,
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_kanban_integration_board` (`board_id`),
  INDEX `idx_kanban_integration_repo` (`github_repo`),
  UNIQUE KEY `uk_board_repo` (`board_id`, `github_repo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN TASK HISTORY TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_task_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `source` ENUM('manual', 'github', 'socket', 'bulk') DEFAULT 'manual',
  `old_status` VARCHAR(50),
  `new_status` VARCHAR(50) NOT NULL,
  `old_column_id` INT UNSIGNED,
  `new_column_id` INT UNSIGNED NOT NULL,
  `old_position` INT UNSIGNED,
  `new_position` INT UNSIGNED,
  `changed_by` INT UNSIGNED,
  `commit_hash` VARCHAR(40),
  `commit_message` TEXT,
  `metadata` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`old_column_id`) REFERENCES `kanban_columns`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`new_column_id`) REFERENCES `kanban_columns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_kanban_history_task` (`task_id`),
  INDEX `idx_kanban_history_source` (`source`),
  INDEX `idx_kanban_history_created` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN BOARD MEMBERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_board_members` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `board_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` ENUM('viewer', 'member', 'admin') DEFAULT 'member',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_board_user` (`board_id`, `user_id`),
  INDEX `idx_kanban_member_board` (`board_id`),
  INDEX `idx_kanban_member_user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- KANBAN TIME LOGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS `kanban_time_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `started_at` TIMESTAMP NOT NULL,
  `ended_at` TIMESTAMP NULL,
  `duration_minutes` INT UNSIGNED DEFAULT NULL,
  `is_active` BOOLEAN DEFAULT FALSE,
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `kanban_tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_time_log_task` (`task_id`),
  INDEX `idx_time_log_user` (`user_id`),
  INDEX `idx_time_log_active` (`task_id`, `user_id`, `is_active`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


-- ============================================
-- KANBAN MODULE MIGRATION
-- ============================================
-- Real-time Kanban Board with GitHub Integration
-- ============================================

USE `admin_dashboard`;

SET FOREIGN_KEY_CHECKS = 0;

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
  `status` VARCHAR(50) NOT NULL, -- Maps to task status (e.g., 'Open', 'In Progress', 'Testing', 'Done')
  `position` INT UNSIGNED NOT NULL DEFAULT 0,
  `color` VARCHAR(7) DEFAULT '#3B82F6', -- Hex color
  `wip_limit` INT UNSIGNED, -- Work in progress limit (optional)
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
  `task_code` VARCHAR(20) NOT NULL UNIQUE, -- e.g., KAN-1023
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  `status` VARCHAR(50) NOT NULL, -- Current status (matches column status)
  `position` INT UNSIGNED NOT NULL DEFAULT 0, -- Position within column
  `assigned_to` INT UNSIGNED,
  `due_date` DATE,
  `tags` JSON,
  `github_repo` VARCHAR(500),
  `last_commit_hash` VARCHAR(40),
  `last_commit_message` TEXT,
  `auto_updated` BOOLEAN DEFAULT FALSE,
  `is_locked` BOOLEAN DEFAULT FALSE,
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`board_id`) REFERENCES `kanban_boards`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`column_id`) REFERENCES `kanban_columns`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_kanban_task_code` (`task_code`),
  INDEX `idx_kanban_task_board` (`board_id`),
  INDEX `idx_kanban_task_column` (`column_id`),
  INDEX `idx_kanban_task_status` (`status`),
  INDEX `idx_kanban_task_position` (`column_id`, `position`),
  INDEX `idx_kanban_task_github` (`github_repo`, `last_commit_hash`)
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
  `status_mapping` JSON, -- Custom status mappings (optional)
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
  `metadata` JSON, -- Additional context (e.g., bulk update details)
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

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- DEFAULT DATA
-- ============================================
-- Insert default columns template (will be used when creating new boards)
-- Note: Actual columns will be created per board, this is just a reference


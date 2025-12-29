-- ============================================
-- KANBAN TIME TRACKING MIGRATION
-- ============================================
-- Add time estimation and tracking fields to kanban_tasks
-- ============================================

USE `prasowla_ntpl_admin`;

-- Add time tracking columns to kanban_tasks
ALTER TABLE `kanban_tasks`
ADD COLUMN IF NOT EXISTS `estimated_time` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Estimated time in hours',
ADD COLUMN IF NOT EXISTS `actual_time` DECIMAL(10, 2) DEFAULT NULL COMMENT 'Actual time tracked in hours',
ADD COLUMN IF NOT EXISTS `project_id` INT UNSIGNED DEFAULT NULL COMMENT 'Direct project reference',
ADD INDEX IF NOT EXISTS `idx_kanban_task_project` (`project_id`),
ADD FOREIGN KEY IF NOT EXISTS `fk_kanban_task_project` (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;

-- Create time tracking log table
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


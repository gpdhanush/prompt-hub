-- ============================================
-- CONSOLIDATED DATABASE MIGRATIONS - PART 02
-- ============================================
-- Task Management, Bugs, Timesheets, Prompts
-- ============================================

-- USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- TASK MANAGEMENT TABLES
-- ============================================

-- Tasks table (with role assignments)
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_code` VARCHAR(10) NOT NULL UNIQUE,
  `project_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `assigned_to` INT UNSIGNED,
  `developer_id` INT UNSIGNED,
  `designer_id` INT UNSIGNED,
  `tester_id` INT UNSIGNED,
  `priority` ENUM('Low', 'Med', 'High') DEFAULT 'Med',
  `stage` ENUM('Analysis', 'Documentation', 'Development', 'Testing', 'Pre-Prod', 'Production', 'Closed') DEFAULT 'Analysis',
  `status` ENUM('Open', 'In Progress', 'Ready for Testing', 'Testing', 'Failed', 'Closed', 'Not a Bug', 'Production Bug', 'TBD') DEFAULT 'Open',
  `deadline` DATE,
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `is_open` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`designer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`tester_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_task_code` (`task_code`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_stage` (`stage`),
  INDEX `idx_task_priority` (`priority`),
  INDEX `idx_task_project` (`project_id`),
  INDEX `idx_task_developer` (`developer_id`),
  INDEX `idx_task_designer` (`designer_id`),
  INDEX `idx_task_tester` (`tester_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task Comments table (threaded)
CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(50),
  `comment` TEXT NOT NULL,
  `parent_comment_id` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_comment_id`) REFERENCES `task_comments`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_comment` (`task_id`),
  INDEX `idx_comment_parent` (`parent_comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Task History table
CREATE TABLE IF NOT EXISTS `task_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `from_status` VARCHAR(50),
  `to_status` VARCHAR(50),
  `changed_by` INT UNSIGNED NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `note` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`),
  INDEX `idx_task_history` (`task_id`),
  INDEX `idx_history_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bugs table (with all advanced fields)
CREATE TABLE IF NOT EXISTS `bugs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bug_code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255),
  `task_id` INT UNSIGNED,
  `project_id` INT UNSIGNED,
  `reported_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `assigned_to` INT UNSIGNED,
  `team_lead_id` INT UNSIGNED,
  `severity` ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Low',
  `bug_type` ENUM('Functional', 'UI/UX', 'Performance', 'Security', 'Integration', 'Crash', 'Data Issue') DEFAULT 'Functional',
  `priority` ENUM('P1', 'P2', 'P3', 'P4') DEFAULT 'P4',
  `status` ENUM('Open', 'In Progress', 'In Review', 'Reopened', 'Blocked', 'Fixed', 'Closed', 'Fixing', 'Retesting', 'Passed', 'Rejected', 'Duplicate', 'Not a Bug') DEFAULT 'Open',
  `resolution_type` ENUM('Fixed', 'Duplicate', 'Not a Bug', 'Won\'t Fix', 'Cannot Reproduce', 'Deferred'),
  `description` TEXT NOT NULL,
  `steps_to_reproduce` TEXT,
  `expected_behavior` TEXT,
  `actual_behavior` TEXT,
  `browser` VARCHAR(100),
  `device` ENUM('Mobile', 'Desktop', 'Tablet'),
  `os` VARCHAR(100),
  `app_version` VARCHAR(50),
  `api_endpoint` VARCHAR(500),
  `target_fix_date` DATE,
  `actual_fix_date` DATE,
  `reopened_count` INT UNSIGNED DEFAULT 0,
  `tags` VARCHAR(500),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_bug_code` (`bug_code`),
  INDEX `idx_bug_status` (`status`),
  INDEX `idx_bug_severity` (`severity`),
  INDEX `idx_bug_project` (`project_id`),
  INDEX `idx_bug_priority` (`priority`),
  INDEX `idx_bug_type` (`bug_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Bug Comments table
CREATE TABLE IF NOT EXISTS `bug_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bug_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `parent_id` INT UNSIGNED NULL,
  `comment_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_id`) REFERENCES `bug_comments`(`id`) ON DELETE CASCADE,
  INDEX `idx_bug_comments_bug_id` (`bug_id`),
  INDEX `idx_bug_comments_parent_id` (`parent_id`),
  INDEX `idx_bug_comments_user_id` (`user_id`),
  INDEX `idx_bug_comments_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attachments table
CREATE TABLE IF NOT EXISTS `attachments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED,
  `bug_id` INT UNSIGNED,
  `reimbursement_id` INT UNSIGNED,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `path` VARCHAR(500) NOT NULL,
  `original_filename` VARCHAR(255),
  `mime_type` VARCHAR(100),
  `size` BIGINT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`reimbursement_id`) REFERENCES `reimbursements`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`),
  INDEX `idx_attachment_task` (`task_id`),
  INDEX `idx_attachment_bug` (`bug_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Timesheets table
CREATE TABLE IF NOT EXISTS `timesheets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `task_id` INT UNSIGNED,
  `bug_id` INT UNSIGNED,
  `project_id` INT UNSIGNED,
  `date` DATE NOT NULL,
  `hours` DECIMAL(4, 2) NOT NULL,
  `notes` TEXT,
  `approved_by` INT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_timesheet_date` (`date`),
  INDEX `idx_timesheet_employee` (`employee_id`),
  INDEX `idx_timesheet_bug` (`bug_id`),
  INDEX `idx_timesheet_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- AI PROMPT LIBRARY TABLES
-- ============================================

-- Prompts table
CREATE TABLE IF NOT EXISTS `prompts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `body` TEXT NOT NULL,
  `variables` JSON,
  `category` ENUM('System Spec', 'Project Setup', 'API Skeleton', 'DB Schema', 'UI Flow', 'Test Cases') DEFAULT 'System Spec',
  `tags` JSON,
  `is_public` BOOLEAN DEFAULT FALSE,
  `created_by` INT UNSIGNED NOT NULL,
  `approved_by` INT UNSIGNED,
  `is_approved` BOOLEAN DEFAULT FALSE,
  `version` INT UNSIGNED DEFAULT 1,
  `use_count` INT UNSIGNED DEFAULT 0,
  `export_count` INT UNSIGNED DEFAULT 0,
  `last_used_at` TIMESTAMP NULL,
  `last_used_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`last_used_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_prompt_category` (`category`),
  INDEX `idx_prompt_approved` (`is_approved`),
  FULLTEXT INDEX `ft_prompt_search` (`title`, `description`, `body`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Prompt Logs table
CREATE TABLE IF NOT EXISTS `prompt_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `prompt_id` INT UNSIGNED NOT NULL,
  `executed_by` INT UNSIGNED NOT NULL,
  `action` ENUM('view', 'preview', 'export', 'execute') NOT NULL,
  `variables_used` JSON,
  `preview_output` TEXT,
  `exported_as` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`prompt_id`) REFERENCES `prompts`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`executed_by`) REFERENCES `users`(`id`),
  INDEX `idx_prompt_log_action` (`action`),
  INDEX `idx_prompt_log_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- NOTIFICATION & AUDIT TABLES
-- ============================================

-- Notifications table
CREATE TABLE IF NOT EXISTS `notifications` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `type` VARCHAR(50) NOT NULL,
  `title` VARCHAR(255),
  `message` TEXT,
  `payload` JSON,
  `is_read` BOOLEAN DEFAULT FALSE,
  `read_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_notification_user` (`user_id`),
  INDEX `idx_notification_read` (`is_read`),
  INDEX `idx_notification_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Audit Logs table
CREATE TABLE IF NOT EXISTS `audit_logs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED,
  `action` VARCHAR(100) NOT NULL,
  `module` VARCHAR(50) NOT NULL,
  `item_id` INT UNSIGNED,
  `item_type` VARCHAR(50),
  `before_data` JSON,
  `after_data` JSON,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_audit_user` (`user_id`),
  INDEX `idx_audit_module` (`module`),
  INDEX `idx_audit_action` (`action`),
  INDEX `idx_audit_date` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- SETTINGS TABLE
-- ============================================

-- Settings table
CREATE TABLE IF NOT EXISTS `settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `currency_symbol` VARCHAR(3) DEFAULT '$',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- FCM TOKENS TABLE
-- ============================================

-- FCM token storage table
CREATE TABLE IF NOT EXISTS `fcm_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token` TEXT NOT NULL,
  `device_id` VARCHAR(255) NULL,
  `device_type` VARCHAR(50) DEFAULT 'web',
  `browser` VARCHAR(100),
  `user_agent` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_fcm_user` (`user_id`),
  INDEX `idx_fcm_active` (`is_active`),
  INDEX `idx_fcm_token` (`token`(255)),
  INDEX `idx_fcm_device` (`device_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- CALENDAR REMINDERS TABLE
-- ============================================

-- Calendar reminders table
CREATE TABLE IF NOT EXISTS `calendar_reminders` (
  `id` INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `reminder_date` DATE NOT NULL,
  `reminder_time` TIME NOT NULL,
  `reminder_type` ENUM('call', 'meeting', 'deadline', 'important_date', 'other') DEFAULT 'other',
  `is_completed` BOOLEAN DEFAULT FALSE,
  `sent_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_user_date` (`user_id`, `reminder_date`),
  INDEX `idx_reminder_datetime` (`reminder_date`, `reminder_time`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- VIEWS
-- ============================================

-- View for project total worked time
CREATE OR REPLACE VIEW `project_total_worked_time` AS
SELECT 
  project_id,
  SUM(total_minutes) as total_minutes,
  ROUND(SUM(total_minutes) / 60, 2) as total_hours,
  COUNT(DISTINCT user_id) as unique_contributors,
  COUNT(*) as total_entries
FROM project_daily_status
GROUP BY project_id;

SET FOREIGN_KEY_CHECKS = 1;


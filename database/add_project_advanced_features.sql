-- Migration to add advanced project management features
-- Run this migration after add_project_fields.sql

-- Add technologies used field (JSON array)
ALTER TABLE `projects` 
ADD COLUMN `technologies_used` JSON AFTER `bitbucket_repo_url`;

-- Create change requests table
CREATE TABLE IF NOT EXISTS `project_change_requests` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `requested_by` INT UNSIGNED NOT NULL,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'In Review', 'Implemented') DEFAULT 'Pending',
  `priority` ENUM('Low', 'Medium', 'High', 'Critical') DEFAULT 'Medium',
  `impact` TEXT,
  `estimated_effort_hours` DECIMAL(5,2),
  `approved_by` INT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `rejected_reason` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`requested_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_change_request_project` (`project_id`),
  INDEX `idx_change_request_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create client call notes table
CREATE TABLE IF NOT EXISTS `project_client_call_notes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `call_date` DATETIME NOT NULL,
  `call_duration_minutes` INT UNSIGNED,
  `participants` TEXT,
  `notes` TEXT NOT NULL,
  `action_items` TEXT,
  `follow_up_required` BOOLEAN DEFAULT FALSE,
  `follow_up_date` DATE,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  INDEX `idx_call_notes_project` (`project_id`),
  INDEX `idx_call_notes_date` (`call_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project credentials table
CREATE TABLE IF NOT EXISTS `project_credentials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `credential_type` ENUM('Login', 'API Key', 'Database', 'Server', 'Third-party Service', 'Other') NOT NULL,
  `service_name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255),
  `password` VARCHAR(500), -- Encrypted in application layer
  `url` VARCHAR(500),
  `api_key` VARCHAR(500), -- Encrypted in application layer
  `notes` TEXT,
  `is_active` BOOLEAN DEFAULT TRUE,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  INDEX `idx_credentials_project` (`project_id`),
  INDEX `idx_credentials_type` (`credential_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create daily project status entries table
CREATE TABLE IF NOT EXISTS `project_daily_status` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `work_date` DATE NOT NULL,
  `hours_worked` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `minutes_worked` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_minutes` INT UNSIGNED GENERATED ALWAYS AS ((hours_worked * 60) + minutes_worked) STORED,
  `work_description` TEXT,
  `tasks_completed` TEXT,
  `blockers` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  UNIQUE KEY `uk_project_user_date` (`project_id`, `user_id`, `work_date`),
  INDEX `idx_daily_status_project` (`project_id`),
  INDEX `idx_daily_status_user` (`user_id`),
  INDEX `idx_daily_status_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project comments table (for developers, testers, designers)
CREATE TABLE IF NOT EXISTS `project_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment_type` ENUM('General', 'Developer', 'Tester', 'Designer', 'Team Lead', 'Client') DEFAULT 'General',
  `comment` TEXT NOT NULL,
  `is_internal` BOOLEAN DEFAULT TRUE,
  `attachments` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_project_comments_project` (`project_id`),
  INDEX `idx_project_comments_user` (`user_id`),
  INDEX `idx_project_comments_type` (`comment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Add file upload support to project_files (enhance existing table)
-- Add file category for better organization
ALTER TABLE `project_files` 
ADD COLUMN `file_category` VARCHAR(100) AFTER `file_type`,
ADD COLUMN `description` TEXT AFTER `file_name`,
MODIFY COLUMN `file_type` ENUM('SOW', 'Contract', 'Design Document', 'Requirement Doc', 'Change Request', 'Meeting Notes', 'Other') NOT NULL;

-- Create view for project total worked time
CREATE OR REPLACE VIEW `project_total_worked_time` AS
SELECT 
  project_id,
  SUM(total_minutes) as total_minutes,
  ROUND(SUM(total_minutes) / 60, 2) as total_hours,
  COUNT(DISTINCT user_id) as unique_contributors,
  COUNT(*) as total_entries
FROM project_daily_status
GROUP BY project_id;

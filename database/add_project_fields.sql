-- Migration to add comprehensive project fields
-- Run this migration to add all new project management fields

-- Add project logo
ALTER TABLE `projects` 
ADD COLUMN `logo_url` VARCHAR(500) AFTER `description`;

-- Add estimated delivery plan
ALTER TABLE `projects` 
ADD COLUMN `estimated_delivery_plan` TEXT AFTER `logo_url`;

-- Add client details (optional for internal projects)
ALTER TABLE `projects` 
ADD COLUMN `client_name` VARCHAR(255) AFTER `estimated_delivery_plan`,
ADD COLUMN `client_contact_person` VARCHAR(255) AFTER `client_name`,
ADD COLUMN `client_email` VARCHAR(255) AFTER `client_contact_person`,
ADD COLUMN `client_phone` VARCHAR(50) AFTER `client_email`,
ADD COLUMN `is_internal` BOOLEAN DEFAULT FALSE AFTER `client_phone`;

-- Add timeline & scheduling fields
ALTER TABLE `projects` 
ADD COLUMN `target_end_date` DATE AFTER `end_date`,
ADD COLUMN `actual_end_date` DATE AFTER `target_end_date`,
ADD COLUMN `project_duration_days` INT UNSIGNED AFTER `actual_end_date`;

-- Update status enum to include new statuses
ALTER TABLE `projects` 
MODIFY COLUMN `status` ENUM('Not Started', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Testing', 'Pre-Prod', 'Production') DEFAULT 'Not Started';

-- Add project status tracking fields
ALTER TABLE `projects` 
ADD COLUMN `risk_level` ENUM('Low', 'Medium', 'High') AFTER `status`,
ADD COLUMN `priority` ENUM('Low', 'Medium', 'High', 'Critical') AFTER `risk_level`;

-- Add daily task reporting setup
ALTER TABLE `projects` 
ADD COLUMN `daily_reporting_required` BOOLEAN DEFAULT FALSE AFTER `priority`,
ADD COLUMN `report_submission_time` TIME AFTER `daily_reporting_required`,
ADD COLUMN `auto_reminder_notifications` BOOLEAN DEFAULT FALSE AFTER `report_submission_time`;

-- Add additional notes
ALTER TABLE `projects` 
ADD COLUMN `internal_notes` TEXT AFTER `auto_reminder_notifications`,
ADD COLUMN `client_notes` TEXT AFTER `internal_notes`,
ADD COLUMN `admin_remarks` TEXT AFTER `client_notes`;

-- Add integrations
ALTER TABLE `projects` 
ADD COLUMN `github_repo_url` VARCHAR(500) AFTER `admin_remarks`,
ADD COLUMN `bitbucket_repo_url` VARCHAR(500) AFTER `github_repo_url`;

-- Create milestones table
CREATE TABLE IF NOT EXISTS `project_milestones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATE,
  `end_date` DATE,
  `status` ENUM('Not Started', 'In Progress', 'Completed', 'Delayed', 'Cancelled') DEFAULT 'Not Started',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  INDEX `idx_milestone_project` (`project_id`),
  INDEX `idx_milestone_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create project files table
CREATE TABLE IF NOT EXISTS `project_files` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `file_type` ENUM('SOW', 'Contract', 'Design Document', 'Requirement Doc', 'Other') NOT NULL,
  `file_name` VARCHAR(255) NOT NULL,
  `file_url` VARCHAR(500) NOT NULL,
  `file_size` INT UNSIGNED,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`),
  INDEX `idx_file_project` (`project_id`),
  INDEX `idx_file_type` (`file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Update project_users table to include role per employee
ALTER TABLE `project_users` 
MODIFY COLUMN `role_in_project` ENUM('admin', 'tl', 'developer', 'qa', 'designer', 'employee') DEFAULT 'employee';

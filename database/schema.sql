-- Admin Dashboard Database Schema
-- MySQL 8.0+
-- Created for Internal Admin Dashboard System

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- Database: admin_dashboard
CREATE DATABASE IF NOT EXISTS `admin_dashboard` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `admin_dashboard`;

-- ============================================
-- AUTHENTICATION & AUTHORIZATION TABLES
-- ============================================

-- Roles table
CREATE TABLE IF NOT EXISTS `roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(50) NOT NULL UNIQUE,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_role_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Permissions table
CREATE TABLE IF NOT EXISTS `permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `code` VARCHAR(100) NOT NULL UNIQUE,
  `description` TEXT,
  `module` VARCHAR(50),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_permission_code` (`code`),
  INDEX `idx_permission_module` (`module`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Role-Permission mapping
CREATE TABLE IF NOT EXISTS `role_permissions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `permission_id` INT UNSIGNED NOT NULL,
  `allowed` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_permission` (`role_id`, `permission_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_permission` (`role_id`, `permission_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Positions table
CREATE TABLE IF NOT EXISTS `positions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `description` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  INDEX `idx_position_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Users table
CREATE TABLE IF NOT EXISTS `users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NOT NULL,
  `email` VARCHAR(255) NOT NULL UNIQUE,
  `mobile` VARCHAR(20),
  `password_hash` VARCHAR(255) NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `position_id` INT UNSIGNED,
  `status` ENUM('Active', 'Inactive', 'Suspended') DEFAULT 'Active',
  `mfa_enabled` BOOLEAN DEFAULT FALSE,
  `mfa_secret` VARCHAR(255),
  `last_login` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`),
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`),
  INDEX `idx_user_email` (`email`),
  INDEX `idx_user_status` (`status`),
  INDEX `idx_user_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- EMPLOYEE MANAGEMENT TABLES
-- ============================================

-- Employees table
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `emp_code` VARCHAR(50) NOT NULL UNIQUE,
  `department` VARCHAR(100),
  `team_lead_id` INT UNSIGNED,
  `hire_date` DATE,
  `status` ENUM('Present', 'Absent', 'On Leave') DEFAULT 'Present',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`team_lead_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  INDEX `idx_emp_code` (`emp_code`),
  INDEX `idx_emp_department` (`department`),
  INDEX `idx_emp_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Attendance table
CREATE TABLE IF NOT EXISTS `attendance` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `date` DATE NOT NULL,
  `check_in` TIME,
  `check_out` TIME,
  `gps_lat` DECIMAL(10, 8),
  `gps_lng` DECIMAL(11, 8),
  `status` ENUM('Present', 'Absent', 'Half Day', 'Late') DEFAULT 'Present',
  `notes` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  UNIQUE KEY `uk_attendance_emp_date` (`employee_id`, `date`),
  INDEX `idx_attendance_date` (`date`),
  INDEX `idx_attendance_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Leaves table
CREATE TABLE IF NOT EXISTS `leaves` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `leave_type` VARCHAR(50) NOT NULL,
  `start_date` DATE NOT NULL,
  `end_date` DATE NOT NULL,
  `duration` INT UNSIGNED,
  `reason` TEXT,
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Cancelled') DEFAULT 'Pending',
  `applied_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `approved_by` INT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `rejection_reason` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_leave_status` (`status`),
  INDEX `idx_leave_dates` (`start_date`, `end_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Reimbursements table
CREATE TABLE IF NOT EXISTS `reimbursements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `amount` DECIMAL(10, 2) NOT NULL,
  `category` VARCHAR(100),
  `description` TEXT,
  `receipt_path` VARCHAR(500),
  `status` ENUM('Pending', 'Approved', 'Rejected', 'Processing', 'Paid') DEFAULT 'Pending',
  `submitted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `approved_by` INT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `rejection_reason` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_reimbursement_status` (`status`),
  INDEX `idx_reimbursement_date` (`submitted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- PROJECT MANAGEMENT TABLES
-- ============================================

-- Projects table
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `project_admin_id` INT UNSIGNED,
  `team_lead_id` INT UNSIGNED,
  `start_date` DATE,
  `end_date` DATE,
  `status` ENUM('Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold') DEFAULT 'Planning',
  `progress` INT UNSIGNED DEFAULT 0 CHECK (`progress` >= 0 AND `progress` <= 100),
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_project_code` (`project_code`),
  INDEX `idx_project_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project-User mapping
CREATE TABLE IF NOT EXISTS `project_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role_in_project` ENUM('admin', 'tl', 'employee') DEFAULT 'employee',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_project_user` (`project_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- TASK MANAGEMENT TABLES
-- ============================================

-- Tasks table
CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_code` VARCHAR(10) NOT NULL UNIQUE,
  `project_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `assigned_to` INT UNSIGNED,
  `priority` ENUM('Low', 'Med', 'High') DEFAULT 'Med',
  `stage` ENUM('Analysis', 'Documentation', 'Development', 'Testing', 'Pre-Prod', 'Production', 'Closed') DEFAULT 'Analysis',
  `status` ENUM('Open', 'In Progress', 'Ready for Testing', 'Testing', 'Failed', 'Closed', 'Not a Bug', 'Production Bug', 'TBD') DEFAULT 'Open',
  `deadline` DATE,
  `created_by` INT UNSIGNED NOT NULL,
  `is_open` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  INDEX `idx_task_code` (`task_code`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_stage` (`stage`),
  INDEX `idx_task_priority` (`priority`),
  INDEX `idx_task_project` (`project_id`)
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

-- Bugs table
CREATE TABLE IF NOT EXISTS `bugs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bug_code` VARCHAR(50) NOT NULL UNIQUE,
  `task_id` INT UNSIGNED,
  `reported_by` INT UNSIGNED NOT NULL,
  `assigned_to` INT UNSIGNED,
  `severity` ENUM('Minor', 'Major', 'Critical') DEFAULT 'Minor',
  `status` ENUM('Open', 'In Review', 'Fixing', 'Retesting', 'Passed', 'Rejected', 'Duplicate', 'Not a Bug') DEFAULT 'Open',
  `description` TEXT NOT NULL,
  `steps_to_reproduce` TEXT,
  `expected_behavior` TEXT,
  `actual_behavior` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_bug_code` (`bug_code`),
  INDEX `idx_bug_status` (`status`),
  INDEX `idx_bug_severity` (`severity`)
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
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_timesheet_date` (`date`),
  INDEX `idx_timesheet_employee` (`employee_id`)
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

SET FOREIGN_KEY_CHECKS = 1;


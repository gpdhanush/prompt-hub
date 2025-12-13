-- ============================================
-- COMPLETE DATABASE SCHEMA
-- ============================================
-- Admin Dashboard Database Schema
-- MySQL 8.0+
-- Created for Internal Admin Dashboard System
-- 
-- This is a consolidated schema file containing:
-- - All table definitions with latest structure
-- - All migrations and alterations
-- - Seed data and initial setup
-- - Super Admin user creation
-- ============================================

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
  `reporting_person_role_id` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`reporting_person_role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL,
  INDEX `idx_role_name` (`name`),
  INDEX `idx_reporting_person_role` (`reporting_person_role_id`)
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

-- Role-Positions mapping table
CREATE TABLE IF NOT EXISTS `role_positions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `position_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_position` (`role_id`, `position_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_position` (`role_id`, `position_id`)
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

-- Password history table
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

-- ============================================
-- EMPLOYEE MANAGEMENT TABLES
-- ============================================

-- Employees table (with all profile fields)
CREATE TABLE IF NOT EXISTS `employees` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL UNIQUE,
  `emp_code` VARCHAR(50) NOT NULL UNIQUE,
  `team_lead_id` INT UNSIGNED,
  `date_of_birth` DATE,
  `gender` ENUM('Male', 'Female', 'Other'),
  `date_of_joining` DATE,
  `employee_status` ENUM('Active', 'Inactive') DEFAULT 'Active',
  `status` ENUM('Present', 'Absent', 'On Leave') DEFAULT 'Present',
  `state` VARCHAR(100),
  `district` VARCHAR(100),
  `pincode` VARCHAR(20),
  `country` VARCHAR(100) DEFAULT 'India',
  `bank_name` TEXT,
  `bank_account_number` TEXT,
  `ifsc_code` TEXT,
  `address1` VARCHAR(255),
  `address2` VARCHAR(255),
  `landmark` VARCHAR(255),
  `pf_uan_number` VARCHAR(50),
  `emergency_contact_name` VARCHAR(255),
  `emergency_contact_relation` VARCHAR(50),
  `emergency_contact_number` VARCHAR(20),
  `annual_leave_count` INT UNSIGNED DEFAULT 0,
  `sick_leave_count` INT UNSIGNED DEFAULT 0,
  `casual_leave_count` INT UNSIGNED DEFAULT 0,
  `profile_photo_url` VARCHAR(500),
  `created_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`team_lead_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_emp_code` (`emp_code`),
  INDEX `idx_emp_status` (`status`),
  INDEX `idx_employee_status` (`employee_status`),
  INDEX `idx_date_of_joining` (`date_of_joining`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Employee Documents table
CREATE TABLE IF NOT EXISTS `employee_documents` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `document_type` ENUM('Aadhaar', 'PAN', 'Bank Passbook', 'Driving License', 'Passport', 'Other') NOT NULL,
  `document_number` TEXT,
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

-- Projects table (with all advanced fields)
CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `logo_url` VARCHAR(500),
  `estimated_delivery_plan` TEXT,
  `client_name` VARCHAR(255),
  `client_contact_person` VARCHAR(255),
  `client_email` VARCHAR(255),
  `client_phone` VARCHAR(50),
  `is_internal` BOOLEAN DEFAULT FALSE,
  `project_admin_id` INT UNSIGNED,
  `team_lead_id` INT UNSIGNED,
  `start_date` DATE,
  `end_date` DATE,
  `target_end_date` DATE,
  `actual_end_date` DATE,
  `project_duration_days` INT UNSIGNED,
  `status` ENUM('Not Started', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Testing', 'Pre-Prod', 'Production') DEFAULT 'Not Started',
  `risk_level` ENUM('Low', 'Medium', 'High'),
  `priority` ENUM('Low', 'Medium', 'High', 'Critical'),
  `progress` INT UNSIGNED DEFAULT 0 CHECK (`progress` >= 0 AND `progress` <= 100),
  `daily_reporting_required` BOOLEAN DEFAULT FALSE,
  `report_submission_time` TIME,
  `auto_reminder_notifications` BOOLEAN DEFAULT FALSE,
  `internal_notes` TEXT,
  `client_notes` TEXT,
  `admin_remarks` TEXT,
  `github_repo_url` VARCHAR(500),
  `bitbucket_repo_url` VARCHAR(500),
  `technologies_used` JSON,
  `created_by` INT UNSIGNED,
  `updated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_project_code` (`project_code`),
  INDEX `idx_project_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project-User mapping
CREATE TABLE IF NOT EXISTS `project_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role_in_project` ENUM('admin', 'tl', 'developer', 'qa', 'designer', 'employee') DEFAULT 'employee',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_project_user` (`project_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Project Milestones table
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

-- Project Files table
CREATE TABLE IF NOT EXISTS `project_files` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `file_type` ENUM('SOW', 'Contract', 'Design Document', 'Requirement Doc', 'Change Request', 'Meeting Notes', 'Other') NOT NULL,
  `file_category` VARCHAR(100),
  `file_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
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

-- Project Change Requests table
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

-- Project Client Call Notes table
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

-- Project Credentials table
CREATE TABLE IF NOT EXISTS `project_credentials` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `credential_type` ENUM('Login', 'API Key', 'Database', 'Server', 'Third-party Service', 'Other') NOT NULL,
  `service_name` VARCHAR(255) NOT NULL,
  `username` VARCHAR(255),
  `password` VARCHAR(500),
  `url` VARCHAR(500),
  `api_key` VARCHAR(500),
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

-- Project Daily Status table
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

-- Project Comments table
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

-- ============================================
-- SEED DATA
-- ============================================

-- Insert Roles
INSERT INTO `roles` (`id`, `name`, `description`, `reporting_person_role_id`) VALUES
(1, 'Super Admin', 'Full system access with all permissions', NULL),
(2, 'Admin', 'Manage users, projects, and prompts', 1),
(3, 'Team Lead', 'Project-level management and team oversight', 1),
(4, 'Employee', 'Task and self-management access', 3),
(5, 'Viewer', 'Read-only access to all modules', 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `reporting_person_role_id` = VALUES(`reporting_person_role_id`);

-- Insert Permissions
INSERT INTO `permissions` (`id`, `code`, `description`, `module`) VALUES
(1, 'users.view', 'View users list', 'Users'),
(2, 'users.create', 'Create new users', 'Users'),
(3, 'users.edit', 'Edit user details', 'Users'),
(4, 'users.delete', 'Delete users', 'Users'),
(5, 'employees.view', 'View employees', 'Employees'),
(6, 'employees.create', 'Create employees', 'Employees'),
(7, 'employees.edit', 'Edit employees', 'Employees'),
(8, 'projects.view', 'View projects', 'Projects'),
(9, 'projects.create', 'Create projects', 'Projects'),
(10, 'projects.edit', 'Edit projects', 'Projects'),
(11, 'projects.delete', 'Delete projects', 'Projects'),
(12, 'tasks.view', 'View tasks', 'Tasks'),
(13, 'tasks.create', 'Create tasks', 'Tasks'),
(14, 'tasks.edit', 'Edit tasks', 'Tasks'),
(15, 'tasks.assign', 'Assign tasks', 'Tasks'),
(16, 'bugs.view', 'View bugs', 'Bugs'),
(17, 'bugs.create', 'Create bugs', 'Bugs'),
(18, 'bugs.edit', 'Edit bugs', 'Bugs'),
(19, 'prompts.view', 'View prompts', 'Prompts'),
(20, 'prompts.create', 'Create prompts', 'Prompts'),
(21, 'prompts.edit', 'Edit prompts', 'Prompts'),
(22, 'prompts.approve', 'Approve prompts', 'Prompts'),
(23, 'prompts.export', 'Export prompts', 'Prompts'),
(24, 'audit.view', 'View audit logs', 'Audit'),
(25, 'settings.edit', 'Edit system settings', 'Settings')
ON DUPLICATE KEY UPDATE 
  `description` = VALUES(`description`),
  `module` = VALUES(`module`);

-- Super Admin gets all permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE 
FROM `permissions`
ON DUPLICATE KEY UPDATE `allowed` = TRUE;

-- Insert Positions
INSERT INTO `positions` (`id`, `name`, `description`) VALUES
(1, 'Senior Developer', 'Senior software developer role'),
(2, 'Developer', 'Software developer role'),
(3, 'QA Engineer', 'Quality assurance engineer'),
(4, 'Project Manager', 'Project management role'),
(5, 'Team Lead', 'Technical team leadership'),
(6, 'DevOps Engineer', 'DevOps and infrastructure management'),
(7, 'UI/UX Designer', 'User interface and experience design'),
(8, 'Business Analyst', 'Business analysis and requirements')
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

-- Insert Super Admin User
-- Password: admin123 (bcrypt hash: $2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya)
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `mfa_enabled`, `last_login`, `created_at`, `updated_at`) 
VALUES (
  1,
  'Murali',
  'murali@gmail.com',
  NULL,
  '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',
  1,
  NULL,
  'Active',
  FALSE,
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  `name` = 'Murali',
  `email` = 'murali@gmail.com',
  `password_hash` = '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',
  `role_id` = 1,
  `status` = 'Active',
  `updated_at` = NOW();

-- Insert Super Admin Employee Record
INSERT INTO `employees` (
  `id`,
  `user_id`,
  `emp_code`,
  `team_lead_id`,
  `date_of_birth`,
  `gender`,
  `date_of_joining`,
  `employee_status`,
  `status`,
  `state`,
  `district`,
  `pincode`,
  `country`,
  `bank_name`,
  `bank_account_number`,
  `ifsc_code`,
  `address1`,
  `address2`,
  `landmark`,
  `pf_uan_number`,
  `emergency_contact_name`,
  `emergency_contact_relation`,
  `emergency_contact_number`,
  `annual_leave_count`,
  `sick_leave_count`,
  `casual_leave_count`,
  `profile_photo_url`,
  `created_by`,
  `created_at`,
  `updated_at`
) VALUES (
  1,
  1,
  'NTPL0001',
  NULL,
  NULL,
  NULL,
  NULL,
  'Active',
  'Present',
  NULL,
  NULL,
  NULL,
  'India',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0,
  0,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  `user_id` = 1,
  `emp_code` = 'NTPL0001',
  `employee_status` = 'Active',
  `status` = 'Present',
  `updated_at` = NOW();

-- Insert default settings
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();

-- ============================================
-- END OF SCHEMA
-- ============================================

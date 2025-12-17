-- ============================================
-- CONSOLIDATED DATABASE MIGRATIONS - PART 01
-- ============================================
-- Admin Dashboard Database Schema
-- MySQL 8.0+
-- 
-- This file contains the base schema and core tables
-- Run parts in sequence: part_01, part_02, part_03, etc.
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
  `mobile` VARCHAR(20) UNIQUE,
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
  INDEX `idx_user_mobile` (`mobile`),
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

-- Password reset OTP table
CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp` VARCHAR(10) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `used` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_otp_email` (`email`),
  INDEX `idx_otp_user` (`user_id`),
  INDEX `idx_otp_expires` (`expires_at`),
  INDEX `idx_otp_used` (`used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Refresh tokens table
CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `token_id` VARCHAR(64) NOT NULL UNIQUE,
  `token_hash` VARCHAR(255) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `ip_address` VARCHAR(45),
  `user_agent` TEXT,
  `revoked` BOOLEAN DEFAULT FALSE,
  `revoked_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_token_id` (`token_id`),
  INDEX `idx_user_id` (`user_id`),
  INDEX `idx_expires_at` (`expires_at`),
  INDEX `idx_revoked` (`revoked`)
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
  `employee_status` ENUM('Active', 'Inactive', 'Resigned', 'Terminated') DEFAULT 'Active',
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
  INDEX `idx_emp_doc_type` (`document_type`),
  UNIQUE KEY `idx_emp_doc_type_per_employee` (`employee_id`, `document_type`)
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
  `status` ENUM('Pending', 'Waiting for Approval', 'Level 1 Approved', 'Level 1 Rejected', 'Super Admin Approved', 'Super Admin Rejected', 'Approved', 'Rejected', 'Processing', 'Paid') DEFAULT 'Pending',
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

-- Project Activities table (GitHub/Bitbucket webhooks)
CREATE TABLE IF NOT EXISTS `project_activities` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `activity_type` ENUM('push', 'commit', 'pull_request', 'issue', 'branch_created', 'branch_deleted', 'tag_created') NOT NULL,
  `repository_url` VARCHAR(500) NOT NULL,
  `branch` VARCHAR(255) DEFAULT NULL,
  `commit_sha` VARCHAR(40) DEFAULT NULL,
  `commit_message` TEXT DEFAULT NULL,
  `commit_author` VARCHAR(255) DEFAULT NULL,
  `commit_author_email` VARCHAR(255) DEFAULT NULL,
  `commit_url` VARCHAR(500) DEFAULT NULL,
  `files_changed` INT DEFAULT 0,
  `additions` INT DEFAULT 0,
  `deletions` INT DEFAULT 0,
  `pull_request_number` INT DEFAULT NULL,
  `pull_request_title` VARCHAR(500) DEFAULT NULL,
  `pull_request_url` VARCHAR(500) DEFAULT NULL,
  `issue_number` INT DEFAULT NULL,
  `issue_title` VARCHAR(500) DEFAULT NULL,
  `issue_url` VARCHAR(500) DEFAULT NULL,
  `raw_payload` JSON DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  INDEX `idx_project_id` (`project_id`),
  INDEX `idx_activity_type` (`activity_type`),
  INDEX `idx_created_at` (`created_at`),
  INDEX `idx_repository_url` (`repository_url`(255))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;


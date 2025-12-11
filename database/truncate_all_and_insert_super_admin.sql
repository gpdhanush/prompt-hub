-- ============================================
-- TRUNCATE ALL TABLES AND INSERT SUPER ADMIN
-- ============================================
-- This script truncates all tables in the database and inserts only a Super Admin user
-- Super Admin: Murali (murali@gmail.com, password: admin123)
-- 
-- WARNING: This will delete ALL data from the database!
-- Run this script only if you want to completely reset the database.
-- ============================================

USE `admin_dashboard`;

-- Disable foreign key checks to allow truncation
SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- TRUNCATE ALL TABLES (in dependency order)
-- ============================================

-- AI Prompt Library Tables
TRUNCATE TABLE `prompt_logs`;
TRUNCATE TABLE `prompts`;

-- Notification & Audit Tables
TRUNCATE TABLE `notifications`;
TRUNCATE TABLE `audit_logs`;

-- Task Management Tables
TRUNCATE TABLE `task_comments`;
TRUNCATE TABLE `task_history`;
TRUNCATE TABLE `attachments`;
TRUNCATE TABLE `timesheets`;
TRUNCATE TABLE `tasks`;

-- Bug Management Tables
TRUNCATE TABLE `bug_comments`;
TRUNCATE TABLE `bugs`;

-- Project Management Tables
TRUNCATE TABLE `project_comments`;
TRUNCATE TABLE `project_daily_status`;
TRUNCATE TABLE `project_credentials`;
TRUNCATE TABLE `project_client_call_notes`;
TRUNCATE TABLE `project_change_requests`;
TRUNCATE TABLE `project_files`;
TRUNCATE TABLE `project_milestones`;
TRUNCATE TABLE `project_users`;
TRUNCATE TABLE `projects`;

-- Employee Management Tables
TRUNCATE TABLE `reimbursements`;
TRUNCATE TABLE `leaves`;
TRUNCATE TABLE `attendance`;
TRUNCATE TABLE `employees`;

-- Authentication & Authorization Tables
TRUNCATE TABLE `role_permissions`;
TRUNCATE TABLE `role_positions`;
TRUNCATE TABLE `users`;
TRUNCATE TABLE `positions`;
TRUNCATE TABLE `permissions`;
TRUNCATE TABLE `roles`;

-- Settings Table
TRUNCATE TABLE `settings`;

-- Re-enable foreign key checks
SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- INSERT SUPER ADMIN ROLE AND USER
-- ============================================

-- Insert Super Admin role (id=1)
INSERT INTO `roles` (`id`, `name`, `description`, `created_at`, `updated_at`) 
VALUES (1, 'Super Admin', 'Full system access with all permissions', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `name` = 'Super Admin',
  `description` = 'Full system access with all permissions',
  `updated_at` = NOW();

-- Insert Super Admin user
-- Password: admin123 (bcrypt hash: $2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya)
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `mfa_enabled`, `last_login`, `created_at`, `updated_at`) 
VALUES (
  1,
  'Murali',
  'murali@gmail.com',
  NULL,
  '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',  -- Password: admin123
  1,  -- role_id = 1 (Super Admin)
  NULL,  -- No position assigned
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

-- Insert default settings (if needed)
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();

-- ============================================
-- VERIFICATION QUERY
-- ============================================

-- Verify the Super Admin was created successfully
SELECT 
  u.id,
  u.name,
  u.email,
  r.name as role,
  u.status,
  u.created_at
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Super Admin';

-- Display summary
SELECT 
  'Database Reset Complete' AS message,
  COUNT(*) AS total_users,
  (SELECT COUNT(*) FROM roles) AS total_roles,
  (SELECT COUNT(*) FROM settings) AS total_settings
FROM users;

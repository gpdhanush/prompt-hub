-- ============================================
-- CLIENT SECURITY MIGRATION
-- ============================================
-- Adds client access control, encryption, and UUID masking
-- ============================================

USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS TABLE MODIFICATIONS
-- ============================================

-- Add is_active column to users table (for client activation/deactivation)
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `is_active` BOOLEAN DEFAULT 1 AFTER `status`,
ADD COLUMN IF NOT EXISTS `token_version` INT UNSIGNED DEFAULT 0 AFTER `session_version`;

-- Update existing users to be active by default
UPDATE `users` SET `is_active` = 1 WHERE `is_active` IS NULL;
UPDATE `users` SET `token_version` = 0 WHERE `token_version` IS NULL;

-- Add index for is_active
ALTER TABLE `users`
ADD INDEX IF NOT EXISTS `idx_user_is_active` (`is_active`);

-- ============================================
-- PROJECTS TABLE MODIFICATIONS
-- ============================================

-- Add UUID and is_active columns to projects table
ALTER TABLE `projects`
ADD COLUMN IF NOT EXISTS `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`,
ADD COLUMN IF NOT EXISTS `is_active` BOOLEAN DEFAULT 1 AFTER `status`;

-- Generate UUIDs for existing projects
UPDATE `projects` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Update existing projects to be active by default
UPDATE `projects` SET `is_active` = 1 WHERE `is_active` IS NULL;

-- Add indexes
ALTER TABLE `projects`
ADD INDEX IF NOT EXISTS `idx_project_uuid` (`uuid`),
ADD INDEX IF NOT EXISTS `idx_project_is_active` (`is_active`);

-- ============================================
-- PROJECT_USERS TABLE MODIFICATIONS
-- ============================================

-- Add is_active column to project_users table
ALTER TABLE `project_users`
ADD COLUMN IF NOT EXISTS `is_active` BOOLEAN DEFAULT 1 AFTER `role_in_project`;

-- Update existing project_users to be active by default
UPDATE `project_users` SET `is_active` = 1 WHERE `is_active` IS NULL;

-- Add index
ALTER TABLE `project_users`
ADD INDEX IF NOT EXISTS `idx_project_user_is_active` (`project_id`, `user_id`, `is_active`);

-- ============================================
-- TASKS TABLE MODIFICATIONS
-- ============================================

-- Add UUID column to tasks table
ALTER TABLE `tasks`
ADD COLUMN IF NOT EXISTS `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`;

-- Generate UUIDs for existing tasks
UPDATE `tasks` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Add index
ALTER TABLE `tasks`
ADD INDEX IF NOT EXISTS `idx_task_uuid` (`uuid`);

-- ============================================
-- PROJECT_COMMENTS TABLE MODIFICATIONS
-- ============================================

-- Add encrypted_comment column for encrypted comments
ALTER TABLE `project_comments`
ADD COLUMN IF NOT EXISTS `encrypted_comment` TEXT NULL AFTER `comment`;

-- Add comment_source column to tag comments as CLIENT or INTERNAL
ALTER TABLE `project_comments`
ADD COLUMN IF NOT EXISTS `comment_source` ENUM('CLIENT', 'INTERNAL') DEFAULT 'INTERNAL' AFTER `is_internal`;

-- Add index
ALTER TABLE `project_comments`
ADD INDEX IF NOT EXISTS `idx_comment_source` (`comment_source`);

-- ============================================
-- PROJECT_CLIENT_CALL_NOTES TABLE MODIFICATIONS
-- ============================================

-- Check if table exists and add encrypted_summary column
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'project_client_call_notes'
);

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE `project_client_call_notes` ADD COLUMN IF NOT EXISTS `encrypted_summary` TEXT NULL AFTER `notes`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- RELEASE_VERSIONS TABLE (if exists)
-- ============================================

-- Check if release_versions table exists and add encrypted_notes column
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'release_versions'
);

SET @sql = IF(@table_exists > 0,
  'ALTER TABLE `release_versions` ADD COLUMN IF NOT EXISTS `encrypted_notes` TEXT NULL AFTER `notes`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- ROLES TABLE - Ensure CLIENT role exists
-- ============================================

-- Insert CLIENT role if it doesn't exist
INSERT INTO `roles` (`name`, `description`, `level`)
SELECT 'CLIENT', 'External client user with limited access', 3
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `name` = 'CLIENT'
);

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================


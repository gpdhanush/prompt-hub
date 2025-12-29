-- ============================================
-- PRODUCTION DATABASE MIGRATIONS - PART 05
-- ============================================
-- Additional Fixes and Constraints
-- Database: prasowla_ntpl_admin
-- ============================================
-- This part handles any remaining fixes, constraints, and data updates
-- ============================================

USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- FIX PROJECT ID = 0 (if exists)
-- ============================================
-- Calculate the next available ID
SET @next_id = (SELECT COALESCE(MAX(id), 0) + 1 FROM projects WHERE id > 0);

-- Update the project with id=0 to use the next available ID
UPDATE projects SET id = @next_id WHERE id = 0;

-- Update all foreign key references in related tables (only if tables exist)
UPDATE project_users SET project_id = @next_id WHERE project_id = 0;
UPDATE project_milestones SET project_id = @next_id WHERE project_id = 0;
UPDATE project_files SET project_id = @next_id WHERE project_id = 0;
UPDATE project_change_requests SET project_id = @next_id WHERE project_id = 0;
UPDATE project_client_call_notes SET project_id = @next_id WHERE project_id = 0;
UPDATE project_credentials SET project_id = @next_id WHERE project_id = 0;
UPDATE project_daily_status SET project_id = @next_id WHERE project_id = 0;
UPDATE project_comments SET project_id = @next_id WHERE project_id = 0;
UPDATE project_activities SET project_id = @next_id WHERE project_id = 0;
UPDATE tasks SET project_id = @next_id WHERE project_id = 0;
UPDATE bugs SET project_id = @next_id WHERE project_id = 0;

-- Update kanban_boards only if table exists
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'kanban_boards'
);

SET @sql = IF(@table_exists > 0,
  CONCAT('UPDATE kanban_boards SET project_id = ', @next_id, ' WHERE project_id = 0'),
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Reset AUTO_INCREMENT
SET @max_id = (SELECT COALESCE(MAX(id), 0) FROM projects);
SET @sql = CONCAT('ALTER TABLE projects AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- ENSURE ALL UUIDs ARE GENERATED
-- ============================================
-- Users
UPDATE `users` SET `uuid` = UUID() WHERE `uuid` IS NULL;

-- Employees
UPDATE `employees` SET `uuid` = UUID() WHERE `uuid` IS NULL;

-- Projects
UPDATE `projects` SET `uuid` = UUID() WHERE `uuid` IS NULL;

-- Tasks
UPDATE `tasks` SET `uuid` = UUID() WHERE `uuid` IS NULL;

-- Bugs
UPDATE `bugs` SET `uuid` = UUID() WHERE `uuid` IS NULL;

-- Reimbursements
UPDATE `reimbursements` SET `uuid` = UUID() WHERE `uuid` IS NULL;
UPDATE `reimbursements` SET `claim_code` = CONCAT('CLM-', LPAD(id, 6, '0')) WHERE `claim_code` IS NULL;

-- ============================================
-- ENSURE DEFAULT VALUES ARE SET
-- ============================================
-- Users
UPDATE `users` SET `is_active` = 1 WHERE `is_active` IS NULL;
UPDATE `users` SET `token_version` = 0 WHERE `token_version` IS NULL;
UPDATE `users` SET `session_timeout` = 30 WHERE `session_timeout` IS NULL;
UPDATE `users` SET `session_version` = 0 WHERE `session_version` IS NULL;
UPDATE `users` SET `theme_color` = '242 57% 58%' WHERE `theme_color` IS NULL;
UPDATE `users` SET `theme_mode` = 'light' WHERE `theme_mode` IS NULL;

-- Projects
UPDATE `projects` SET `is_active` = 1 WHERE `is_active` IS NULL;

-- Project Users
UPDATE `project_users` SET `is_active` = 1 WHERE `is_active` IS NULL;

-- ============================================
-- ENSURE CLIENT ROLE EXISTS
-- ============================================
INSERT INTO `roles` (`name`, `description`, `level`)
SELECT 'CLIENT', 'External client user with limited access', 3
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `name` = 'CLIENT'
);

SET FOREIGN_KEY_CHECKS = 1;


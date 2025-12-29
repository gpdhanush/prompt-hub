-- ============================================
-- UUID COLUMNS MIGRATION
-- ============================================
-- Adds UUID columns to: employees, users, bugs, reimbursements, supports
-- Projects and tasks already have UUIDs from client_security_migration.sql
-- ============================================
-- IMPORTANT: This migration is safe and can be run multiple times
-- It uses IF NOT EXISTS checks to prevent errors
-- ============================================

USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS TABLE
-- ============================================
-- Add UUID column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND column_name = 'uuid'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate UUIDs for existing users that don't have one
UPDATE `users` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Add index for UUID
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND index_name = 'idx_user_uuid'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `users` ADD INDEX `idx_user_uuid` (`uuid`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- EMPLOYEES TABLE
-- ============================================
-- Add UUID column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'employees' 
  AND column_name = 'uuid'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `employees` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate UUIDs for existing employees that don't have one
UPDATE `employees` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Add index for UUID
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'employees' 
  AND index_name = 'idx_employee_uuid'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `employees` ADD INDEX `idx_employee_uuid` (`uuid`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- BUGS TABLE
-- ============================================
-- Add UUID column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'bugs' 
  AND column_name = 'uuid'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `bugs` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate UUIDs for existing bugs that don't have one
UPDATE `bugs` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Add index for UUID
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'bugs' 
  AND index_name = 'idx_bug_uuid'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `bugs` ADD INDEX `idx_bug_uuid` (`uuid`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- REIMBURSEMENTS TABLE
-- ============================================
-- Add UUID column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'reimbursements' 
  AND column_name = 'uuid'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `reimbursements` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate UUIDs for existing reimbursements that don't have one
UPDATE `reimbursements` 
SET `uuid` = UUID()
WHERE `uuid` IS NULL;

-- Add index for UUID
SET @idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'reimbursements' 
  AND index_name = 'idx_reimbursement_uuid'
);

SET @sql = IF(@idx_exists = 0,
  'ALTER TABLE `reimbursements` ADD INDEX `idx_reimbursement_uuid` (`uuid`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- ============================================
-- SUPPORTS TABLE (if exists)
-- ============================================
-- Check if supports table exists
SET @table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports'
);

-- Add UUID column if table exists
SET @sql = IF(@table_exists > 0,
  CONCAT(
    'SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ''supports'' AND column_name = ''uuid'');',
    'SET @sql = IF(@col_exists = 0, ''ALTER TABLE `supports` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`'', ''SELECT 1'');',
    'PREPARE stmt FROM @sql;',
    'EXECUTE stmt;',
    'DEALLOCATE PREPARE stmt;',
    'UPDATE `supports` SET `uuid` = UUID() WHERE `uuid` IS NULL;',
    'SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema = DATABASE() AND table_name = ''supports'' AND index_name = ''idx_support_uuid'');',
    'SET @sql = IF(@idx_exists = 0, ''ALTER TABLE `supports` ADD INDEX `idx_support_uuid` (`uuid`)'', ''SELECT 1'');',
    'PREPARE stmt FROM @sql;',
    'EXECUTE stmt;',
    'DEALLOCATE PREPARE stmt;'
  ),
  'SELECT 1'
);

-- Execute supports table migration if it exists
SET @supports_col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports' 
  AND column_name = 'uuid'
);

SET @supports_table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports'
);

SET @sql = IF(@supports_table_exists > 0 AND @supports_col_exists = 0,
  'ALTER TABLE `supports` ADD COLUMN `uuid` VARCHAR(36) NULL UNIQUE AFTER `id`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Generate UUIDs for existing supports if table exists
SET @supports_table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports'
);

SET @sql = IF(@supports_table_exists > 0,
  'UPDATE `supports` SET `uuid` = UUID() WHERE `uuid` IS NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index for supports UUID if table exists
SET @supports_table_exists = (
  SELECT COUNT(*) 
  FROM information_schema.tables 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports'
);

SET @supports_idx_exists = (
  SELECT COUNT(*) 
  FROM information_schema.statistics 
  WHERE table_schema = DATABASE() 
  AND table_name = 'supports' 
  AND index_name = 'idx_support_uuid'
);

SET @sql = IF(@supports_table_exists > 0 AND @supports_idx_exists = 0,
  'ALTER TABLE `supports` ADD INDEX `idx_support_uuid` (`uuid`)',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
-- SELECT COUNT(*) as total_users, COUNT(uuid) as users_with_uuid FROM users;
-- SELECT COUNT(*) as total_employees, COUNT(uuid) as employees_with_uuid FROM employees;
-- SELECT COUNT(*) as total_bugs, COUNT(uuid) as bugs_with_uuid FROM bugs;
-- SELECT COUNT(*) as total_reimbursements, COUNT(uuid) as reimbursements_with_uuid FROM reimbursements;
-- SELECT COUNT(*) as total_supports, COUNT(uuid) as supports_with_uuid FROM supports;


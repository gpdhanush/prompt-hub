-- ============================================
-- CONSOLIDATED DATABASE MIGRATIONS - PART 04
-- ============================================
-- ALTER TABLE Statements and Table Modifications
-- ============================================

-- USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS TABLE MODIFICATIONS
-- ============================================

-- Add MFA support columns to users table
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `mfa_backup_codes` JSON NULL AFTER `mfa_secret`,
ADD COLUMN IF NOT EXISTS `mfa_verified_at` DATETIME NULL AFTER `mfa_backup_codes`,
ADD COLUMN IF NOT EXISTS `session_timeout` INT UNSIGNED DEFAULT 30 AFTER `mfa_verified_at`,
ADD COLUMN IF NOT EXISTS `session_version` INT DEFAULT 0 AFTER `session_timeout`;

-- Update existing users with default timeout if NULL
UPDATE `users` SET `session_timeout` = 30 WHERE `session_timeout` IS NULL;
UPDATE `users` SET `session_version` = 0 WHERE `session_version` IS NULL;

-- Add unique constraint to mobile column in users table
-- First, remove any duplicate mobile numbers (set to NULL if duplicates exist)
UPDATE users u1
INNER JOIN (
    SELECT mobile, COUNT(*) as cnt
    FROM users
    WHERE mobile IS NOT NULL AND mobile != ''
    GROUP BY mobile
    HAVING cnt > 1
) u2 ON u1.mobile = u2.mobile
SET u1.mobile = NULL
WHERE u1.id NOT IN (
    SELECT id FROM (
        SELECT MIN(id) as id
        FROM users
        WHERE mobile IS NOT NULL AND mobile != ''
        GROUP BY mobile
    ) AS temp
);

-- Add unique index to mobile column (if not exists)
-- Note: This may fail if duplicates still exist, handle manually if needed
-- ALTER TABLE `users` ADD UNIQUE INDEX `idx_user_mobile` (`mobile`);

-- ============================================
-- ROLES TABLE MODIFICATIONS
-- ============================================

-- Add level column to roles table
ALTER TABLE `roles` 
ADD COLUMN IF NOT EXISTS `level` INT UNSIGNED NULL COMMENT 'User type level: 1=Level 1 (Managers), 2=Level 2 (Employees). NULL for Super Admin (Level 0)',
ADD INDEX IF NOT EXISTS `idx_role_level` (`level`);

-- Set default levels for existing roles
UPDATE `roles` SET `level` = NULL WHERE `name` = 'Super Admin';
UPDATE `roles` SET `level` = 1 
WHERE `name` IN ('Admin', 'Team Lead', 'Team Leader', 'Manager', 'Accounts Manager', 'Office Manager', 'HR Manager');
UPDATE `roles` SET `level` = 2 
WHERE `name` IN ('Developer', 'Designer', 'Tester', 'Employee', 'Accountant', 'Network Admin', 'System Admin', 'Office Staff', 'QA Engineer');

-- ============================================
-- POSITIONS TABLE MODIFICATIONS
-- ============================================

-- Add hierarchical structure to positions table
ALTER TABLE `positions` 
ADD COLUMN IF NOT EXISTS `level` INT UNSIGNED NULL COMMENT 'Hierarchy level: 0=Super Admin, 1=Managers, 2=Employees (optional for display-only positions)',
ADD COLUMN IF NOT EXISTS `parent_id` INT UNSIGNED NULL COMMENT 'Parent position ID for hierarchy',
ADD INDEX IF NOT EXISTS `idx_position_level` (`level`),
ADD INDEX IF NOT EXISTS `idx_position_parent` (`parent_id`);

-- Add foreign key constraint for parent_id
-- ALTER TABLE `positions`
-- ADD CONSTRAINT IF NOT EXISTS `fk_position_parent` 
-- FOREIGN KEY (`parent_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL;

-- Update existing positions with default levels
UPDATE `positions` SET `level` = 0 WHERE `name` = 'Super Admin';
UPDATE `positions` SET `level` = 1 
WHERE `name` IN ('Admin', 'Team Lead', 'Team Leader', 'Accounts Manager', 'Office Manager', 'HR Manager');
UPDATE `positions` SET `level` = 2 
WHERE `level` IS NULL OR (`level` = 0 AND `name` NOT IN ('Super Admin', 'Admin', 'Team Lead', 'Team Leader', 'Accounts Manager', 'Office Manager', 'HR Manager'));

-- ============================================
-- EMPLOYEES TABLE MODIFICATIONS
-- ============================================

-- Update employee_status ENUM to include Resigned and Terminated
ALTER TABLE `employees` 
MODIFY COLUMN `employee_status` ENUM('Active', 'Inactive', 'Resigned', 'Terminated') DEFAULT 'Active';

-- Add skype/teams and whatsapp columns to employees table
-- First check if skype exists, if so rename to teams_id, otherwise add teams_id
SET @dbname = DATABASE();
SET @tablename = 'employees';
SET @columnname = 'skype';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL AFTER district')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Rename skype to teams_id if skype exists
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = 'skype')
  ) > 0,
  'ALTER TABLE employees CHANGE COLUMN skype teams_id VARCHAR(255) NULL',
  'SELECT 1'
));
PREPARE renameIfExists FROM @preparedStatement;
EXECUTE renameIfExists;
DEALLOCATE PREPARE renameIfExists;

-- Add teams_id if it doesn't exist
SET @columnname = 'teams_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(255) NULL AFTER district')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add whatsapp column
SET @columnname = 'whatsapp';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (table_name = @tablename)
      AND (table_schema = @dbname)
      AND (column_name = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) NULL AFTER teams_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update bank details columns to TEXT for encrypted data
ALTER TABLE `employees` 
  MODIFY COLUMN `bank_name` TEXT,
  MODIFY COLUMN `bank_account_number` TEXT,
  MODIFY COLUMN `ifsc_code` TEXT;

-- ============================================
-- EMPLOYEE DOCUMENTS TABLE MODIFICATIONS
-- ============================================

-- Update document_number column to TEXT for encrypted data
ALTER TABLE `employee_documents` 
  MODIFY COLUMN `document_number` TEXT;

-- Add unique constraint: one document type per employee
ALTER TABLE `employee_documents`
ADD UNIQUE INDEX IF NOT EXISTS `idx_emp_doc_type_per_employee` (`employee_id`, `document_type`);

-- ============================================
-- REIMBURSEMENTS TABLE MODIFICATIONS
-- ============================================

-- Add multi-level approval columns
ALTER TABLE `reimbursements`
  ADD COLUMN IF NOT EXISTS `claim_code` VARCHAR(50) NULL UNIQUE AFTER `id`,
  ADD COLUMN IF NOT EXISTS `level_1_approved_by` INT UNSIGNED NULL AFTER `approved_by`,
  ADD COLUMN IF NOT EXISTS `level_1_approved_at` TIMESTAMP NULL AFTER `approved_at`,
  ADD COLUMN IF NOT EXISTS `level_1_rejected_by` INT UNSIGNED NULL AFTER `level_1_approved_at`,
  ADD COLUMN IF NOT EXISTS `level_1_rejected_at` TIMESTAMP NULL AFTER `level_1_rejected_by`,
  ADD COLUMN IF NOT EXISTS `level_1_rejection_reason` TEXT NULL AFTER `level_1_rejected_at`,
  ADD COLUMN IF NOT EXISTS `super_admin_approved_by` INT UNSIGNED NULL AFTER `level_1_rejection_reason`,
  ADD COLUMN IF NOT EXISTS `super_admin_approved_at` TIMESTAMP NULL AFTER `super_admin_approved_by`,
  ADD COLUMN IF NOT EXISTS `super_admin_rejected_by` INT UNSIGNED NULL AFTER `super_admin_approved_at`,
  ADD COLUMN IF NOT EXISTS `super_admin_rejected_at` TIMESTAMP NULL AFTER `super_admin_rejected_by`,
  ADD COLUMN IF NOT EXISTS `super_admin_rejection_reason` TEXT NULL AFTER `super_admin_rejected_at`,
  ADD COLUMN IF NOT EXISTS `current_approval_level` ENUM('Level 2', 'Level 1', 'Super Admin', 'Completed') DEFAULT 'Level 2' AFTER `super_admin_rejection_reason`,
  ADD INDEX IF NOT EXISTS `idx_reimbursement_claim_code` (`claim_code`),
  ADD INDEX IF NOT EXISTS `idx_reimbursement_approval_level` (`current_approval_level`);

-- Add foreign keys for multi-level approval
ALTER TABLE `reimbursements`
  ADD CONSTRAINT IF NOT EXISTS `fk_reimbursement_level_1_approved` FOREIGN KEY (`level_1_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_reimbursement_level_1_rejected` FOREIGN KEY (`level_1_rejected_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_reimbursement_super_admin_approved` FOREIGN KEY (`super_admin_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_reimbursement_super_admin_rejected` FOREIGN KEY (`super_admin_rejected_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Update status enum to include new statuses
ALTER TABLE `reimbursements`
  MODIFY COLUMN `status` ENUM(
    'Pending', 
    'Waiting for Approval', 
    'Level 1 Approved', 
    'Level 1 Rejected',
    'Super Admin Approved',
    'Super Admin Rejected',
    'Approved', 
    'Rejected', 
    'Processing', 
    'Paid'
  ) DEFAULT 'Pending';

-- Generate claim codes for existing reimbursements
UPDATE `reimbursements` 
SET `claim_code` = CONCAT('CLM-', LPAD(id, 6, '0'))
WHERE `claim_code` IS NULL;

-- ============================================
-- TIMESHEETS TABLE MODIFICATIONS
-- ============================================

-- Add bug_id and project_id to timesheets table
ALTER TABLE `timesheets` 
ADD COLUMN IF NOT EXISTS `bug_id` INT UNSIGNED NULL AFTER `task_id`,
ADD COLUMN IF NOT EXISTS `project_id` INT UNSIGNED NULL AFTER `bug_id`,
ADD INDEX IF NOT EXISTS `idx_timesheet_bug` (`bug_id`),
ADD INDEX IF NOT EXISTS `idx_timesheet_project` (`project_id`);

-- Add foreign keys
ALTER TABLE `timesheets`
  ADD CONSTRAINT IF NOT EXISTS `fk_timesheet_bug` FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE SET NULL,
  ADD CONSTRAINT IF NOT EXISTS `fk_timesheet_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;

-- Update existing timesheets to populate project_id from tasks
UPDATE `timesheets` ts
INNER JOIN `tasks` t ON ts.task_id = t.id
SET ts.project_id = t.project_id
WHERE ts.project_id IS NULL AND ts.task_id IS NOT NULL;

-- ============================================
-- MFA TABLES
-- ============================================

-- MFA role enforcement settings table
CREATE TABLE IF NOT EXISTS `mfa_role_settings` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL UNIQUE,
  `mfa_required` TINYINT(1) DEFAULT 0,
  `enforced_by_admin` TINYINT(1) DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_mfa_role` (`role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- MFA verification attempts table for rate limiting
CREATE TABLE IF NOT EXISTS `mfa_verification_attempts` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `ip_address` VARCHAR(45),
  `attempted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `success` TINYINT(1) DEFAULT 0,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_mfa_user` (`user_id`),
  INDEX `idx_mfa_ip` (`ip_address`),
  INDEX `idx_mfa_attempted` (`attempted_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default MFA settings for roles
INSERT INTO `mfa_role_settings` (`role_id`, `mfa_required`, `enforced_by_admin`)
SELECT r.id, 
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin') THEN 1
    WHEN r.name IN ('Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as mfa_required,
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as enforced_by_admin
FROM `roles` r
WHERE r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader', 'Employee')
ON DUPLICATE KEY UPDATE 
  `mfa_required` = VALUES(`mfa_required`),
  `enforced_by_admin` = VALUES(`enforced_by_admin`);

SET FOREIGN_KEY_CHECKS = 1;


-- Migration: Add level column to roles table
-- Adds level field to support Level 1 and Level 2 role classification
-- Created: 2024

-- Step 1: Add level column to roles table
ALTER TABLE `roles` 
ADD COLUMN `level` INT UNSIGNED NULL COMMENT 'User type level: 1=Level 1 (Managers), 2=Level 2 (Employees). NULL for Super Admin (Level 0)',
ADD INDEX `idx_role_level` (`level`);

-- Step 2: Set default levels for existing roles based on common patterns
-- Super Admin should remain NULL (Level 0)
UPDATE `roles` SET `level` = NULL WHERE `name` = 'Super Admin';

-- Level 1 roles (Managers/Admins)
UPDATE `roles` SET `level` = 1 
WHERE `name` IN ('Admin', 'Team Lead', 'Team Leader', 'Manager', 'Accounts Manager', 'Office Manager', 'HR Manager');

-- Level 2 roles (Employees)
UPDATE `roles` SET `level` = 2 
WHERE `name` IN ('Developer', 'Designer', 'Tester', 'Employee', 'Accountant', 'Network Admin', 'System Admin', 'Office Staff', 'QA Engineer');

-- Note: Any roles not matching the above patterns will remain NULL
-- You can manually update them or they will be set when creating/editing roles

-- Migration: Add hierarchical structure to positions table
-- Adds level and parent_id columns to support hierarchical position management
-- Created: 2024

-- Step 1: Add level and parent_id columns to positions table
ALTER TABLE `positions` 
ADD COLUMN `level` INT UNSIGNED NOT NULL DEFAULT 0 COMMENT 'Hierarchy level: 0=Super Admin, 1=Managers, 2=Employees',
ADD COLUMN `parent_id` INT UNSIGNED NULL COMMENT 'Parent position ID for hierarchy',
ADD INDEX `idx_position_level` (`level`),
ADD INDEX `idx_position_parent` (`parent_id`);

-- Step 2: Add foreign key constraint for parent_id
ALTER TABLE `positions`
ADD CONSTRAINT `fk_position_parent` 
FOREIGN KEY (`parent_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL;

-- Step 3: Update existing positions with default levels
-- This is a safe default - you should review and update these based on your actual hierarchy
UPDATE `positions` SET `level` = 2 WHERE `level` = 0 AND `name` NOT IN ('Super Admin', 'Admin', 'Team Lead', 'Team Leader');

-- Step 4: Set Super Admin position to level 0 (if exists)
UPDATE `positions` SET `level` = 0 WHERE `name` = 'Super Admin';

-- Step 5: Set Level 1 positions (Managers/Admins)
UPDATE `positions` SET `level` = 1 WHERE `name` IN ('Admin', 'Team Lead', 'Team Leader', 'Accounts Manager', 'Office Manager', 'HR Manager');

-- Note: After migration, you should manually set parent_id relationships
-- Example:
-- UPDATE positions SET parent_id = (SELECT id FROM positions WHERE name = 'Super Admin' LIMIT 1) WHERE level = 1;
-- UPDATE positions SET parent_id = (SELECT id FROM positions WHERE name = 'Team Lead' LIMIT 1) WHERE name IN ('Developer', 'Designer', 'Tester');

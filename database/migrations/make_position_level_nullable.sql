-- Migration: Make position level column nullable
-- Since positions are now for display purposes only, level should be optional
-- Created: 2024

-- Make level column nullable (allow NULL values)
ALTER TABLE `positions` 
MODIFY COLUMN `level` INT UNSIGNED NULL DEFAULT NULL COMMENT 'Hierarchy level: 0=Super Admin, 1=Managers, 2=Employees (optional for display-only positions)';

-- Update existing positions with NULL level to have a default value of 2
-- (This is optional - you can keep them as NULL if preferred)
-- UPDATE `positions` SET `level` = 2 WHERE `level` IS NULL;

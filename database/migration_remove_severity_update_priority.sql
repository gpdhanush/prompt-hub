-- Migration to remove severity column and update priority enum
-- This migration should be run before updating the schema files

-- First, backup current data (optional but recommended)
CREATE TABLE IF NOT EXISTS bugs_backup_pre_severity_removal AS SELECT * FROM bugs;

-- Step 1: Migrate existing priority values to descriptive names first
UPDATE bugs SET priority = CASE
    WHEN priority = 'P1' THEN 'Critical'
    WHEN priority = 'P2' THEN 'High'
    WHEN priority = 'P3' THEN 'Medium'
    WHEN priority = 'P4' THEN 'Low'
    ELSE 'Low'
END;

-- Step 2: For any records where priority is still NULL, use severity as fallback
UPDATE bugs SET priority = CASE
    WHEN severity = 'Critical' THEN 'Critical'
    WHEN severity = 'High' THEN 'High'
    WHEN severity = 'Medium' THEN 'Medium'
    WHEN severity = 'Low' THEN 'Low'
    ELSE 'Low'
END WHERE priority IS NULL OR priority = '';

-- Step 3: Drop the severity column and index
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'severity');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN severity', 'SELECT "Severity column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Drop index if it exists
SET @index_check = (SELECT COUNT(*) FROM information_schema.statistics
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND INDEX_NAME = 'idx_bug_severity');
SET @sql = IF(@index_check > 0, 'DROP INDEX idx_bug_severity ON bugs', 'SELECT "Severity index already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 4: Change priority enum to use descriptive values
ALTER TABLE bugs MODIFY COLUMN priority ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Low';

-- Step 5: Ensure all priority values are valid
UPDATE bugs SET priority = 'Low' WHERE priority NOT IN ('Critical', 'High', 'Medium', 'Low');

-- Step 6: Add 'Testing' status to the enum if it doesn't exist
-- Note: This ALTER TABLE will only work if 'Testing' is not already in use or if the enum needs modification
-- You may need to run this manually if the enum modification fails
SET @sql = 'ALTER TABLE bugs MODIFY COLUMN status ENUM(''Open'', ''In Progress'', ''In Review'', ''Reopened'', ''Blocked'', ''Fixed'', ''Closed'', ''Fixing'', ''Testing'', ''Retesting'', ''Passed'', ''Rejected'', ''Duplicate'', ''Not a Bug'') DEFAULT ''Open''';
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 7: Remove unused columns and add deadline column
-- Remove resolution_type column if it exists
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'resolution_type');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN resolution_type', 'SELECT "resolution_type column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove api_endpoint column if it exists
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'api_endpoint');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN api_endpoint', 'SELECT "api_endpoint column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove tags column if it exists
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'tags');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN tags', 'SELECT "tags column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove target_fix_date column if it exists
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'target_fix_date');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN target_fix_date', 'SELECT "target_fix_date column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Remove actual_fix_date column if it exists
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'actual_fix_date');
SET @sql = IF(@exist_check > 0, 'ALTER TABLE bugs DROP COLUMN actual_fix_date', 'SELECT "actual_fix_date column already dropped"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add deadline column if it doesn't exist
SET @exist_check = (SELECT COUNT(*) FROM information_schema.columns
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bugs' AND COLUMN_NAME = 'deadline');
SET @sql = IF(@exist_check = 0, 'ALTER TABLE bugs ADD COLUMN deadline DATE', 'SELECT "deadline column already exists"');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

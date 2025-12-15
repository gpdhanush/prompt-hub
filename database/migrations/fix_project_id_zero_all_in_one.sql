-- ============================================
-- FIX PROJECT ID = 0 - ALL IN ONE SQL SCRIPT
-- ============================================
-- Run this entire script at once in phpMyAdmin SQL tab
-- Make sure you have selected the 'admin_dashboard' database first
-- ============================================

-- Step 1: Calculate the next available ID
SET @next_id = (SELECT COALESCE(MAX(id), 0) + 1 FROM projects WHERE id > 0);

-- Step 2: Update the project with id=0 to use the next available ID
UPDATE projects SET id = @next_id WHERE id = 0;

-- Step 3: Update all foreign key references in related tables
UPDATE project_users SET project_id = @next_id WHERE project_id = 0;
UPDATE project_milestones SET project_id = @next_id WHERE project_id = 0;
UPDATE project_files SET project_id = @next_id WHERE project_id = 0;
UPDATE project_change_requests SET project_id = @next_id WHERE project_id = 0;
UPDATE project_credentials SET project_id = @next_id WHERE project_id = 0;
UPDATE project_daily_status SET project_id = @next_id WHERE project_id = 0;
UPDATE tasks SET project_id = @next_id WHERE project_id = 0;
UPDATE bugs SET project_id = @next_id WHERE project_id = 0;

-- Step 4: Reset AUTO_INCREMENT (may require admin privileges - if it fails, skip this step)
SET @max_id = (SELECT COALESCE(MAX(id), 0) FROM projects);
SET @sql = CONCAT('ALTER TABLE projects AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Step 5: Verification - Show results
SELECT 'Fix completed! Project ID updated to:' AS status, @next_id AS new_project_id;
SELECT 'Remaining projects with id=0:' AS check_result, COUNT(*) AS count FROM projects WHERE id = 0;
SELECT 'All projects:' AS project_list;
SELECT id, project_code, name FROM projects ORDER BY id;


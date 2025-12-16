-- Migration: Add bug_id and project_id to timesheets table
-- This allows tracking time at bug, task, and project levels

ALTER TABLE `timesheets` 
ADD COLUMN `bug_id` INT UNSIGNED NULL AFTER `task_id`,
ADD COLUMN `project_id` INT UNSIGNED NULL AFTER `bug_id`,
ADD INDEX `idx_timesheet_bug` (`bug_id`),
ADD INDEX `idx_timesheet_project` (`project_id`),
ADD FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL;

-- Update existing timesheets to populate project_id from tasks
UPDATE `timesheets` ts
INNER JOIN `tasks` t ON ts.task_id = t.id
SET ts.project_id = t.project_id
WHERE ts.project_id IS NULL AND ts.task_id IS NOT NULL;


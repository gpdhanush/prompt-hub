-- Add developer_id, designer_id, and tester_id columns to tasks table
-- This allows tasks to be assigned to specific roles separately

USE `admin_dashboard`;

ALTER TABLE `tasks` 
ADD COLUMN `developer_id` INT UNSIGNED AFTER `assigned_to`,
ADD COLUMN `designer_id` INT UNSIGNED AFTER `developer_id`,
ADD COLUMN `tester_id` INT UNSIGNED AFTER `designer_id`,
ADD FOREIGN KEY (`developer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`designer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`tester_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_task_developer` (`developer_id`),
ADD INDEX `idx_task_designer` (`designer_id`),
ADD INDEX `idx_task_tester` (`tester_id`);

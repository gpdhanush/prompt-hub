-- Add created_by and updated_by fields to projects table
ALTER TABLE `projects` 
ADD COLUMN `created_by` INT UNSIGNED AFTER `team_lead_id`,
ADD COLUMN `updated_by` INT UNSIGNED AFTER `created_by`,
ADD FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
ADD FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Add updated_by field to tasks table
ALTER TABLE `tasks` 
ADD COLUMN `updated_by` INT UNSIGNED AFTER `created_by`,
ADD FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Add updated_by field to bugs table
ALTER TABLE `bugs` 
ADD COLUMN `updated_by` INT UNSIGNED AFTER `reported_by`,
ADD FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

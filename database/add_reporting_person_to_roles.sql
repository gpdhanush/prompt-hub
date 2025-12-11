-- Add reporting_person_id to roles table
ALTER TABLE `roles` 
ADD COLUMN `reporting_person_role_id` INT UNSIGNED AFTER `description`,
ADD FOREIGN KEY (`reporting_person_role_id`) REFERENCES `roles`(`id`) ON DELETE SET NULL,
ADD INDEX `idx_reporting_person_role` (`reporting_person_role_id`);

-- Update existing roles with default reporting persons based on role hierarchy
-- Super Admin reports to itself (NULL means no reporting person)
-- Admin and Manager report to Super Admin
UPDATE `roles` SET `reporting_person_role_id` = (SELECT id FROM (SELECT id FROM roles WHERE name = 'Super Admin') AS temp) WHERE name IN ('Admin', 'Manager');

-- Employee, Tester, Designer, etc. report to Team Lead
UPDATE `roles` SET `reporting_person_role_id` = (SELECT id FROM (SELECT id FROM roles WHERE name = 'Team Lead') AS temp) WHERE name IN ('Employee', 'Tester', 'Designer');

-- Project Manager, Public Manager, Reception report to Manager
UPDATE `roles` SET `reporting_person_role_id` = (SELECT id FROM (SELECT id FROM roles WHERE name = 'Manager') AS temp) WHERE name IN ('Project Manager', 'Public Manager', 'Reception');

-- Network Admin, Admin Employee report to Admin
UPDATE `roles` SET `reporting_person_role_id` = (SELECT id FROM (SELECT id FROM roles WHERE name = 'Admin') AS temp) WHERE name IN ('Network Admin', 'Admin Employee');

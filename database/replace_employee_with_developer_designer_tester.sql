-- Migration Script: Replace Employee role with Developer, Designer, and Tester roles
-- Note: Developer, Designer, and Tester are all employee types - no separate "Employee" role needed
-- This script:
-- 1. Creates Developer and Designer roles if they don't exist
-- 2. Updates existing Employee users to Developer role (default)
-- 3. Sets reporting_person_role_id for Developer, Designer, Tester to Team Lead
-- 4. Removes Employee role (no longer needed)

USE `admin_dashboard`;

-- Step 1: Get Team Lead role ID for reporting person
SET @team_lead_role_id = (SELECT id FROM roles WHERE name = 'Team Lead' LIMIT 1);

-- Step 2: Create Developer role if it doesn't exist
INSERT INTO `roles` (`name`, `description`, `reporting_person_role_id`)
SELECT 'Developer', 'Development and coding tasks', @team_lead_role_id
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Developer');

-- Step 3: Create Designer role if it doesn't exist
INSERT INTO `roles` (`name`, `description`, `reporting_person_role_id`)
SELECT 'Designer', 'Design and UI/UX tasks', @team_lead_role_id
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Designer');

-- Step 4: Ensure Tester role has Team Lead as reporting person
UPDATE `roles` 
SET `reporting_person_role_id` = @team_lead_role_id
WHERE `name` = 'Tester' AND (`reporting_person_role_id` IS NULL OR `reporting_person_role_id` != @team_lead_role_id);

-- Step 5: Get Developer role ID
SET @developer_role_id = (SELECT id FROM roles WHERE name = 'Developer' LIMIT 1);

-- Step 6: Update all users with Employee role to Developer role
UPDATE `users` u
INNER JOIN `roles` r ON u.role_id = r.id
SET u.role_id = @developer_role_id
WHERE r.name = 'Employee';

-- Step 7: Update Developer role to have Team Lead as reporting person (if not already set)
UPDATE `roles` 
SET `reporting_person_role_id` = @team_lead_role_id
WHERE `name` = 'Developer' AND (`reporting_person_role_id` IS NULL OR `reporting_person_role_id` != @team_lead_role_id);

-- Step 8: Update Designer role to have Team Lead as reporting person (if not already set)
UPDATE `roles` 
SET `reporting_person_role_id` = @team_lead_role_id
WHERE `name` = 'Designer' AND (`reporting_person_role_id` IS NULL OR `reporting_person_role_id` != @team_lead_role_id);

-- Step 9: Delete Employee role (no longer needed - Developer, Designer, Tester are all employee types)
-- Safe to delete after Step 6 has migrated all Employee users to Developer
DELETE FROM `roles` WHERE `name` = 'Employee';

-- Verification queries (run these to verify the migration)
-- SELECT r.name, r.reporting_person_role_id, rp.name as reporting_person_name
-- FROM roles r
-- LEFT JOIN roles rp ON r.reporting_person_role_id = rp.id
-- WHERE r.name IN ('Developer', 'Designer', 'Tester');

-- SELECT u.id, u.name, u.email, r.name as role
-- FROM users u
-- INNER JOIN roles r ON u.role_id = r.id
-- WHERE r.name IN ('Developer', 'Designer', 'Tester');

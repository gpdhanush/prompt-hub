-- Seed Data: Hierarchical Positions
-- This migration seeds the positions table with hierarchical structure
-- Run this AFTER running add_position_hierarchy.sql migration

-- Step 1: Insert Level 0 position (Super Admin)
INSERT INTO `positions` (`name`, `description`, `level`, `parent_id`) 
VALUES ('Super Admin', 'Full system access with all permissions', 0, NULL)
ON DUPLICATE KEY UPDATE 
  `level` = 0,
  `parent_id` = NULL,
  `description` = 'Full system access with all permissions';

-- Step 2: Insert Level 1 positions (Managers/Admins)
-- Get Super Admin position ID for parent reference
SET @super_admin_id = (SELECT id FROM positions WHERE name = 'Super Admin' LIMIT 1);

INSERT INTO `positions` (`name`, `description`, `level`, `parent_id`) VALUES
('Admin', 'Administrative access to manage users and system', 1, @super_admin_id),
('Team Lead', 'Project-level management and team oversight', 1, @super_admin_id),
('Team Leader', 'Project-level management and team oversight', 1, @super_admin_id),
('Accounts Manager', 'Manages accounts and financial operations', 1, @super_admin_id),
('Office Manager', 'Manages office operations and infrastructure', 1, @super_admin_id),
('HR Manager', 'Manages human resources and employee relations', 1, @super_admin_id)
ON DUPLICATE KEY UPDATE 
  `level` = VALUES(`level`),
  `parent_id` = VALUES(`parent_id`),
  `description` = VALUES(`description`);

-- Step 3: Insert Level 2 positions (Employees)
-- Get parent position IDs
SET @team_lead_id = (SELECT id FROM positions WHERE name IN ('Team Lead', 'Team Leader') LIMIT 1);
SET @office_manager_id = (SELECT id FROM positions WHERE name = 'Office Manager' LIMIT 1);
SET @accounts_manager_id = (SELECT id FROM positions WHERE name = 'Accounts Manager' LIMIT 1);
SET @hr_manager_id = (SELECT id FROM positions WHERE name = 'HR Manager' LIMIT 1);

INSERT INTO `positions` (`name`, `description`, `level`, `parent_id`) VALUES
-- Team Lead's employees
('Developer', 'Software developer role', 2, @team_lead_id),
('Designer', 'UI/UX designer role', 2, @team_lead_id),
('Tester', 'Quality assurance and testing role', 2, @team_lead_id),
('Senior Developer', 'Senior software developer role', 2, @team_lead_id),
('Junior Developer', 'Junior software developer role', 2, @team_lead_id),
-- Office Manager's employees
('Network Admin', 'Network administration and infrastructure', 2, @office_manager_id),
('System Admin', 'System administration and server management', 2, @office_manager_id),
('Office Staff', 'General office support staff', 2, @office_manager_id),
('DevOps Engineer', 'DevOps and infrastructure management', 2, @office_manager_id),
-- Accounts Manager's employees
('Accountant', 'Financial accounting and bookkeeping', 2, @accounts_manager_id),
('Accounts Assistant', 'Supporting accounts operations', 2, @accounts_manager_id),
-- HR Manager's employees
('HR Executive', 'Human resources executive', 2, @hr_manager_id),
('HR Assistant', 'Supporting HR operations', 2, @hr_manager_id)
ON DUPLICATE KEY UPDATE 
  `level` = VALUES(`level`),
  `parent_id` = VALUES(`parent_id`),
  `description` = VALUES(`description`);

-- Step 4: Update existing positions that don't have level set
-- Set default level to 2 for positions that don't match known Level 0 or Level 1 names
UPDATE `positions` 
SET `level` = 2 
WHERE `level` = 0 
  AND `name` NOT IN ('Super Admin', 'Admin', 'Team Lead', 'Team Leader', 'Accounts Manager', 'Office Manager', 'HR Manager')
  AND `parent_id` IS NULL;

-- Step 5: Set parent_id for existing Level 2 positions that don't have a parent
-- This is a safe default - you should review and update these based on your actual hierarchy
UPDATE `positions` p1
SET `parent_id` = (
  SELECT id FROM positions p2 
  WHERE p2.name IN ('Team Lead', 'Team Leader') 
  LIMIT 1
)
WHERE p1.level = 2 
  AND p1.parent_id IS NULL
  AND p1.name IN ('Developer', 'Designer', 'Tester', 'Senior Developer', 'Junior Developer', 'QA Engineer');

UPDATE `positions` p1
SET `parent_id` = (
  SELECT id FROM positions p2 
  WHERE p2.name = 'Office Manager' 
  LIMIT 1
)
WHERE p1.level = 2 
  AND p1.parent_id IS NULL
  AND p1.name IN ('Network Admin', 'System Admin', 'Office Staff', 'DevOps Engineer');

UPDATE `positions` p1
SET `parent_id` = (
  SELECT id FROM positions p2 
  WHERE p2.name = 'Accounts Manager' 
  LIMIT 1
)
WHERE p1.level = 2 
  AND p1.parent_id IS NULL
  AND p1.name IN ('Accountant', 'Accounts Assistant');

UPDATE `positions` p1
SET `parent_id` = (
  SELECT id FROM positions p2 
  WHERE p2.name = 'HR Manager' 
  LIMIT 1
)
WHERE p1.level = 2 
  AND p1.parent_id IS NULL
  AND p1.name IN ('HR Executive', 'HR Assistant');

-- Verification query (run this to check the hierarchy)
-- SELECT 
--   p.id,
--   p.name,
--   p.level,
--   p.parent_id,
--   parent.name as parent_name
-- FROM positions p
-- LEFT JOIN positions parent ON p.parent_id = parent.id
-- ORDER BY p.level ASC, p.name ASC;

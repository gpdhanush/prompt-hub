-- ============================================
-- CONSOLIDATED DATABASE MIGRATIONS - PART 05
-- ============================================
-- Seed Data, Permissions, and Initial Setup
-- ============================================

-- USE `prasowla_ntpl_admin`;

-- ============================================
-- SEED DATA - ROLES
-- ============================================

-- Insert Roles
INSERT INTO `roles` (`id`, `name`, `description`, `reporting_person_role_id`) VALUES
(1, 'Super Admin', 'Full system access with all permissions', NULL),
(2, 'Admin', 'Manage users, projects, and prompts', 1),
(3, 'Team Lead', 'Project-level management and team oversight', 1),
(4, 'Employee', 'Task and self-management access', 3),
(5, 'Viewer', 'Read-only access to all modules', 1)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `reporting_person_role_id` = VALUES(`reporting_person_role_id`);

-- ============================================
-- SEED DATA - PERMISSIONS
-- ============================================

-- Base Permissions
INSERT INTO `permissions` (`id`, `code`, `description`, `module`) VALUES
(1, 'users.view', 'View users list', 'Users'),
(2, 'users.create', 'Create new users', 'Users'),
(3, 'users.edit', 'Edit user details', 'Users'),
(4, 'users.delete', 'Delete users', 'Users'),
(5, 'employees.view', 'View employees', 'Employees'),
(6, 'employees.create', 'Create employees', 'Employees'),
(7, 'employees.edit', 'Edit employees', 'Employees'),
(8, 'projects.view', 'View projects', 'Projects'),
(9, 'projects.create', 'Create projects', 'Projects'),
(10, 'projects.edit', 'Edit projects', 'Projects'),
(11, 'projects.delete', 'Delete projects', 'Projects'),
(12, 'tasks.view', 'View tasks', 'Tasks'),
(13, 'tasks.create', 'Create tasks', 'Tasks'),
(14, 'tasks.edit', 'Edit tasks', 'Tasks'),
(15, 'tasks.assign', 'Assign tasks', 'Tasks'),
(16, 'bugs.view', 'View bugs', 'Bugs'),
(17, 'bugs.create', 'Create bugs', 'Bugs'),
(18, 'bugs.edit', 'Edit bugs', 'Bugs'),
(19, 'prompts.view', 'View prompts', 'Prompts'),
(20, 'prompts.create', 'Create prompts', 'Prompts'),
(21, 'prompts.edit', 'Edit prompts', 'Prompts'),
(22, 'prompts.approve', 'Approve prompts', 'Prompts'),
(23, 'prompts.export', 'Export prompts', 'Prompts'),
(24, 'audit.view', 'View audit logs', 'Audit'),
(25, 'settings.edit', 'Edit system settings', 'Settings')
ON DUPLICATE KEY UPDATE 
  `description` = VALUES(`description`),
  `module` = VALUES(`module`);

-- Roles & Permissions Module
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('roles_permissions.view', 'View and manage roles and permissions', 'Roles')
ON DUPLICATE KEY UPDATE description = 'View and manage roles and permissions';

-- Leaves Module Permissions
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('leaves.view', 'View leave requests', 'Leaves'),
('leaves.create', 'Create leave requests', 'Leaves'),
('leaves.edit', 'Edit leave requests', 'Leaves'),
('leaves.approve', 'Approve leave requests', 'Leaves'),
('leaves.accept', 'Accept/Approve leave requests', 'Leaves'),
('leaves.reject', 'Reject leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Reimbursements Module Permissions
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('reimbursements.view', 'View reimbursement requests', 'Reimbursements'),
('reimbursements.create', 'Create reimbursement requests', 'Reimbursements'),
('reimbursements.edit', 'Edit reimbursement requests', 'Reimbursements'),
('reimbursements.approve', 'Approve reimbursement requests', 'Reimbursements')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Reports Module
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('reports.view', 'View reports and analytics', 'Reports')
ON DUPLICATE KEY UPDATE description = 'View reports and analytics';

-- IT Asset Management Module Permissions
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('it_assets.dashboard.view', 'View IT Asset Dashboard', 'IT Asset Management'),
('it_assets.assets.view', 'View assets', 'IT Asset Management'),
('it_assets.assets.create', 'Create assets', 'IT Asset Management'),
('it_assets.assets.edit', 'Edit assets', 'IT Asset Management'),
('it_assets.assets.delete', 'Delete/retire assets', 'IT Asset Management'),
('it_assets.assignments.view', 'View asset assignments', 'IT Asset Management'),
('it_assets.assignments.create', 'Create asset assignments', 'IT Asset Management'),
('it_assets.assignments.edit', 'Edit asset assignments', 'IT Asset Management'),
('it_assets.assignments.delete', 'Return/delete assignments', 'IT Asset Management'),
('it_assets.tickets.view', 'View asset tickets', 'IT Asset Management'),
('it_assets.tickets.create', 'Create asset tickets', 'IT Asset Management'),
('it_assets.tickets.edit', 'Edit asset tickets', 'IT Asset Management'),
('it_assets.tickets.approve', 'Approve/reject tickets', 'IT Asset Management'),
('it_assets.maintenance.view', 'View maintenance records', 'IT Asset Management'),
('it_assets.maintenance.create', 'Create maintenance records', 'IT Asset Management'),
('it_assets.maintenance.edit', 'Edit maintenance records', 'IT Asset Management'),
('it_assets.maintenance.delete', 'Delete maintenance records', 'IT Asset Management'),
('it_assets.inventory.view', 'View inventory items', 'IT Asset Management'),
('it_assets.inventory.create', 'Create inventory items', 'IT Asset Management'),
('it_assets.inventory.edit', 'Edit inventory items', 'IT Asset Management'),
('it_assets.inventory.delete', 'Delete inventory items', 'IT Asset Management'),
('it_assets.inventory.adjust', 'Adjust inventory stock', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- My Devices Module Permissions
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('my_devices.view', 'View own assigned devices', 'My Devices'),
('my_devices.create', 'Add devices to My Devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- SEED DATA - ROLE PERMISSIONS
-- ============================================

-- Super Admin gets all permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE 
FROM `permissions`
ON DUPLICATE KEY UPDATE `allowed` = TRUE;

-- ============================================
-- SEED DATA - POSITIONS
-- ============================================

-- Insert Positions
INSERT INTO `positions` (`id`, `name`, `description`) VALUES
(1, 'Senior Developer', 'Senior software developer role'),
(2, 'Developer', 'Software developer role'),
(3, 'QA Engineer', 'Quality assurance engineer'),
(4, 'Project Manager', 'Project management role'),
(5, 'Team Lead', 'Technical team leadership'),
(6, 'DevOps Engineer', 'DevOps and infrastructure management'),
(7, 'UI/UX Designer', 'User interface and experience design'),
(8, 'Business Analyst', 'Business analysis and requirements')
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`);

-- Seed Hierarchical Positions
-- Level 0 position (Super Admin)
INSERT INTO `positions` (`name`, `description`, `level`, `parent_id`) 
VALUES ('Super Admin', 'Full system access with all permissions', 0, NULL)
ON DUPLICATE KEY UPDATE 
  `level` = 0,
  `parent_id` = NULL,
  `description` = 'Full system access with all permissions';

-- Level 1 positions (Managers/Admins)
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

-- Level 2 positions (Employees)
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

-- ============================================
-- SEED DATA - SUPER ADMIN USER
-- ============================================

-- Insert Super Admin User
-- Password: admin123 (bcrypt hash: $2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya)
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `mfa_enabled`, `last_login`, `created_at`, `updated_at`) 
VALUES (
  1,
  'Murali',
  'murali@gmail.com',
  NULL,
  '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',
  1,
  NULL,
  'Active',
  FALSE,
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  `name` = 'Murali',
  `email` = 'murali@gmail.com',
  `password_hash` = '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',
  `role_id` = 1,
  `status` = 'Active',
  `updated_at` = NOW();

-- Insert Super Admin Employee Record
INSERT INTO `employees` (
  `id`,
  `user_id`,
  `emp_code`,
  `team_lead_id`,
  `date_of_birth`,
  `gender`,
  `date_of_joining`,
  `employee_status`,
  `status`,
  `state`,
  `district`,
  `pincode`,
  `country`,
  `bank_name`,
  `bank_account_number`,
  `ifsc_code`,
  `address1`,
  `address2`,
  `landmark`,
  `pf_uan_number`,
  `emergency_contact_name`,
  `emergency_contact_relation`,
  `emergency_contact_number`,
  `annual_leave_count`,
  `sick_leave_count`,
  `casual_leave_count`,
  `profile_photo_url`,
  `created_by`,
  `created_at`,
  `updated_at`
) VALUES (
  1,
  1,
  'NTPL0001',
  NULL,
  NULL,
  NULL,
  NULL,
  'Active',
  'Present',
  NULL,
  NULL,
  NULL,
  'India',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  0,
  0,
  0,
  NULL,
  NULL,
  NOW(),
  NOW()
)
ON DUPLICATE KEY UPDATE 
  `user_id` = 1,
  `emp_code` = 'NTPL0001',
  `employee_status` = 'Active',
  `status` = 'Present',
  `updated_at` = NOW();

-- ============================================
-- SEED DATA - SETTINGS
-- ============================================

-- Insert default settings
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();

-- ============================================
-- SEED DATA - ASSET CATEGORIES
-- ============================================

-- Insert Asset Categories
INSERT INTO `asset_categories` (`name`, `description`) VALUES
('Laptop', 'Laptop computers (Mac/Windows/Linux)'),
('Mobile', 'Mobile devices (Android/iPhone)'),
('Testing Device', 'Devices used for testing purposes'),
('Mouse', 'Computer mouse accessories'),
('Charger', 'Charging cables and adapters'),
('Keyboard', 'Keyboard accessories'),
('Headset', 'Audio headsets and headphones'),
('Notebook', 'Physical notebooks'),
('Pen', 'Writing pens'),
('Other', 'Other miscellaneous accessories')
ON DUPLICATE KEY UPDATE `name` = VALUES(`name`);

-- ============================================
-- SEED DATA - ASSET SETTINGS
-- ============================================

-- Insert default asset settings
INSERT INTO `asset_settings` (`setting_key`, `setting_value`, `setting_type`, `description`, `category`) VALUES
('auto_approve_assignments', 'false', 'boolean', 'Automatically approve asset assignments', 'approvals'),
('require_approval_for_returns', 'false', 'boolean', 'Require approval for asset returns', 'approvals'),
('low_stock_threshold', '10', 'number', 'Default low stock threshold for inventory alerts', 'inventory'),
('warranty_reminder_days', '30', 'number', 'Days before warranty expiry to send reminder', 'notifications'),
('enable_barcode_scanning', 'true', 'boolean', 'Enable barcode scanning for assets', 'features'),
('default_asset_status', 'available', 'string', 'Default status for new assets', 'assets'),
('asset_code_prefix', 'AST', 'string', 'Prefix for auto-generated asset codes', 'assets'),
('enable_email_notifications', 'true', 'boolean', 'Enable email notifications for asset events', 'notifications')
ON DUPLICATE KEY UPDATE `setting_key` = VALUES(`setting_key`);

-- ============================================
-- FIX PROJECT ID = 0 (if exists)
-- ============================================

-- Calculate the next available ID
SET @next_id = (SELECT COALESCE(MAX(id), 0) + 1 FROM projects WHERE id > 0);

-- Update the project with id=0 to use the next available ID
UPDATE projects SET id = @next_id WHERE id = 0;

-- Update all foreign key references in related tables
UPDATE project_users SET project_id = @next_id WHERE project_id = 0;
UPDATE project_milestones SET project_id = @next_id WHERE project_id = 0;
UPDATE project_files SET project_id = @next_id WHERE project_id = 0;
UPDATE project_change_requests SET project_id = @next_id WHERE project_id = 0;
UPDATE project_credentials SET project_id = @next_id WHERE project_id = 0;
UPDATE project_daily_status SET project_id = @next_id WHERE project_id = 0;
UPDATE tasks SET project_id = @next_id WHERE project_id = 0;
UPDATE bugs SET project_id = @next_id WHERE project_id = 0;

-- Reset AUTO_INCREMENT
SET @max_id = (SELECT COALESCE(MAX(id), 0) FROM projects);
SET @sql = CONCAT('ALTER TABLE projects AUTO_INCREMENT = ', @max_id + 1);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;


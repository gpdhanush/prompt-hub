-- ============================================
-- PRODUCTION DATABASE MIGRATIONS - PART 06
-- ============================================
-- Seed Data and Initial Setup
-- Database: prasowla_ntpl_admin
-- ============================================
-- This part contains all seed data for roles, permissions, positions, and initial users
-- ============================================

USE `prasowla_ntpl_admin`;

-- ============================================
-- SEED DATA - ROLES
-- ============================================
INSERT INTO `roles` (`id`, `name`, `description`, `reporting_person_role_id`, `level`) VALUES
(1, 'Super Admin', 'Full system access with all permissions', NULL, NULL),
(2, 'Admin', 'Manage users, projects, and prompts', 1, 1),
(3, 'Team Lead', 'Project-level management and team oversight', 1, 1),
(4, 'Employee', 'Task and self-management access', 3, 2),
(5, 'Viewer', 'Read-only access to all modules', 1, 2),
(6, 'CLIENT', 'External client user with limited access', 1, 3)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `reporting_person_role_id` = VALUES(`reporting_person_role_id`),
  `level` = VALUES(`level`);

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
(15, 'tasks.delete', 'Delete tasks', 'Tasks'),
(16, 'tasks.assign', 'Assign tasks', 'Tasks'),
(17, 'bugs.view', 'View bugs', 'Bugs'),
(18, 'bugs.create', 'Create bugs', 'Bugs'),
(19, 'bugs.edit', 'Edit bugs', 'Bugs'),
(20, 'prompts.view', 'View prompts', 'Prompts'),
(21, 'prompts.create', 'Create prompts', 'Prompts'),
(22, 'prompts.edit', 'Edit prompts', 'Prompts'),
(23, 'prompts.approve', 'Approve prompts', 'Prompts'),
(24, 'prompts.export', 'Export prompts', 'Prompts'),
(25, 'audit.view', 'View audit logs', 'Audit'),
(26, 'settings.edit', 'Edit system settings', 'Settings')
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
-- Level 0 position (Super Admin)
INSERT INTO `positions` (`id`, `name`, `description`, `level`, `parent_id`) 
VALUES (1, 'Super Admin', 'Full system access with all permissions', 0, NULL)
ON DUPLICATE KEY UPDATE 
  `level` = 0,
  `parent_id` = NULL,
  `description` = 'Full system access with all permissions';

-- Level 1 positions (Managers/Admins)
SET @super_admin_id = 1;

INSERT INTO `positions` (`id`, `name`, `description`, `level`, `parent_id`) VALUES
(2, 'Admin', 'Administrative access to manage users and system', 1, @super_admin_id),
(3, 'Team Lead', 'Project-level management and team oversight', 1, @super_admin_id),
(4, 'Team Leader', 'Project-level management and team oversight', 1, @super_admin_id),
(5, 'Accounts Manager', 'Manages accounts and financial operations', 1, @super_admin_id),
(6, 'Office Manager', 'Manages office operations and infrastructure', 1, @super_admin_id),
(7, 'HR Manager', 'Manages human resources and employee relations', 1, @super_admin_id)
ON DUPLICATE KEY UPDATE 
  `level` = VALUES(`level`),
  `parent_id` = VALUES(`parent_id`),
  `description` = VALUES(`description`);

-- Level 2 positions (Employees)
SET @team_lead_id = 3;
SET @office_manager_id = 6;
SET @accounts_manager_id = 5;
SET @hr_manager_id = 7;

INSERT INTO `positions` (`id`, `name`, `description`, `level`, `parent_id`) VALUES
(8, 'Developer', 'Software developer role', 2, @team_lead_id),
(9, 'Designer', 'UI/UX designer role', 2, @team_lead_id),
(10, 'Tester', 'Quality assurance and testing role', 2, @team_lead_id),
(11, 'Senior Developer', 'Senior software developer role', 2, @team_lead_id),
(12, 'Junior Developer', 'Junior software developer role', 2, @team_lead_id),
(13, 'Network Admin', 'Network administration and infrastructure', 2, @office_manager_id),
(14, 'System Admin', 'System administration and server management', 2, @office_manager_id),
(15, 'Office Staff', 'General office support staff', 2, @office_manager_id),
(16, 'DevOps Engineer', 'DevOps and infrastructure management', 2, @office_manager_id),
(17, 'Accountant', 'Financial accounting and bookkeeping', 2, @accounts_manager_id),
(18, 'Accounts Assistant', 'Supporting accounts operations', 2, @accounts_manager_id),
(19, 'HR Executive', 'Human resources executive', 2, @hr_manager_id),
(20, 'HR Assistant', 'Supporting HR operations', 2, @hr_manager_id)
ON DUPLICATE KEY UPDATE 
  `level` = VALUES(`level`),
  `parent_id` = VALUES(`parent_id`),
  `description` = VALUES(`description`);

-- ============================================
-- SEED DATA - SUPER ADMIN USER
-- ============================================
-- Insert Super Admin User
-- Password: admin123 (bcrypt hash: $2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya)
INSERT INTO `users` (`id`, `uuid`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `is_active`, `mfa_enabled`, `last_login`, `created_at`, `updated_at`) 
VALUES (
  1,
  COALESCE((SELECT uuid FROM (SELECT uuid FROM users WHERE id = 1) AS t), UUID()),
  'Murali',
  'murali@gmail.com',
  NULL,
  '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya',
  1,
  NULL,
  'Active',
  1,
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
  `is_active` = 1,
  `updated_at` = NOW();

-- Ensure UUID is set
UPDATE `users` SET `uuid` = UUID() WHERE `id` = 1 AND `uuid` IS NULL;

-- Insert Super Admin Employee Record
INSERT INTO `employees` (
  `id`,
  `uuid`,
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
  COALESCE((SELECT uuid FROM (SELECT uuid FROM employees WHERE id = 1) AS t), UUID()),
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

-- Ensure UUID is set
UPDATE `employees` SET `uuid` = UUID() WHERE `id` = 1 AND `uuid` IS NULL;

-- ============================================
-- SEED DATA - SETTINGS
-- ============================================
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();

-- ============================================
-- SEED DATA - ASSET CATEGORIES
-- ============================================
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
-- SEED DATA - MFA ROLE SETTINGS
-- ============================================
INSERT INTO `mfa_role_settings` (`role_id`, `mfa_required`, `enforced_by_admin`)
SELECT r.id, 
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin') THEN 1
    WHEN r.name IN ('Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as mfa_required,
  CASE 
    WHEN r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader') THEN 1
    ELSE 0
  END as enforced_by_admin
FROM `roles` r
WHERE r.name IN ('Admin', 'Super Admin', 'Team Lead', 'Team Leader', 'Employee')
ON DUPLICATE KEY UPDATE 
  `mfa_required` = VALUES(`mfa_required`),
  `enforced_by_admin` = VALUES(`enforced_by_admin`);

-- ============================================
-- MIGRATION COMPLETE
-- ============================================


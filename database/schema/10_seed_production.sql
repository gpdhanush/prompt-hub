-- Seed file (Cleaned and Consolidated)

-- 1. Settings
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();

-- 2. Permissions
INSERT INTO `permissions` (`code`, `description`, `module`) VALUES
-- Users & Roles
('users.view', 'View users list', 'Users'),
('users.create', 'Create new users', 'Users'),
('users.edit', 'Edit user details', 'Users'),
('users.delete', 'Delete users', 'Users'),
('roles_permissions.view', 'View and manage roles and permissions', 'Roles'),

-- Employees & HR
('employees.view', 'View employees', 'Employees'),
('employees.create', 'Create employees', 'Employees'),
('employees.edit', 'Edit employees', 'Employees'),
('leaves.view', 'View leave requests', 'Leaves'),
('leaves.create', 'Create leave requests', 'Leaves'),
('leaves.edit', 'Edit leave requests', 'Leaves'),
('leaves.approve', 'Approve leave requests', 'Leaves'),
('leaves.accept', 'Accept/Approve leave requests', 'Leaves'),
('leaves.reject', 'Reject leave requests', 'Leaves'),
('reimbursements.view', 'View reimbursement requests', 'Reimbursements'),
('reimbursements.create', 'Create reimbursement requests', 'Reimbursements'),
('reimbursements.edit', 'Edit reimbursement requests', 'Reimbursements'),
('reimbursements.approve', 'Approve reimbursement requests', 'Reimbursements'),

-- Projects, Tasks, Bugs
('projects.view', 'View projects', 'Projects'),
('projects.create', 'Create projects', 'Projects'),
('projects.edit', 'Edit projects', 'Projects'),
('projects.delete', 'Delete projects', 'Projects'),
('tasks.view', 'View tasks', 'Tasks'),
('tasks.create', 'Create tasks', 'Tasks'),
('tasks.edit', 'Edit tasks', 'Tasks'),
('tasks.assign', 'Assign tasks', 'Tasks'),
('bugs.view', 'View bugs', 'Bugs'),
('bugs.create', 'Create bugs', 'Bugs'),
('bugs.edit', 'Edit bugs', 'Bugs'),
('bugs.delete', 'Delete bugs', 'Bugs'),

-- Prompts (If applicable)
('prompts.view', 'View prompts', 'Prompts'),
('prompts.create', 'Create prompts', 'Prompts'),
('prompts.edit', 'Edit prompts', 'Prompts'),
('prompts.approve', 'Approve prompts', 'Prompts'),
('prompts.export', 'Export prompts', 'Prompts'),

-- IT Assets
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
('it_assets.inventory.adjust', 'Adjust inventory stock', 'IT Asset Management'),

-- My Devices
('my_devices.view', 'View own assigned devices', 'My Devices'),
('my_devices.create', 'Add devices to My Devices', 'My Devices'),

-- System
('audit.view', 'View audit logs', 'Audit'),
('settings.edit', 'Edit system settings', 'Settings'),
('reports.view', 'View reports and analytics', 'Reports')
ON DUPLICATE KEY UPDATE 
  `description` = VALUES(`description`),
  `module` = VALUES(`module`);

-- 3. Roles
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

-- 4. Role Permissions (Grant Super Admin all permissions)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE 
FROM `permissions`
ON DUPLICATE KEY UPDATE `allowed` = TRUE;

-- 5. Positions
-- Note: Assuming standard IDs for key positions
INSERT INTO `positions` (`id`, `name`, `description`, `level`, `parent_id`) VALUES
(1, 'Super Admin', 'Full system access with all permissions', 0, NULL),
(2, 'Admin', 'Administrative access to manage users and system', 1, 1),
(3, 'Team Lead', 'Project-level management and team oversight', 1, 1),
(4, 'Team Leader', 'Alias for Team Lead', 1, 1),
(5, 'Accounts Manager', 'Manages accounts and financial operations', 1, 1),
(6, 'Office Manager', 'Manages office operations and infrastructure', 1, 1),
(7, 'HR Manager', 'Manages human resources and employee relations', 1, 1),
(8, 'Developer', 'Software developer role', 2, 3),
(9, 'Designer', 'UI/UX designer role', 2, 3),
(10, 'Tester', 'Quality assurance and testing role', 2, 3),
(11, 'Senior Developer', 'Senior software developer role', 2, 3),
(12, 'Junior Developer', 'Junior software developer role', 2, 3),
(13, 'Network Admin', 'Network administration and infrastructure', 2, 6),
(14, 'System Admin', 'System administration and server management', 2, 6),
(15, 'Office Staff', 'General office support staff', 2, 6),
(16, 'DevOps Engineer', 'DevOps and infrastructure management', 2, 6),
(17, 'Accountant', 'Financial accounting and bookkeeping', 2, 5),
(18, 'Accounts Assistant', 'Supporting accounts operations', 2, 5),
(19, 'HR Executive', 'Human resources executive', 2, 7),
(20, 'HR Assistant', 'Supporting HR operations', 2, 7)
ON DUPLICATE KEY UPDATE 
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `level` = VALUES(`level`),
  `parent_id` = VALUES(`parent_id`);
-- Seed file (DDL stripped)
INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('roles_permissions.view', 'View and manage roles and permissions', 'Roles')
ON DUPLICATE KEY UPDATE description = 'View and manage roles and permissions';

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('leaves.view', 'View leave requests', 'Leaves'),
('leaves.create', 'Create leave requests', 'Leaves'),
('leaves.edit', 'Edit leave requests', 'Leaves'),
('leaves.approve', 'Approve leave requests', 'Leaves'),
('leaves.accept', 'Accept/Approve leave requests', 'Leaves'),
('leaves.reject', 'Reject leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('reimbursements.view', 'View reimbursement requests', 'Reimbursements'),
('reimbursements.create', 'Create reimbursement requests', 'Reimbursements'),
('reimbursements.edit', 'Edit reimbursement requests', 'Reimbursements'),
('reimbursements.approve', 'Approve reimbursement requests', 'Reimbursements')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('reports.view', 'View reports and analytics', 'Reports')
ON DUPLICATE KEY UPDATE description = 'View reports and analytics';

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

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('my_devices.view', 'View own assigned devices', 'My Devices'),
('my_devices.create', 'Add devices to My Devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = VALUES(description);

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

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('roles_permissions.view', 'View and manage roles and permissions', 'Roles')
ON DUPLICATE KEY UPDATE description = 'View and manage roles and permissions';

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('leaves.view', 'View leave requests', 'Leaves'),
('leaves.create', 'Create leave requests', 'Leaves'),
('leaves.edit', 'Edit leave requests', 'Leaves'),
('leaves.approve', 'Approve leave requests', 'Leaves'),
('leaves.accept', 'Accept/Approve leave requests', 'Leaves'),
('leaves.reject', 'Reject leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('reimbursements.view', 'View reimbursement requests', 'Reimbursements'),
('reimbursements.create', 'Create reimbursement requests', 'Reimbursements'),
('reimbursements.edit', 'Edit reimbursement requests', 'Reimbursements'),
('reimbursements.approve', 'Approve reimbursement requests', 'Reimbursements')
ON DUPLICATE KEY UPDATE description = VALUES(description);

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES ('reports.view', 'View reports and analytics', 'Reports')
ON DUPLICATE KEY UPDATE description = 'View reports and analytics';

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

INSERT INTO `permissions` (`code`, `description`, `module`) 
VALUES 
('my_devices.view', 'View own assigned devices', 'My Devices'),
('my_devices.create', 'Add devices to My Devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = VALUES(description);

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

INSERT INTO `positions` (`name`, `description`, `level`, `parent_id`) 
VALUES ('Super Admin', 'Full system access with all permissions', 0, NULL)
ON DUPLICATE KEY UPDATE 
  `level` = 0,
  `parent_id` = NULL,
  `description` = 'Full system access with all permissions';

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

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE 
FROM `permissions`
ON DUPLICATE KEY UPDATE `allowed` = TRUE;

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

INSERT INTO `roles` (`name`, `description`, `level`)
SELECT 'CLIENT', 'External client user with limited access', 3
WHERE NOT EXISTS (
  SELECT 1 FROM `roles` WHERE `name` = 'CLIENT'
);

INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE 
  `currency_symbol` = '$',
  `updated_at` = NOW();
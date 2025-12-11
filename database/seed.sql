-- Seed Data for Admin Dashboard
-- MySQL 8.0+
-- Run after schema.sql

USE `admin_dashboard`;

-- ============================================
-- ROLES & PERMISSIONS SEED DATA
-- ============================================

INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(1, 'Super Admin', 'Full system access with all permissions'),
(2, 'Admin', 'Manage users, projects, and prompts'),
(3, 'Team Lead', 'Project-level management and team oversight'),
(4, 'Employee', 'Task and self-management access'),
(5, 'Viewer', 'Read-only access to all modules');

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
(25, 'settings.edit', 'Edit system settings', 'Settings');

-- Super Admin gets all permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE FROM `permissions`;

-- Admin permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(2, 1, TRUE), (2, 2, TRUE), (2, 3, TRUE), (2, 5, TRUE), (2, 6, TRUE), (2, 7, TRUE),
(2, 8, TRUE), (2, 9, TRUE), (2, 10, TRUE), (2, 12, TRUE), (2, 13, TRUE), (2, 14, TRUE),
(2, 16, TRUE), (2, 17, TRUE), (2, 18, TRUE), (2, 19, TRUE), (2, 20, TRUE), (2, 21, TRUE),
(2, 23, TRUE), (2, 24, TRUE);

-- Team Lead permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(3, 5, TRUE), (3, 8, TRUE), (3, 12, TRUE), (3, 13, TRUE), (3, 14, TRUE), (3, 15, TRUE),
(3, 16, TRUE), (3, 17, TRUE), (3, 18, TRUE), (3, 19, TRUE);

-- Employee permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(4, 5, TRUE), (4, 12, TRUE), (4, 13, TRUE), (4, 16, TRUE), (4, 17, TRUE), (4, 19, TRUE);

-- Viewer permissions (read-only)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(5, 1, TRUE), (5, 5, TRUE), (5, 8, TRUE), (5, 12, TRUE), (5, 16, TRUE), (5, 19, TRUE), (5, 24, TRUE);

-- Positions
INSERT INTO `positions` (`id`, `name`, `description`) VALUES
(1, 'Senior Developer', 'Senior software developer role'),
(2, 'Developer', 'Software developer role'),
(3, 'QA Engineer', 'Quality assurance engineer'),
(4, 'Project Manager', 'Project management role'),
(5, 'Team Lead', 'Technical team leadership'),
(6, 'DevOps Engineer', 'DevOps and infrastructure management'),
(7, 'UI/UX Designer', 'User interface and experience design'),
(8, 'Business Analyst', 'Business analysis and requirements');

-- ============================================
-- USERS SEED DATA
-- ============================================

-- Password hash for 'admin123' (bcrypt, rounds=10)
-- In production, use proper password hashing
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `mfa_enabled`, `last_login`) VALUES
(1, 'Super Admin', 'superadmin@example.com', '+1234567890', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 1, 5, 'Active', TRUE, NOW()),
(2, 'John Admin', 'admin@example.com', '+1234567891', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 2, 4, 'Active', FALSE, NOW()),
(3, 'Ravi Kumar', 'ravi@example.com', '+1234567892', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 3, 5, 'Active', FALSE, NOW()),
(4, 'Priya Sharma', 'priya@example.com', '+1234567893', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 1, 'Active', FALSE, NOW()),
(5, 'Amit Patel', 'amit@example.com', '+1234567894', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 2, 'Active', FALSE, NOW()),
(6, 'Sarah Chen', 'sarah@example.com', '+1234567895', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 4, 3, 'Active', FALSE, NOW());

-- ============================================
-- EMPLOYEES SEED DATA
-- ============================================

INSERT INTO `employees` (`id`, `user_id`, `emp_code`, `department`, `team_lead_id`, `hire_date`, `status`) VALUES
(1, 3, 'EMP001', 'Engineering', NULL, '2023-01-15', 'Present'),
(2, 4, 'EMP002', 'Engineering', 1, '2023-02-20', 'Present'),
(3, 5, 'EMP003', 'Engineering', 1, '2023-03-10', 'Present'),
(4, 6, 'EMP004', 'QA', 1, '2023-04-05', 'Present');

-- ============================================
-- PROJECTS SEED DATA
-- ============================================

INSERT INTO `projects` (`id`, `project_code`, `name`, `description`, `project_admin_id`, `team_lead_id`, `start_date`, `end_date`, `status`, `progress`) VALUES
(1, 'PROJ001', 'Admin Dashboard System', 'Internal admin dashboard for project management', 2, 3, '2024-01-01', '2024-12-31', 'In Progress', 65),
(2, 'PROJ002', 'E-Commerce Platform', 'Customer-facing e-commerce platform', 2, 3, '2024-02-01', '2024-11-30', 'In Progress', 45),
(3, 'PROJ003', 'Mobile App', 'iOS and Android mobile application', 2, NULL, '2024-03-01', '2025-02-28', 'Planning', 10);

INSERT INTO `project_users` (`project_id`, `user_id`, `role_in_project`) VALUES
(1, 2, 'admin'),
(1, 3, 'tl'),
(1, 4, 'employee'),
(1, 5, 'employee'),
(2, 2, 'admin'),
(2, 3, 'tl'),
(2, 4, 'employee');

-- ============================================
-- TASKS SEED DATA
-- ============================================

INSERT INTO `tasks` (`id`, `task_code`, `project_id`, `title`, `description`, `assigned_to`, `priority`, `stage`, `status`, `deadline`, `created_by`, `is_open`) VALUES
(1, '08342', 1, 'Implement auth middleware', 'Create authentication middleware for API routes', 4, 'High', 'Development', 'In Progress', '2024-12-18', 3, TRUE),
(2, '08343', 1, 'Design user management UI', 'Create user management table with actions', 4, 'Med', 'Documentation', 'Open', '2024-12-20', 3, FALSE),
(3, '08344', 1, 'Setup database schema', 'Create all required database tables', 5, 'High', 'Development', 'Closed', '2024-12-15', 3, FALSE),
(4, '08345', 2, 'Payment integration', 'Integrate payment gateway', 4, 'High', 'Development', 'Ready for Testing', '2024-12-25', 3, FALSE),
(5, '08346', 1, 'Write API documentation', 'Document all API endpoints', 5, 'Low', 'Documentation', 'In Progress', '2024-12-30', 3, FALSE);

-- ============================================
-- BUGS SEED DATA
-- ============================================

INSERT INTO `bugs` (`id`, `bug_code`, `task_id`, `reported_by`, `assigned_to`, `severity`, `status`, `description`, `steps_to_reproduce`) VALUES
(1, 'BG-0023', 1, 6, 4, 'Major', 'Open', 'Login fails with special characters in password', '1. Enter password with special chars\n2. Click login\n3. Error occurs'),
(2, 'BG-0024', 4, 6, 5, 'Critical', 'Fixing', 'Payment gateway timeout error', '1. Complete checkout\n2. Select payment method\n3. Timeout after 30s'),
(3, 'BG-0025', 1, 6, NULL, 'Minor', 'In Review', 'UI alignment issue on mobile', '1. Open on mobile device\n2. View user table\n3. Columns misaligned');

-- ============================================
-- LEAVES SEED DATA
-- ============================================

INSERT INTO `leaves` (`id`, `employee_id`, `leave_type`, `start_date`, `end_date`, `duration`, `reason`, `status`, `applied_at`, `approved_by`) VALUES
(1, 2, 'Sick Leave', '2024-12-10', '2024-12-11', 2, 'Fever and cold', 'Approved', '2024-12-09', 3),
(2, 3, 'Personal Leave', '2024-12-20', '2024-12-22', 3, 'Family event', 'Pending', '2024-12-15', NULL),
(3, 4, 'Vacation', '2024-12-25', '2024-12-31', 7, 'Year-end vacation', 'Approved', '2024-12-01', 3);

-- ============================================
-- REIMBURSEMENTS SEED DATA
-- ============================================

INSERT INTO `reimbursements` (`id`, `employee_id`, `amount`, `category`, `description`, `status`, `submitted_at`, `approved_by`) VALUES
(1, 2, 150.00, 'Travel', 'Taxi fare for client meeting', 'Approved', '2024-12-05', 3),
(2, 3, 250.00, 'Meals', 'Team lunch expenses', 'Pending', '2024-12-10', NULL),
(3, 4, 500.00, 'Training', 'Online course subscription', 'Processing', '2024-12-08', 3),
(4, 2, 75.00, 'Office Supplies', 'Stationery and supplies', 'Paid', '2024-11-28', 3);

-- ============================================
-- ATTENDANCE SEED DATA
-- ============================================

INSERT INTO `attendance` (`employee_id`, `date`, `check_in`, `check_out`, `status`) VALUES
(2, CURDATE(), '09:00:00', '18:00:00', 'Present'),
(3, CURDATE(), '09:15:00', NULL, 'Present'),
(4, CURDATE(), '09:00:00', '18:00:00', 'Present'),
(2, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00:00', '18:00:00', 'Present'),
(3, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:30:00', '18:00:00', 'Late'),
(4, DATE_SUB(CURDATE(), INTERVAL 1 DAY), '09:00:00', '18:00:00', 'Present');

-- ============================================
-- PROMPTS SEED DATA
-- ============================================

INSERT INTO `prompts` (`id`, `title`, `description`, `body`, `variables`, `category`, `tags`, `is_public`, `created_by`, `is_approved`, `approved_by`, `version`, `use_count`) VALUES
(1, 'Full System Architect + DB + API', 'Complete enterprise-level system generation with Next.js and MySQL', 'Create a complete enterprise-level Project and User Maintenance System using Next.js as a full-stack monorepo and MySQL as the database. I will only provide the MySQL connection string; generate everything else. Build the entire architecture, backend logic, database schema, API design, and frontend flow. System requirements: authentication and RBAC with roles Super Admin, Admin, Team Lead, Employee; role creation and position management; screen-level visibility toggles; Team Lead -> Employees hierarchy mapping. Include attendance, reimbursements, leaves, timesheets, project/task/bug management, file uploads, threaded comments, 5-digit auto-generated Task IDs for git commits, task lifecycle (Analysis -> Documentation -> Development -> Testing -> Pre-Prod -> Production -> Closure), employee daily reports, TL dashboards, Super Admin global views, notifications, audit logs, milestone/sprint support, leaderboards, and exportable reports. Provide Next.js App Router API route patterns, service layer patterns, MySQL schema (DDL), sample seed data, API contract (endpoint list with request/response examples), frontend page structure, and deployment notes. Write in U.S. business English, production-ready.', '["PROJECT_NAME", "DB_CONNECTION"]', 'System Spec', '["system", "architecture", "full-stack"]', TRUE, 1, TRUE, 1, 3, 24),
(2, 'Admin Panel Table + Badges', 'Design internal admin panel tables with status badges', 'Design an internal Admin Panel table view for Projects, Users, Employees, Reimbursements, Leaves, Tasks, and Bugs. For each row include a colored badge status and an actions column (View/Edit/Delete/Approve). Provide JSON schema for table data, badge color mapping, and sample rows. Provide accessibility and responsive layout requirements.', '["TABLE_ENTITIES", "BADGE_COLORS"]', 'UI Flow', '["ui", "table", "admin"]', TRUE, 2, TRUE, 1, 2, 18),
(3, 'Task Workflow & Comments', 'Full task lifecycle and threaded comments implementation', 'Write the full task lifecycle and comment workflow: task creation (5-digit auto ID), assign to users, employees can open one task at a time, update progress, upload images/attachments, add progress notes; developers and testers post threaded comments; tester moves task to Testing, tester can Accept or Fail with inline comments; if failed, developer responds and marks statuses such as Closed, Not a Bug, Production Bug, TBD; TL can close a task after production upload. Include DB tables: Tasks, TaskHistory, TaskComments, Attachments, and sample API endpoints.', '["TASK_STATUSES", "COMMENT_DEPTH"]', 'API Skeleton', '["task", "workflow", "comments"]', TRUE, 2, TRUE, 1, 1, 15);

-- ============================================
-- NOTIFICATIONS SEED DATA
-- ============================================

INSERT INTO `notifications` (`user_id`, `type`, `title`, `message`, `is_read`) VALUES
(1, 'task_assigned', 'New Task Assigned', 'Task #08342 has been assigned to you', FALSE),
(2, 'bug_reported', 'New Bug Reported', 'Bug BG-0023 reported in your project', FALSE),
(3, 'leave_approved', 'Leave Approved', 'Your leave request has been approved', TRUE);

-- ============================================
-- AUDIT LOGS SEED DATA
-- ============================================

INSERT INTO `audit_logs` (`user_id`, `action`, `module`, `item_id`, `item_type`, `ip_address`) VALUES
(1, 'create', 'Users', 2, 'user', '192.168.1.100'),
(2, 'update', 'Projects', 1, 'project', '192.168.1.101'),
(3, 'create', 'Tasks', 1, 'task', '192.168.1.102'),
(2, 'export', 'Prompts', 1, 'prompt', '192.168.1.101'),
(1, 'approve', 'Prompts', 2, 'prompt', '192.168.1.100');


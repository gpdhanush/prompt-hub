-- ============================================
-- INITIALIZE PERMISSIONS AND ROLE PERMISSIONS
-- ============================================
-- This script initializes permissions and role-permission mappings
-- Run this if you see "No permissions data available" in Settings
--
-- IMPORTANT: This script only inserts permissions for Super Admin (ID 1)
-- Other roles (ID 2-8) should have permissions set manually through:
--   - Settings → Roles & Permissions UI (recommended)
--   - Or via SQL using the HOW_TO_SET_PERMISSIONS_FOR_NEW_ROLE.md guide
--
-- Role IDs are FIXED and will remain the same in future:
--   ID 1: Super Admin (gets all permissions)
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- INSERT PERMISSIONS (if they don't exist)
-- ============================================

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

-- ============================================
-- ROLE IDS (Fixed IDs - same in future)
-- ============================================
-- These role IDs are fixed and will remain the same:
-- ID 1: Super Admin

-- ============================================
-- START TRANSACTION
-- ============================================

START TRANSACTION;

-- ============================================
-- SUPER ADMIN (ID 1): All permissions
-- ============================================

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`)
SELECT 1, `id`, TRUE 
FROM `permissions`
ON DUPLICATE KEY UPDATE `allowed` = TRUE;

-- ============================================
-- NOTE: Other roles (ID 2-8) permissions should be set manually
-- through the Settings → Roles & Permissions UI or via SQL
-- ============================================

-- ============================================
-- COMMIT TRANSACTION
-- ============================================

COMMIT;

-- ============================================
-- VERIFICATION - Check Super Admin has all permissions
-- ============================================

SELECT 
  r.id,
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count,
  CASE 
    WHEN r.id = 1 AND COUNT(rp.permission_id) = 25 THEN '✅ OK - All permissions'
    WHEN r.id = 1 AND COUNT(rp.permission_id) < 25 THEN '⚠️ INCOMPLETE'
    WHEN COUNT(rp.permission_id) = 0 THEN '⚠️ NO PERMISSIONS (set manually)'
    ELSE '✅ OK'
  END as status
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.allowed = TRUE
WHERE r.id BETWEEN 1 AND 8
GROUP BY r.id, r.name
ORDER BY r.id;

SELECT 'Permissions initialized for Super Admin! Other roles need to be configured manually.' as status;

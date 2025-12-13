-- ============================================
-- COMPLETE PERMISSIONS INSERT SCRIPT
-- ============================================
-- This script adds all missing permissions for currently visible menus
-- Based on project analysis of AdminSidebar.tsx and current menu structure
-- ============================================

USE `admin_dashboard`;

-- ============================================
-- REPORTS MODULE (Missing - User mentioned)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('reports.view', 'View reports and analytics', 'Reports')
ON DUPLICATE KEY UPDATE description = 'View reports and analytics';

-- ============================================
-- IT ASSET MANAGEMENT MODULE (All Missing)
-- ============================================

-- IT Asset Dashboard
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.dashboard.view', 'View IT Asset Dashboard', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = 'View IT Asset Dashboard';

-- Assets
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.assets.view', 'View assets', 'IT Asset Management'),
       ('it_assets.assets.create', 'Create assets', 'IT Asset Management'),
       ('it_assets.assets.edit', 'Edit assets', 'IT Asset Management'),
       ('it_assets.assets.delete', 'Delete/retire assets', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Assignments
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.assignments.view', 'View asset assignments', 'IT Asset Management'),
       ('it_assets.assignments.create', 'Create asset assignments', 'IT Asset Management'),
       ('it_assets.assignments.edit', 'Edit asset assignments', 'IT Asset Management'),
       ('it_assets.assignments.delete', 'Return/delete assignments', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Tickets
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.tickets.view', 'View asset tickets', 'IT Asset Management'),
       ('it_assets.tickets.create', 'Create asset tickets', 'IT Asset Management'),
       ('it_assets.tickets.edit', 'Edit asset tickets', 'IT Asset Management'),
       ('it_assets.tickets.approve', 'Approve/reject tickets', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Maintenance
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.maintenance.view', 'View maintenance records', 'IT Asset Management'),
       ('it_assets.maintenance.create', 'Create maintenance records', 'IT Asset Management'),
       ('it_assets.maintenance.edit', 'Edit maintenance records', 'IT Asset Management'),
       ('it_assets.maintenance.delete', 'Delete maintenance records', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- Inventory
INSERT INTO permissions (code, description, module) 
VALUES ('it_assets.inventory.view', 'View inventory items', 'IT Asset Management'),
       ('it_assets.inventory.create', 'Create inventory items', 'IT Asset Management'),
       ('it_assets.inventory.edit', 'Edit inventory items', 'IT Asset Management'),
       ('it_assets.inventory.delete', 'Delete inventory items', 'IT Asset Management'),
       ('it_assets.inventory.adjust', 'Adjust inventory stock', 'IT Asset Management')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- LEAVES MODULE (Complete permissions)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('leaves.view', 'View leave requests', 'Leaves'),
       ('leaves.create', 'Create leave requests', 'Leaves'),
       ('leaves.edit', 'Edit leave requests', 'Leaves'),
       ('leaves.approve', 'Approve leave requests', 'Leaves'),
       ('leaves.accept', 'Accept/Approve leave requests', 'Leaves'),
       ('leaves.reject', 'Reject leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- REIMBURSEMENTS MODULE (Complete permissions)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('reimbursements.view', 'View reimbursement requests', 'Reimbursements'),
       ('reimbursements.create', 'Create reimbursement requests', 'Reimbursements'),
       ('reimbursements.edit', 'Edit reimbursement requests', 'Reimbursements'),
       ('reimbursements.approve', 'Approve reimbursement requests', 'Reimbursements')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- MY DEVICES MODULE (Already added, but including for completeness)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('my_devices.view', 'View own assigned devices', 'My Devices'),
       ('my_devices.create', 'Add devices to My Devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = VALUES(description);

-- ============================================
-- ROLES & PERMISSIONS (Already exists, but including for completeness)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('roles_permissions.view', 'View and manage roles and permissions', 'Roles')
ON DUPLICATE KEY UPDATE description = 'View and manage roles and permissions';

-- ============================================
-- AUDIT LOGS (Already exists, but including for completeness)
-- ============================================
INSERT INTO permissions (code, description, module) 
VALUES ('audit.view', 'View audit logs', 'Audit')
ON DUPLICATE KEY UPDATE description = 'View audit logs';

-- ============================================
-- VERIFICATION QUERY
-- ============================================
-- Run this to see all permissions grouped by module:
-- SELECT module, code, description FROM permissions ORDER BY module, code;

-- ============================================
-- NOTES
-- ============================================
-- After running this script:
-- 1. Navigate to Roles & Permissions page (Super Admin only)
-- 2. Select each role and assign appropriate permissions
-- 3. For IT Asset Management, typically assign to Admin role
-- 4. For Reports, assign to Admin, Team Leader, Team Lead roles
-- 5. For My Devices, assign to all employee roles
-- 
-- Example: Grant IT Asset Management permissions to Admin role:
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Admin'),
--   (SELECT id FROM permissions WHERE code = 'it_assets.assets.view'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;
-- 
-- Repeat for all IT Asset Management permissions and Admin role.

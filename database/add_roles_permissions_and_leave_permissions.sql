-- Add permissions for Roles & Permissions page and Leave accept/reject actions

-- Permission to access Roles & Permissions page
INSERT INTO permissions (code, description, module) 
VALUES ('roles_permissions.view', 'View and manage roles and permissions', 'Roles')
ON DUPLICATE KEY UPDATE description = 'View and manage roles and permissions';

-- Permission to accept leave requests
INSERT INTO permissions (code, description, module) 
VALUES ('leaves.accept', 'Accept/Approve leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = 'Accept/Approve leave requests';

-- Permission to reject leave requests
INSERT INTO permissions (code, description, module) 
VALUES ('leaves.reject', 'Reject leave requests', 'Leaves')
ON DUPLICATE KEY UPDATE description = 'Reject leave requests';

-- Note: After running this script, you need to assign these permissions to appropriate roles
-- using the Roles & Permissions page or via SQL:
-- 
-- Example: Grant permissions to Admin role (replace role_id with actual Admin role ID)
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Admin'),
--   (SELECT id FROM permissions WHERE code = 'roles_permissions.view'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;
--
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Admin'),
--   (SELECT id FROM permissions WHERE code = 'leaves.accept'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;
--
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Admin'),
--   (SELECT id FROM permissions WHERE code = 'leaves.reject'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;

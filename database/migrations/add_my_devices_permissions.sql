-- Add permissions for My Devices module
-- This allows Super Admin to manage access to My Devices page

-- Permission to view My Devices
INSERT INTO permissions (code, description, module) 
VALUES ('my_devices.view', 'View own assigned devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = 'View own assigned devices';

-- Permission to create/add devices in My Devices
INSERT INTO permissions (code, description, module) 
VALUES ('my_devices.create', 'Add devices to My Devices', 'My Devices')
ON DUPLICATE KEY UPDATE description = 'Add devices to My Devices';

-- Note: After running this script, you need to assign these permissions to appropriate roles
-- using the Roles & Permissions page (Super Admin only) or via SQL:
-- 
-- Example: Grant permissions to all employee roles (replace role_id with actual role IDs)
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Employee'),
--   (SELECT id FROM permissions WHERE code = 'my_devices.view'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;
--
-- INSERT INTO role_permissions (role_id, permission_id, allowed)
-- SELECT 
--   (SELECT id FROM roles WHERE name = 'Employee'),
--   (SELECT id FROM permissions WHERE code = 'my_devices.create'),
--   TRUE
-- ON DUPLICATE KEY UPDATE allowed = TRUE;
--
-- Repeat for other roles like 'Developer', 'Tester', 'Designer', 'Team Leader', 'Team Lead', 'Admin' as needed

-- Quick script to create a Super Admin user
-- Run this in MySQL: mysql -u root -p admin_dashboard < create_super_admin.sql

USE `admin_dashboard`;

-- Ensure Super Admin role exists
INSERT INTO `roles` (`id`, `name`, `description`) 
VALUES (1, 'Super Admin', 'Full system access with all permissions')
ON DUPLICATE KEY UPDATE name='Super Admin';

-- Create Super Admin user
-- Default password: admin123
-- Change the email and password hash as needed!
INSERT INTO `users` (`name`, `email`, `mobile`, `password_hash`, `role_id`, `status`) 
VALUES (
  'Super Admin',
  'superadmin@example.com',  -- ⚠️ CHANGE THIS EMAIL
  '+1234567890',              -- ⚠️ CHANGE THIS MOBILE
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- Password: admin123
  1,  -- role_id = 1 (Super Admin)
  'Active'
)
ON DUPLICATE KEY UPDATE 
  name='Super Admin',
  role_id=1,
  status='Active';

-- Verify the Super Admin was created
SELECT u.id, u.name, u.email, r.name as role, u.status
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'Super Admin';

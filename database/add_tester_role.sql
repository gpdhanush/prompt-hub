-- Add Tester role to the database
-- Run this SQL script to add the Tester role

USE `admin_dashboard`;

-- Add Tester role
INSERT INTO `roles` (`id`, `name`, `description`) VALUES
(6, 'Tester', 'QA and testing role - can create bugs with attachments')
ON DUPLICATE KEY UPDATE `description` = 'QA and testing role - can create bugs with attachments';

-- Add Tester permissions (view bugs, create bugs)
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(6, 16, TRUE), -- bugs.view
(6, 17, TRUE), -- bugs.create
(6, 12, TRUE), -- tasks.view
(6, 19, TRUE); -- prompts.view

-- Add a sample Tester user (password: admin123)
INSERT INTO `users` (`id`, `name`, `email`, `mobile`, `password_hash`, `role_id`, `position_id`, `status`, `mfa_enabled`, `last_login`) VALUES
(7, 'Test User', 'tester@example.com', '+1234567896', '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya', 6, 3, 'Active', FALSE, NOW())
ON DUPLICATE KEY UPDATE `role_id` = 6;

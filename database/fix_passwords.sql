-- Fix password hashes for existing users
-- Updates all users to have password: admin123
-- Run this if you already have users in the database with incorrect password hashes

USE `admin_dashboard`;

-- Update all users with correct password hash (password: admin123)
-- This hash is compatible with Node.js bcryptjs
UPDATE `users` 
SET `password_hash` = '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya'
WHERE `password_hash` LIKE '$2y$%' OR `password_hash` = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';

-- Verify the update
SELECT id, name, email, 
       CASE 
         WHEN password_hash LIKE '$2a$%' THEN '✅ Correct format'
         ELSE '❌ Wrong format'
       END as hash_status
FROM users;

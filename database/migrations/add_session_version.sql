-- Migration: Add session_version column to users table for single-device login
-- Date: 2024

-- Add session_version column to track login sessions
-- This allows invalidating all previous sessions when a user logs in from a new device
ALTER TABLE `users` 
ADD COLUMN `session_version` INT DEFAULT 0 AFTER `session_timeout`;

-- Initialize existing users with session_version = 0
UPDATE `users` SET `session_version` = 0 WHERE `session_version` IS NULL;

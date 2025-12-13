-- ============================================
-- Add Session Timeout Support
-- Migration: Add session_timeout column to users table
-- ============================================

-- Add session_timeout column to users table (in minutes, default 30)
ALTER TABLE `users`
ADD COLUMN IF NOT EXISTS `session_timeout` INT UNSIGNED DEFAULT 30 AFTER `mfa_verified_at`;

-- Update existing users with default timeout if NULL
UPDATE `users` SET `session_timeout` = 30 WHERE `session_timeout` IS NULL;

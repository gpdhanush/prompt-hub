-- ============================================
-- USER THEME PREFERENCES MIGRATION
-- ============================================
-- Adds theme_color and theme_mode columns to users table
-- Stores per-user theme preferences to avoid conflicts when multiple users use same browser
-- ============================================

-- USE `prasowla_ntpl_admin`;

SET FOREIGN_KEY_CHECKS = 0;

-- ============================================
-- USERS TABLE MODIFICATIONS
-- ============================================

-- Add theme_color column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND column_name = 'theme_color'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `theme_color` VARCHAR(50) NULL DEFAULT "242 57% 58%" AFTER `token_version`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add theme_mode column if it doesn't exist
SET @col_exists = (
  SELECT COUNT(*) 
  FROM information_schema.columns 
  WHERE table_schema = DATABASE() 
  AND table_name = 'users' 
  AND column_name = 'theme_mode'
);

SET @sql = IF(@col_exists = 0,
  'ALTER TABLE `users` ADD COLUMN `theme_mode` ENUM("light", "dark", "system") NULL DEFAULT "light" AFTER `theme_color`',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing users with default theme values if NULL
UPDATE `users` 
SET `theme_color` = "242 57% 58%" 
WHERE `theme_color` IS NULL;

UPDATE `users` 
SET `theme_mode` = "light" 
WHERE `theme_mode` IS NULL;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these to verify the migration:
-- SELECT COUNT(*) as total_users, COUNT(theme_color) as users_with_color, COUNT(theme_mode) as users_with_mode FROM users;
-- SELECT id, name, email, theme_color, theme_mode FROM users LIMIT 5;


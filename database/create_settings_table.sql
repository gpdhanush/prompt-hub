-- Settings table for system configuration
-- This migration creates the settings table if it doesn't exist
-- Run this if you get "admin_dashboard.settings does not exist" error

-- Check if table exists before creating
SET @dbname = DATABASE();
SET @tablename = 'settings';

-- Create settings table if it doesn't exist
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename) > 0,
  'SELECT "Table settings already exists" AS message',
  CONCAT('CREATE TABLE `', @tablename, '` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `currency_symbol` VARCHAR(3) DEFAULT \'$\',
    `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci')
));
PREPARE createTableIfNotExists FROM @preparedStatement;
EXECUTE createTableIfNotExists;
DEALLOCATE PREPARE createTableIfNotExists;

-- Insert default settings if no record exists
INSERT INTO `settings` (`id`, `currency_symbol`, `created_at`, `updated_at`) 
VALUES (1, '$', NOW(), NOW())
ON DUPLICATE KEY UPDATE `currency_symbol` = `currency_symbol`;

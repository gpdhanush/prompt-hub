-- Add comprehensive employee fields
-- This migration adds all the additional employee information fields
-- Safe to run multiple times (idempotent) - compatible with MariaDB

USE admin_dashboard;

-- Add personal information fields (only if they don't exist)
SET @dbname = DATABASE();
SET @tablename = 'employees';

-- date_of_birth
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'date_of_birth') > 0,
  'SELECT "Column date_of_birth already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `date_of_birth` DATE AFTER `hire_date`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- gender
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'gender') > 0,
  'SELECT "Column gender already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `gender` ENUM(\'Male\', \'Female\', \'Other\') AFTER `date_of_birth`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- date_of_joining
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'date_of_joining') > 0,
  'SELECT "Column date_of_joining already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `date_of_joining` DATE AFTER `gender`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- is_team_lead
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'is_team_lead') > 0,
  'SELECT "Column is_team_lead already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `is_team_lead` BOOLEAN DEFAULT FALSE AFTER `date_of_joining`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- employee_status
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'employee_status') > 0,
  'SELECT "Column employee_status already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `employee_status` ENUM(\'Active\', \'Inactive\') DEFAULT \'Active\' AFTER `is_team_lead`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- bank_name
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'bank_name') > 0,
  'SELECT "Column bank_name already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `bank_name` VARCHAR(255) AFTER `employee_status`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- bank_account_number
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'bank_account_number') > 0,
  'SELECT "Column bank_account_number already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `bank_account_number` VARCHAR(50) AFTER `bank_name`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- ifsc_code
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'ifsc_code') > 0,
  'SELECT "Column ifsc_code already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `ifsc_code` VARCHAR(20) AFTER `bank_account_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- routing_number
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'routing_number') > 0,
  'SELECT "Column routing_number already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `routing_number` VARCHAR(20) AFTER `ifsc_code`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pf_esi_applicable
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'pf_esi_applicable') > 0,
  'SELECT "Column pf_esi_applicable already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `pf_esi_applicable` BOOLEAN DEFAULT FALSE AFTER `routing_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pf_uan_number
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'pf_uan_number') > 0,
  'SELECT "Column pf_uan_number already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `pf_uan_number` VARCHAR(50) AFTER `pf_esi_applicable`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- government_id_number
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'government_id_number') > 0,
  'SELECT "Column government_id_number already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `government_id_number` VARCHAR(50) AFTER `pf_uan_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- address
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'address') > 0,
  'SELECT "Column address already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `address` TEXT AFTER `government_id_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- emergency_contact_name
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'emergency_contact_name') > 0,
  'SELECT "Column emergency_contact_name already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `emergency_contact_name` VARCHAR(255) AFTER `address`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- emergency_contact_number
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'emergency_contact_number') > 0,
  'SELECT "Column emergency_contact_number already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `emergency_contact_number` VARCHAR(20) AFTER `emergency_contact_name`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- annual_leave_count
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'annual_leave_count') > 0,
  'SELECT "Column annual_leave_count already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `annual_leave_count` INT UNSIGNED DEFAULT 0 AFTER `emergency_contact_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- sick_leave_count
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'sick_leave_count') > 0,
  'SELECT "Column sick_leave_count already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `sick_leave_count` INT UNSIGNED DEFAULT 0 AFTER `annual_leave_count`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- casual_leave_count
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'casual_leave_count') > 0,
  'SELECT "Column casual_leave_count already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `casual_leave_count` INT UNSIGNED DEFAULT 0 AFTER `sick_leave_count`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- profile_photo_url
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'profile_photo_url') > 0,
  'SELECT "Column profile_photo_url already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `profile_photo_url` VARCHAR(500) AFTER `casual_leave_count`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- created_by
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'created_by') > 0,
  'SELECT "Column created_by already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `created_by` INT UNSIGNED AFTER `profile_photo_url`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- created_date
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'created_date') > 0,
  'SELECT "Column created_date already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `created_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP AFTER `created_by`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- last_updated_date
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'last_updated_date') > 0,
  'SELECT "Column last_updated_date already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `last_updated_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER `created_date`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign key for created_by (only if constraint doesn't exist)
SET @constraint_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      AND CONSTRAINT_NAME = 'fk_employee_created_by'
);

SET @sql = IF(@constraint_exists = 0,
    'ALTER TABLE `employees` ADD CONSTRAINT `fk_employee_created_by` FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL',
    'SELECT "Foreign key constraint already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes for better query performance (only if they don't exist)
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      AND INDEX_NAME = 'idx_employee_status'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `employees` ADD INDEX `idx_employee_status` (`employee_status`)',
    'SELECT "Index idx_employee_status already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      AND INDEX_NAME = 'idx_is_team_lead'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `employees` ADD INDEX `idx_is_team_lead` (`is_team_lead`)',
    'SELECT "Index idx_is_team_lead already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'employees'
      AND INDEX_NAME = 'idx_date_of_joining'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `employees` ADD INDEX `idx_date_of_joining` (`date_of_joining`)',
    'SELECT "Index idx_date_of_joining already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update users table to sync status with employee_status
-- Note: This is a one-time sync, future updates should maintain consistency
UPDATE `employees` e
INNER JOIN `users` u ON e.user_id = u.id
SET u.status = CASE 
  WHEN e.employee_status = 'Active' THEN 'Active'
  ELSE 'Inactive'
END
WHERE e.employee_status IS NOT NULL;

-- Migration: Add new address columns (address1, address2, landmark, state, district, pincode) to employees table
-- This script follows the same pattern as add_employee_fields.sql
-- Run: mysql -u root -p admin_dashboard < database/add_address_fields.sql

USE admin_dashboard;

SET @dbname = DATABASE();
SET @tablename = 'employees';

-- address1
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'address1') > 0,
  'SELECT "Column address1 already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `address1` VARCHAR(255) NULL AFTER `routing_number`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- address2
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'address2') > 0,
  'SELECT "Column address2 already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `address2` VARCHAR(255) NULL AFTER `address1`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- landmark
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'landmark') > 0,
  'SELECT "Column landmark already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `landmark` VARCHAR(255) NULL AFTER `address2`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- state
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'state') > 0,
  'SELECT "Column state already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `state` VARCHAR(100) NULL AFTER `landmark`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- district
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'district') > 0,
  'SELECT "Column district already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `district` VARCHAR(100) NULL AFTER `state`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- pincode
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'pincode') > 0,
  'SELECT "Column pincode already exists" AS message',
  'ALTER TABLE `employees` ADD COLUMN `pincode` VARCHAR(20) NULL AFTER `district`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Verify the changes
SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE, COLUMN_DEFAULT
FROM INFORMATION_SCHEMA.COLUMNS 
WHERE TABLE_SCHEMA = 'admin_dashboard' 
  AND TABLE_NAME = 'employees' 
  AND COLUMN_NAME IN ('address1', 'address2', 'landmark', 'state', 'district', 'pincode')
ORDER BY ORDINAL_POSITION;

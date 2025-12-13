-- Migration script to update bank details columns to support encrypted data
-- Encrypted data is significantly longer than plain text, so we need TEXT columns

-- Run this script to update existing database schema
-- This will allow storing encrypted bank details

ALTER TABLE `employees` 
  MODIFY COLUMN `bank_name` TEXT,
  MODIFY COLUMN `bank_account_number` TEXT,
  MODIFY COLUMN `ifsc_code` TEXT;

-- Note: After running this migration, existing plain text data will need to be encrypted
-- You may want to create a script to encrypt existing data if you have any

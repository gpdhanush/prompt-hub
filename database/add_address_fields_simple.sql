-- Simple Migration: Add new address columns to employees table
-- If columns already exist, you'll get an error - that's okay, just ignore it
-- Run: mysql -u root -p admin_dashboard < database/add_address_fields_simple.sql

USE admin_dashboard;

-- Add address1 column (adds at the end - safest, no dependency on other columns)
ALTER TABLE `employees` ADD COLUMN `address1` VARCHAR(255) NULL;

-- Add address2 column
ALTER TABLE `employees` ADD COLUMN `address2` VARCHAR(255) NULL;

-- Add landmark column
ALTER TABLE `employees` ADD COLUMN `landmark` VARCHAR(255) NULL;

-- Add state column
ALTER TABLE `employees` ADD COLUMN `state` VARCHAR(100) NULL;

-- Add district column
ALTER TABLE `employees` ADD COLUMN `district` VARCHAR(100) NULL;

-- Add pincode column
ALTER TABLE `employees` ADD COLUMN `pincode` VARCHAR(20) NULL;

-- Add emergency_contact_relation column (if it doesn't exist)
ALTER TABLE `employees` ADD COLUMN `emergency_contact_relation` VARCHAR(50) NULL;

-- Verify columns were added
SHOW COLUMNS FROM `employees` WHERE Field IN ('address1', 'address2', 'landmark', 'state', 'district', 'pincode', 'emergency_contact_relation');

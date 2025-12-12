-- Migration: Add remaining missing address columns
-- Based on errors, address1 and address2 already exist
-- This script adds only: landmark, state, district, pincode, emergency_contact_relation
-- Run: mysql -u root -p admin_dashboard < database/add_remaining_address_fields.sql
-- If any column already exists, you'll get an error - just ignore it

USE admin_dashboard;

-- Add landmark column
ALTER TABLE `employees` ADD COLUMN `landmark` VARCHAR(255) NULL;

-- Add state column
ALTER TABLE `employees` ADD COLUMN `state` VARCHAR(100) NULL;

-- Add district column
ALTER TABLE `employees` ADD COLUMN `district` VARCHAR(100) NULL;

-- Add pincode column
ALTER TABLE `employees` ADD COLUMN `pincode` VARCHAR(20) NULL;

-- Add emergency_contact_relation column
ALTER TABLE `employees` ADD COLUMN `emergency_contact_relation` VARCHAR(50) NULL;

-- Verify all columns exist
SHOW COLUMNS FROM `employees` WHERE Field IN ('address1', 'address2', 'landmark', 'state', 'district', 'pincode', 'emergency_contact_relation');

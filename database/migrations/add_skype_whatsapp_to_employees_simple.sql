-- Migration: Add skype and whatsapp fields to employees table
-- Date: 2024
-- Simple version - run this if the safe version fails

-- Add skype column to employees table
ALTER TABLE `employees` 
ADD COLUMN `skype` VARCHAR(255) NULL AFTER `district`;

-- Add whatsapp column to employees table
ALTER TABLE `employees` 
ADD COLUMN `whatsapp` VARCHAR(20) NULL AFTER `skype`;

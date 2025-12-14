-- Migration: Rename skype column to teams_id in employees table
-- Date: 2024

-- Rename skype column to teams_id
ALTER TABLE `employees` 
CHANGE COLUMN `skype` `teams_id` VARCHAR(255) NULL;

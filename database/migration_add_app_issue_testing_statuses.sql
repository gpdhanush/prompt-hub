-- Migration: Add testing workflow statuses to app_issues
-- This migration adds 'need_testing' and 'testing' statuses to support the bug testing workflow

-- Modify the status ENUM to include new testing statuses
ALTER TABLE `app_issues`
MODIFY COLUMN `status` ENUM('open','in_review','assigned','in_progress','need_testing','testing','resolved','closed') NOT NULL DEFAULT 'open';

-- Add comment to document the testing workflow
-- Status flow: open -> in_review -> assigned -> in_progress -> need_testing -> testing -> resolved/closed

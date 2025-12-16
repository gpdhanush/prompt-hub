-- ============================================
-- ADD ESCALATION COLUMN TO ASSET TICKETS
-- ============================================
-- Migration: Add escalated_at column for ticket escalation tracking
-- ============================================

USE `admin_dashboard`;

-- Add escalated_at column if it doesn't exist
ALTER TABLE `asset_tickets` 
ADD COLUMN IF NOT EXISTS `escalated_at` TIMESTAMP NULL DEFAULT NULL AFTER `sla_deadline`;

-- Add index for escalation queries
CREATE INDEX IF NOT EXISTS `idx_ticket_escalated` ON `asset_tickets`(`escalated_at`);

SELECT '✓ Added escalated_at column to asset_tickets table' AS step;


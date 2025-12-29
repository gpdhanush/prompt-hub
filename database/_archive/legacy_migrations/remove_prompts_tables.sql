-- ============================================
-- REMOVE PROMPTS FEATURE TABLES
-- ============================================
-- This migration removes the unused prompts feature tables
-- Created: $(date)
-- 
-- WARNING: This will permanently delete all data in:
-- - prompts
-- - prompt_logs
--
-- This migration is REVERSIBLE - see rollback section below
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop prompt_logs first (has foreign key to prompts)
DROP TABLE IF EXISTS `prompt_logs`;

-- Drop prompts table
DROP TABLE IF EXISTS `prompts`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To rollback, run the prompts table creation from:
-- database/consolidated_migrations_part_02.sql (lines 204-247)
--
-- Note: Data will be lost - this is a destructive operation
-- ============================================


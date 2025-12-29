-- ============================================
-- REMOVE KANBAN FEATURE TABLES
-- ============================================
-- This migration removes the unused Kanban feature tables
-- Created: $(date)
-- 
-- WARNING: This will permanently delete all data in:
-- - kanban_time_logs
-- - kanban_task_history
-- - kanban_board_members
-- - kanban_integrations
-- - kanban_tasks
-- - kanban_columns
-- - kanban_boards
--
-- This migration is REVERSIBLE - see rollback section below
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- Drop tables in order (respecting foreign key dependencies)
-- Drop child tables first
DROP TABLE IF EXISTS `kanban_time_logs`;
DROP TABLE IF EXISTS `kanban_task_history`;
DROP TABLE IF EXISTS `kanban_board_members`;
DROP TABLE IF EXISTS `kanban_integrations`;
DROP TABLE IF EXISTS `kanban_tasks`;
DROP TABLE IF EXISTS `kanban_columns`;
DROP TABLE IF EXISTS `kanban_boards`;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================
-- ROLLBACK (if needed)
-- ============================================
-- To rollback, run the kanban table creation from:
-- database/production_migration_part_04.sql (lines 136-301)
-- OR
-- database/kanban_migration.sql
-- database/kanban_time_tracking_migration.sql
--
-- Note: Data will be lost - this is a destructive operation
-- ============================================


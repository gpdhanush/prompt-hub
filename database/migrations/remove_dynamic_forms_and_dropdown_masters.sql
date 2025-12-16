-- ============================================
-- REMOVE DYNAMIC FORMS AND DROPDOWN MASTERS
-- ============================================
-- Migration: Remove dynamic forms and dropdown masters feature
-- Description: Drops all tables and removes form_template_id column from document_requests
-- ============================================

USE `admin_dashboard`;

-- Drop foreign key constraint on document_requests.form_template_id first
ALTER TABLE `document_requests` 
  DROP FOREIGN KEY IF EXISTS `document_requests_ibfk_2`;

-- Remove form_template_id column from document_requests table
ALTER TABLE `document_requests` 
  DROP COLUMN IF EXISTS `form_template_id`;

-- Drop form_submissions table (has foreign key to form_templates)
DROP TABLE IF EXISTS `form_submissions`;

-- Drop form_fields table (has foreign key to form_templates)
DROP TABLE IF EXISTS `form_fields`;

-- Drop form_templates table
DROP TABLE IF EXISTS `form_templates`;

-- Drop dropdown_masters table
DROP TABLE IF EXISTS `dropdown_masters`;

SELECT '✓ Removed dynamic forms and dropdown masters tables and columns' AS step;


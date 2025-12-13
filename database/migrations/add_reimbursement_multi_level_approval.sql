-- ============================================
-- REIMBURSEMENT MULTI-LEVEL APPROVAL MIGRATION
-- ============================================
-- Adds support for multi-level approval workflow:
-- Level 2 (Employee) → Level 1 (Manager) → Super Admin
-- ============================================

USE `admin_dashboard`;

-- Add new columns for multi-level approval
ALTER TABLE `reimbursements`
  ADD COLUMN `level_1_approved_by` INT UNSIGNED NULL AFTER `approved_by`,
  ADD COLUMN `level_1_approved_at` TIMESTAMP NULL AFTER `approved_at`,
  ADD COLUMN `level_1_rejected_by` INT UNSIGNED NULL AFTER `level_1_approved_at`,
  ADD COLUMN `level_1_rejected_at` TIMESTAMP NULL AFTER `level_1_rejected_by`,
  ADD COLUMN `level_1_rejection_reason` TEXT NULL AFTER `level_1_rejected_at`,
  ADD COLUMN `super_admin_approved_by` INT UNSIGNED NULL AFTER `level_1_rejection_reason`,
  ADD COLUMN `super_admin_approved_at` TIMESTAMP NULL AFTER `super_admin_approved_by`,
  ADD COLUMN `super_admin_rejected_by` INT UNSIGNED NULL AFTER `super_admin_approved_at`,
  ADD COLUMN `super_admin_rejected_at` TIMESTAMP NULL AFTER `super_admin_rejected_by`,
  ADD COLUMN `super_admin_rejection_reason` TEXT NULL AFTER `super_admin_rejected_at`,
  ADD COLUMN `current_approval_level` ENUM('Level 2', 'Level 1', 'Super Admin', 'Completed') DEFAULT 'Level 2' AFTER `super_admin_rejection_reason`,
  ADD COLUMN `claim_code` VARCHAR(50) NULL UNIQUE AFTER `id`,
  ADD INDEX `idx_reimbursement_claim_code` (`claim_code`),
  ADD INDEX `idx_reimbursement_approval_level` (`current_approval_level`),
  ADD FOREIGN KEY (`level_1_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD FOREIGN KEY (`level_1_rejected_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD FOREIGN KEY (`super_admin_approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  ADD FOREIGN KEY (`super_admin_rejected_by`) REFERENCES `users`(`id`) ON DELETE SET NULL;

-- Update status enum to include new statuses
ALTER TABLE `reimbursements`
  MODIFY COLUMN `status` ENUM(
    'Pending', 
    'Waiting for Approval', 
    'Level 1 Approved', 
    'Level 1 Rejected',
    'Super Admin Approved',
    'Super Admin Rejected',
    'Approved', 
    'Rejected', 
    'Processing', 
    'Paid'
  ) DEFAULT 'Pending';

-- Generate claim codes for existing reimbursements
UPDATE `reimbursements` 
SET `claim_code` = CONCAT('CLM-', LPAD(id, 6, '0'))
WHERE `claim_code` IS NULL;

-- ============================================
-- NOTES
-- ============================================
-- Workflow:
-- 1. Level 2 user creates claim → status: 'Pending', current_approval_level: 'Level 2'
-- 2. Level 1 user approves → status: 'Level 1 Approved', current_approval_level: 'Super Admin'
-- 3. Super Admin approves → status: 'Super Admin Approved', current_approval_level: 'Completed'
-- 
-- If Level 1 user creates claim:
-- 1. Level 1 user creates claim → status: 'Waiting for Approval', current_approval_level: 'Super Admin'
-- 2. Super Admin approves/rejects directly
--
-- Status meanings:
-- - 'Pending': Level 2 claim waiting for Level 1 approval
-- - 'Waiting for Approval': Level 1 claim waiting for Super Admin approval
-- - 'Level 1 Approved': Approved by Level 1, waiting for Super Admin
-- - 'Level 1 Rejected': Rejected by Level 1
-- - 'Super Admin Approved': Approved by Super Admin
-- - 'Super Admin Rejected': Rejected by Super Admin
-- - 'Processing': Approved and being processed
-- - 'Paid': Payment completed

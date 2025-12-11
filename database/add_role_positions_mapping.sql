-- Migration Script: Add role_positions junction table for role-to-position mapping
-- This allows Super Admin to map multiple positions to each role
-- Example: Developer role can have positions: Developer, iOS Developer, Android Developer, Senior Developer, Flutter Developer, etc.

USE `admin_dashboard`;

-- Create role_positions junction table
CREATE TABLE IF NOT EXISTS `role_positions` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `position_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_position` (`role_id`, `position_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE CASCADE,
  INDEX `idx_role_position` (`role_id`, `position_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Optional: Add some default mappings if needed
-- Example: Map Developer role to common developer positions
-- INSERT INTO `role_positions` (`role_id`, `position_id`)
-- SELECT r.id, p.id
-- FROM roles r
-- CROSS JOIN positions p
-- WHERE r.name = 'Developer' AND p.name IN ('Developer', 'Senior Developer');

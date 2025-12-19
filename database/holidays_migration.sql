-- ============================================
-- HOLIDAYS TABLE MIGRATION
-- ============================================

USE `admin_dashboard`;

-- Create holidays table
CREATE TABLE IF NOT EXISTS `holidays` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `holiday_name` VARCHAR(255) NOT NULL,
  `date` DATE NOT NULL,
  `day` VARCHAR(20) NOT NULL,
  `is_restricted` BOOLEAN DEFAULT FALSE,
  `year` INT UNSIGNED NOT NULL,
  `created_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_holiday_date` (`date`),
  INDEX `idx_holiday_year` (`year`),
  INDEX `idx_holiday_restricted` (`is_restricted`),
  UNIQUE KEY `uk_holiday_date` (`date`, `holiday_name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


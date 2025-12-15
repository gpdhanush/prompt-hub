-- Migration: Add password reset OTP table
-- Date: 2024

-- Password reset OTP table
CREATE TABLE IF NOT EXISTS `password_reset_otps` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `user_id` INT UNSIGNED NOT NULL,
  `email` VARCHAR(255) NOT NULL,
  `otp` VARCHAR(10) NOT NULL,
  `expires_at` TIMESTAMP NOT NULL,
  `used` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_otp_email` (`email`),
  INDEX `idx_otp_user` (`user_id`),
  INDEX `idx_otp_expires` (`expires_at`),
  INDEX `idx_otp_used` (`used`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


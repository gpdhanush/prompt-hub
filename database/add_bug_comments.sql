-- Add bug comments table with threading support
-- This allows testers and developers to have threaded conversations

USE admin_dashboard;

-- Create bug_comments table
CREATE TABLE IF NOT EXISTS `bug_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `bug_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `parent_id` INT UNSIGNED NULL,
  `comment_text` TEXT NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_id`) REFERENCES `bug_comments`(`id`) ON DELETE CASCADE,
  INDEX `idx_bug_comments_bug_id` (`bug_id`),
  INDEX `idx_bug_comments_parent_id` (`parent_id`),
  INDEX `idx_bug_comments_user_id` (`user_id`),
  INDEX `idx_bug_comments_created_at` (`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

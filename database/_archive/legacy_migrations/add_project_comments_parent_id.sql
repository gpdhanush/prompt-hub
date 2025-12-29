-- Add parent_comment_id column to project_comments table for threaded replies
-- This migration adds support for nested/threaded comments similar to task_comments

ALTER TABLE `project_comments`
ADD COLUMN `parent_comment_id` INT UNSIGNED NULL AFTER `comment_source`,
ADD INDEX `idx_project_comments_parent` (`parent_comment_id`),
ADD CONSTRAINT `fk_project_comments_parent`
  FOREIGN KEY (`parent_comment_id`) 
  REFERENCES `project_comments`(`id`) 
  ON DELETE CASCADE;


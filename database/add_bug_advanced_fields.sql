-- Add comprehensive bug fields
-- This migration adds all the additional bug information fields
-- Safe to run multiple times (idempotent) - compatible with MariaDB

USE admin_dashboard;

SET @dbname = DATABASE();
SET @tablename = 'bugs';

-- Add bug title (if not exists)
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'title') > 0,
  'SELECT "Column title already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `title` VARCHAR(255) AFTER `bug_code`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add project_id
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'project_id') > 0,
  'SELECT "Column project_id already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `project_id` INT UNSIGNED AFTER `task_id`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add bug_type
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'bug_type') > 0,
  'SELECT "Column bug_type already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `bug_type` ENUM(\'Functional\', \'UI/UX\', \'Performance\', \'Security\', \'Integration\', \'Crash\', \'Data Issue\') DEFAULT \'Functional\' AFTER `severity`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update severity enum to include Critical (application down) and High, Medium, Low
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'severity' 
   AND COLUMN_TYPE LIKE '%Critical%') > 0,
  'SELECT "Severity enum already updated" AS message',
  'ALTER TABLE `bugs` MODIFY COLUMN `severity` ENUM(\'Critical\', \'High\', \'Medium\', \'Low\') DEFAULT \'Low\''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add priority
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'priority') > 0,
  'SELECT "Column priority already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `priority` ENUM(\'P1\', \'P2\', \'P3\', \'P4\') DEFAULT \'P4\' AFTER `bug_type`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update status enum to include all new statuses
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'status' 
   AND COLUMN_TYPE LIKE '%In Progress%') > 0,
  'SELECT "Status enum already updated" AS message',
  'ALTER TABLE `bugs` MODIFY COLUMN `status` ENUM(\'Open\', \'In Progress\', \'In Review\', \'Reopened\', \'Blocked\', \'Fixed\', \'Closed\', \'Fixing\', \'Retesting\', \'Passed\', \'Rejected\', \'Duplicate\', \'Not a Bug\') DEFAULT \'Open\''
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add resolution_type
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'resolution_type') > 0,
  'SELECT "Column resolution_type already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `resolution_type` ENUM(\'Fixed\', \'Duplicate\', \'Not a Bug\', \'Won\'\'t Fix\', \'Cannot Reproduce\', \'Deferred\') AFTER `status`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add team_lead_id
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'team_lead_id') > 0,
  'SELECT "Column team_lead_id already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `team_lead_id` INT UNSIGNED AFTER `assigned_to`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add environment fields
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'browser') > 0,
  'SELECT "Column browser already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `browser` VARCHAR(100) AFTER `actual_behavior`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'device') > 0,
  'SELECT "Column device already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `device` ENUM(\'Mobile\', \'Desktop\', \'Tablet\') AFTER `browser`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'os') > 0,
  'SELECT "Column os already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `os` VARCHAR(100) AFTER `device`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'app_version') > 0,
  'SELECT "Column app_version already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `app_version` VARCHAR(50) AFTER `os`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'api_endpoint') > 0,
  'SELECT "Column api_endpoint already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `api_endpoint` VARCHAR(500) AFTER `app_version`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add timeline fields
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'target_fix_date') > 0,
  'SELECT "Column target_fix_date already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `target_fix_date` DATE AFTER `updated_at`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'actual_fix_date') > 0,
  'SELECT "Column actual_fix_date already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `actual_fix_date` DATE AFTER `target_fix_date`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'reopened_count') > 0,
  'SELECT "Column reopened_count already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `reopened_count` INT UNSIGNED DEFAULT 0 AFTER `actual_fix_date`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add tags
SET @preparedStatement = (SELECT IF(
  (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
   WHERE TABLE_SCHEMA = @dbname 
   AND TABLE_NAME = @tablename 
   AND COLUMN_NAME = 'tags') > 0,
  'SELECT "Column tags already exists" AS message',
  'ALTER TABLE `bugs` ADD COLUMN `tags` VARCHAR(500) AFTER `reopened_count`'
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Add foreign keys
SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bugs'
      AND CONSTRAINT_NAME = 'fk_bug_project'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `bugs` ADD CONSTRAINT `fk_bug_project` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL',
    'SELECT "Foreign key fk_bug_project already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @fk_exists = (
    SELECT COUNT(*) 
    FROM information_schema.TABLE_CONSTRAINTS 
    WHERE CONSTRAINT_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bugs'
      AND CONSTRAINT_NAME = 'fk_bug_team_lead'
);
SET @sql = IF(@fk_exists = 0,
    'ALTER TABLE `bugs` ADD CONSTRAINT `fk_bug_team_lead` FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL',
    'SELECT "Foreign key fk_bug_team_lead already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add indexes
SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bugs'
      AND INDEX_NAME = 'idx_bug_project'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `bugs` ADD INDEX `idx_bug_project` (`project_id`)',
    'SELECT "Index idx_bug_project already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bugs'
      AND INDEX_NAME = 'idx_bug_priority'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `bugs` ADD INDEX `idx_bug_priority` (`priority`)',
    'SELECT "Index idx_bug_priority already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @index_exists = (
    SELECT COUNT(*) 
    FROM information_schema.STATISTICS 
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'bugs'
      AND INDEX_NAME = 'idx_bug_type'
);
SET @sql = IF(@index_exists = 0,
    'ALTER TABLE `bugs` ADD INDEX `idx_bug_type` (`bug_type`)',
    'SELECT "Index idx_bug_type already exists" AS message'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

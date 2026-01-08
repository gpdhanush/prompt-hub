CREATE TABLE IF NOT EXISTS `projects` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_code` VARCHAR(50) NOT NULL UNIQUE,
  `name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `logo_url` VARCHAR(500),
  `estimated_delivery_plan` TEXT,
  `client_name` VARCHAR(255),
  `client_contact_person` VARCHAR(255),
  `client_email` VARCHAR(255),
  `client_phone` VARCHAR(50),
  `is_internal` BOOLEAN DEFAULT FALSE,
  `project_admin_id` INT UNSIGNED,
  `team_lead_id` INT UNSIGNED,
  `start_date` DATE,
  `end_date` DATE,
  `target_end_date` DATE,
  `actual_end_date` DATE,
  `project_duration_days` INT UNSIGNED,
  `status` ENUM('Not Started', 'Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled', 'Testing', 'Pre-Prod', 'Production') DEFAULT 'Not Started',
  `risk_level` ENUM('Low', 'Medium', 'High'),
  `priority` ENUM('Low', 'Medium', 'High', 'Critical'),
  `progress` INT UNSIGNED DEFAULT 0 CHECK (`progress` >= 0 AND `progress` <= 100),
  `daily_reporting_required` BOOLEAN DEFAULT FALSE,
  `report_submission_time` TIME,
  `auto_reminder_notifications` BOOLEAN DEFAULT FALSE,
  `internal_notes` TEXT,
  `client_notes` TEXT,
  `admin_remarks` TEXT,
  `github_repo_url` VARCHAR(500),
  `bitbucket_repo_url` VARCHAR(500),
  `technologies_used` JSON,
  `created_by` INT UNSIGNED,
  `updated_by` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_admin_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_project_code` (`project_code`),
  INDEX `idx_project_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_users` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role_in_project` ENUM('admin', 'tl', 'developer', 'qa', 'designer', 'employee') DEFAULT 'employee',
  `joined_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_project_user` (`project_id`, `user_id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  INDEX `idx_project_user` (`project_id`, `user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `tasks` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NULL UNIQUE,
  `task_code` VARCHAR(10) NOT NULL UNIQUE,
  `project_id` INT UNSIGNED NOT NULL,
  `title` VARCHAR(500) NOT NULL,
  `description` TEXT,
  `assigned_to` INT UNSIGNED,
  `developer_id` INT UNSIGNED,
  `designer_id` INT UNSIGNED,
  `tester_id` INT UNSIGNED,
  `priority` ENUM('Low', 'Med', 'High') DEFAULT 'Med',
  `stage` ENUM('Analysis', 'Documentation', 'Development', 'Testing', 'Pre-Prod', 'Production', 'Closed') DEFAULT 'Analysis',
  `status` ENUM('Open', 'In Progress', 'Ready for Testing', 'Testing', 'Failed', 'Closed', 'Not a Bug', 'Production Bug', 'TBD') DEFAULT 'Open',
  `deadline` DATE,
  `created_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `is_open` BOOLEAN DEFAULT FALSE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`developer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`designer_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`tester_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_task_code` (`task_code`),
  INDEX `idx_task_status` (`status`),
  INDEX `idx_task_stage` (`stage`),
  INDEX `idx_task_priority` (`priority`),
  INDEX `idx_task_project` (`project_id`),
  INDEX `idx_task_developer` (`developer_id`),
  INDEX `idx_task_designer` (`designer_id`),
  INDEX `idx_task_tester` (`tester_id`),
  INDEX `idx_task_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `bugs` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `uuid` VARCHAR(36) NULL UNIQUE,
  `bug_code` VARCHAR(50) NOT NULL UNIQUE,
  `title` VARCHAR(255),
  `task_id` INT UNSIGNED,
  `project_id` INT UNSIGNED,
  `reported_by` INT UNSIGNED NOT NULL,
  `updated_by` INT UNSIGNED,
  `assigned_to` INT UNSIGNED,
  `team_lead_id` INT UNSIGNED,
  `bug_type` ENUM('Functional', 'UI/UX', 'Performance', 'Security', 'Integration', 'Crash', 'Data Issue') DEFAULT 'Functional',
  `priority` ENUM('Critical', 'High', 'Medium', 'Low') DEFAULT 'Low',
  `status` ENUM('Open', 'In Progress', 'In Review', 'Reopened', 'Blocked', 'Fixed', 'Closed', 'Fixing', 'Testing', 'Retesting', 'Passed', 'Rejected', 'Duplicate', 'Not a Bug') DEFAULT 'Open',
  `description` TEXT NOT NULL,
  `steps_to_reproduce` TEXT,
  `expected_behavior` TEXT,
  `actual_behavior` TEXT,
  `browser` VARCHAR(100),
  `device` ENUM('Mobile', 'Desktop', 'Tablet'),
  `os` VARCHAR(100),
  `app_version` VARCHAR(50),
  `deadline` DATE,
  `reopened_count` INT UNSIGNED DEFAULT 0,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`reported_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`team_lead_id`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_bug_code` (`bug_code`),
  INDEX `idx_bug_status` (`status`),
  INDEX `idx_bug_project` (`project_id`),
  INDEX `idx_bug_priority` (`priority`),
  INDEX `idx_bug_type` (`bug_type`),
  INDEX `idx_bug_uuid` (`uuid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `reimbursements` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL, -- Note: employee_id is foreign key to employees table in 02_schema_hr.sql. This might cause dependency issue if running sequentially if `employees` not created yet. 
  -- But usually schemas are loaded in order. 01 vs 02.
  -- Wait, `reimbursements` was in 02_schema_support.sql. I should probably keep it there.
  -- BUT `attachments` table refs `reimbursements`. 
  -- IF I keep `reimbursements` in 02, then `attachments` in 01 will fail if foreign key constraint is checked immediately upon creation.
  -- However, `attachments` table is defined in 01. 
  -- If I define `attachments` in 01, it references `reimbursements` (which is in 02).
  -- This is a circular dependency if I'm not careful.
  -- Best practice: Define `reimbursements` before `attachments` OR use ALTER TABLE to add FKs later.
  -- Or just put `reimbursements` in 02 and `attachments` in 02/03?
  -- `attachments` also references `tasks` (01) and `bugs` (01).
  -- Solution: I will put `reimbursements` in 02 (HR).
  -- And I will put the `CREATE TABLE attachments` in `03_schema_assets.sql` (or `04_misc`) or simply at the end of `02`?
  -- Actually, `attachments` is used heavily by projects/tasks.
  -- If `attachments` is in 01, it needs `reimbursements` to exist.
  -- I can remove the FK to `reimbursements` in `attachments` creation script in 01 and add it via ALTER TABLE in 02?
  -- OR I can assume `SET FOREIGN_KEY_CHECKS=0;` is used during import.
  -- I will stick to what was there, but `reimbursements` was in `02`. So `attachments` in `01` referencing `reimbursements` in `02` implies `01` fails if run before `02` without disabling checks.
  -- The original `01_schema_project.sql` had `attachments` referencing `reimbursements`.
  -- I'll keep `attachments` here but I must note the dependency.
  -- Wait, `reimbursements` table IS NOT in `01_schema_project.sql` in the original file I read.
  -- I read `01_schema_project.sql` content in Step 162. Lines 1-19 define `attachments`, and line 5 references `reimbursement_id`, and line 15 references `reimbursements`(`id`).
  -- BUT `reimbursements` table create statement was in `02_schema_support.sql` (Step 159, lines 489-508).
  -- So strictly speaking, `01` depends on `02` for `reimbursements`.
  -- To make it clean, I should probably move `attachments` table to a later file, or `reimbursements` to an earlier file.
  -- `reimbursements` depends on `employees` (in 02). `employees` depends on `users` (in 00).
  -- So: 00 (users) -> 02 (employees) -> 02 (reimbursements).
  -- 01 (projects/tasks/bugs) don't depend on employees/reimbursements (except attachments).
  -- So `attachments` should be defined AFTER `reimbursements`, `tasks`, and `bugs`.
  -- So I should move `CREATE TABLE attachments` to the END of `02` or to `03`?
  -- Or I can just remove the FK constraint in `CREATE TABLE` and add it later?
  -- I'll move `attachments` to `03_schema_assets.sql` (or a generic `04_schema_common.sql`?).
  -- The user asked to consolidate.
  -- I'll move `attachments` to `03_schema_assets.sql` (which I'm creating/splitting).
  -- Or I can leave it here but it's risky.
  -- I'll leave it out of `01` for now and put it in `04_schema_misc` or `02`...
  -- Actually, let's look at `02_schema_support.sql` again. It has `asset_ticket_attachments` and `inventory_attachments` separate.
  -- But `attachments` is generic.
  -- I'll put `attachments` in `03_schema_misc.sql` (my new file 4).
  
  -- So for `01_schema_project.sql`:
  -- Projects, Project Users, Tasks, Task Comments, Task History, Timesheets, Bugs, Bug Comments, Project Files, Project Milestones, Project Daily Status, Project Client Call Notes, Project Comments.
  -- REMOVED `attachments`.
  
  -- Wait, `bugs` references `users`. `projects` references `users`. `tasks` references `users`.
  -- `01` depends on `00`. That's fine.
  
  -- Let's define the tables.
  
  `amount` DECIMAL(10, 2) -- placeholders content from edit
);

CREATE TABLE IF NOT EXISTS `project_milestones` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `name` VARCHAR(255) NOT NULL,
  `start_date` DATE,
  `end_date` DATE,
  `status` ENUM('Not Started', 'In Progress', 'Completed', 'Delayed', 'Cancelled') DEFAULT 'Not Started',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  INDEX `idx_milestone_project` (`project_id`),
  INDEX `idx_milestone_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_files` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `file_type` ENUM('SOW', 'Contract', 'Design Document', 'Requirement Doc', 'Change Request', 'Meeting Notes', 'Other') NOT NULL,
  `file_category` VARCHAR(100),
  `file_name` VARCHAR(255) NOT NULL,
  `description` TEXT,
  `file_url` VARCHAR(500) NOT NULL,
  `file_size` INT UNSIGNED,
  `uploaded_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`uploaded_by`) REFERENCES `users`(`id`),
  INDEX `idx_file_project` (`project_id`),
  INDEX `idx_file_type` (`file_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_daily_status` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `work_date` DATE NOT NULL,
  `hours_worked` DECIMAL(4,2) NOT NULL DEFAULT 0.00,
  `minutes_worked` INT UNSIGNED NOT NULL DEFAULT 0,
  `total_minutes` INT UNSIGNED GENERATED ALWAYS AS ((hours_worked * 60) + minutes_worked) STORED,
  `work_description` TEXT,
  `tasks_completed` TEXT,
  `blockers` TEXT,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  UNIQUE KEY `uk_project_user_date` (`project_id`, `user_id`, `work_date`),
  INDEX `idx_daily_status_project` (`project_id`),
  INDEX `idx_daily_status_user` (`user_id`),
  INDEX `idx_daily_status_date` (`work_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_client_call_notes` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `call_date` DATETIME NOT NULL,
  `call_duration_minutes` INT UNSIGNED,
  `participants` TEXT,
  `notes` TEXT NOT NULL,
  `action_items` TEXT,
  `follow_up_required` BOOLEAN DEFAULT FALSE,
  `follow_up_date` DATE,
  `created_by` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`),
  INDEX `idx_call_notes_project` (`project_id`),
  INDEX `idx_call_notes_date` (`call_date`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `project_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `project_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `comment_type` ENUM('General', 'Developer', 'Tester', 'Designer', 'Team Lead', 'Client') DEFAULT 'General',
  `comment` TEXT NOT NULL,
  `is_internal` BOOLEAN DEFAULT TRUE,
  `attachments` JSON,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  INDEX `idx_project_comments_project` (`project_id`),
  INDEX `idx_project_comments_user` (`user_id`),
  INDEX `idx_project_comments_type` (`comment_type`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_comments` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `user_id` INT UNSIGNED NOT NULL,
  `role` VARCHAR(50),
  `comment` TEXT NOT NULL,
  `parent_comment_id` INT UNSIGNED,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`parent_comment_id`) REFERENCES `task_comments`(`id`) ON DELETE CASCADE,
  INDEX `idx_task_comment` (`task_id`),
  INDEX `idx_comment_parent` (`parent_comment_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `task_history` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `task_id` INT UNSIGNED NOT NULL,
  `from_status` VARCHAR(50),
  `to_status` VARCHAR(50),
  `changed_by` INT UNSIGNED NOT NULL,
  `timestamp` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `note` TEXT,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`),
  INDEX `idx_task_history` (`task_id`),
  INDEX `idx_history_timestamp` (`timestamp`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `timesheets` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `employee_id` INT UNSIGNED NOT NULL,
  `task_id` INT UNSIGNED,
  `bug_id` INT UNSIGNED,
  `project_id` INT UNSIGNED,
  `date` DATE NOT NULL,
  `hours` DECIMAL(4, 2) NOT NULL,
  `notes` TEXT,
  `approved_by` INT UNSIGNED,
  `approved_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  -- FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE, -- Note: employee_id FK commented out to avoid dependency on 02.sql
  FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`bug_id`) REFERENCES `bugs`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL,
  FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL,
  INDEX `idx_timesheet_date` (`date`),
  INDEX `idx_timesheet_employee` (`employee_id`),
  INDEX `idx_timesheet_bug` (`bug_id`),
  INDEX `idx_timesheet_project` (`project_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
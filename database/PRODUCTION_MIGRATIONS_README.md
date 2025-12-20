# Production Database Migrations

This directory contains **6 production-ready SQL migration files** for the `prasowla_ntpl_admin` database.

## ⚠️ IMPORTANT: Run in Sequence

**Always run the migration files in numerical order (01, 02, 03, 04, 05, 06)**

## Migration Files Overview

### Part 01: Core Schema
**File:** `production_migration_part_01.sql`
- Authentication & Authorization tables (roles, permissions, users)
- Employee Management tables
- Project Management tables
- Includes UUID columns, theme preferences, client security features
- **Tables:** roles, permissions, role_permissions, positions, users, password_history, password_reset_otps, refresh_tokens, mfa_role_settings, mfa_verification_attempts, employees, employee_documents, attendance, leaves, holidays, reimbursements, projects, project_users, project_milestones, project_files, project_change_requests, project_client_call_notes, project_credentials, project_daily_status, project_comments, project_activities

### Part 02: Task Management & Features
**File:** `production_migration_part_02.sql`
- Task Management tables
- Bugs table
- Timesheets table
- AI Prompt Library tables
- Notifications & Audit tables
- Settings, FCM Tokens, Calendar Reminders
- Views
- **Tables:** tasks, task_comments, task_history, bugs, bug_comments, attachments, timesheets, prompts, prompt_logs, notifications, audit_logs, settings, fcm_tokens, calendar_reminders

### Part 03: IT Asset Management
**File:** `production_migration_part_03.sql`
- IT Asset Management tables
- Asset detail tables (laptop, mobile, accessory)
- Asset maintenance and audit logs
- Asset approvals and settings
- Inventory Management tables
- Triggers and views
- **Tables:** asset_categories, assets, asset_laptop_details, asset_mobile_details, asset_accessory_details, asset_assignments, asset_tickets, asset_ticket_comments, asset_ticket_attachments, asset_audit_logs, asset_maintenance, asset_approvals, asset_settings, inventory_items, inventory_transactions, inventory_attachments

### Part 04: Kanban Tables
**File:** `production_migration_part_04.sql`
- **IMPORTANT:** Cleans up orphaned data before creating tables
- Kanban Boards, Columns, Tasks
- Kanban Integrations and History
- Kanban Board Members (with proper foreign key constraints)
- Kanban Time Logs
- **Tables:** kanban_boards, kanban_columns, kanban_tasks, kanban_integrations, kanban_task_history, kanban_board_members, kanban_time_logs

### Part 05: Fixes and Data Updates
**File:** `production_migration_part_05.sql`
- Fixes project ID = 0 if exists
- Ensures all UUIDs are generated
- Sets default values for all tables
- Ensures CLIENT role exists
- **Safe to run multiple times**

### Part 06: Seed Data
**File:** `production_migration_part_06.sql`
- Roles seed data
- Permissions seed data (all modules)
- Role-Permission mappings
- Positions seed data (hierarchical)
- Super Admin user creation
- Settings seed data
- Asset Categories seed data
- Asset Settings seed data
- MFA Role Settings seed data
- **Uses ON DUPLICATE KEY UPDATE - safe to run multiple times**

## How to Run

### Option 1: MySQL Command Line

```bash
# Connect to MySQL
mysql -u your_username -p

# Select database
USE prasowla_ntpl_admin;

# Run each file in order
SOURCE /path/to/production_migration_part_01.sql;
SOURCE /path/to/production_migration_part_02.sql;
SOURCE /path/to/production_migration_part_03.sql;
SOURCE /path/to/production_migration_part_04.sql;
SOURCE /path/to/production_migration_part_05.sql;
SOURCE /path/to/production_migration_part_06.sql;
```

### Option 2: Direct File Execution

```bash
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_01.sql
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_02.sql
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_03.sql
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_04.sql
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_05.sql
mysql -u your_username -p prasowla_ntpl_admin < production_migration_part_06.sql
```

### Option 3: phpMyAdmin

1. Select your database `prasowla_ntpl_admin`
2. Go to the SQL tab
3. Copy and paste the contents of each file in order (01, 02, 03, 04, 05, 06)
4. Execute each file sequentially

## Key Features Included

### ✅ UUID Support
- All major tables have UUID columns
- UUIDs are automatically generated for existing records
- Used for URL masking and security

### ✅ Client Security
- `users.is_active` for client activation/deactivation
- `users.token_version` for forced logout
- `projects.is_active` for project-level access control
- `project_users.is_active` for user-project access control
- Encrypted comment fields for sensitive data

### ✅ Theme Preferences
- `users.theme_color` - Per-user theme color
- `users.theme_mode` - Per-user theme mode (light/dark/system)
- Prevents conflicts when multiple users share a browser

### ✅ Kanban Module
- Complete Kanban board system
- GitHub integration support
- Time tracking
- **Orphaned data cleanup included** - fixes foreign key constraint errors

### ✅ Multi-Level Approvals
- Reimbursements with Level 1 and Super Admin approval
- Asset approvals workflow

### ✅ MFA Support
- Multi-factor authentication tables
- Role-based MFA enforcement

## Important Notes

1. **Backup First**: Always backup your database before running migrations:
   ```bash
   mysqldump -u your_username -p prasowla_ntpl_admin > backup_before_migration.sql
   ```

2. **Fresh Installation**: If creating a fresh database:
   - Create the database first: `CREATE DATABASE prasowla_ntpl_admin DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
   - Run all parts sequentially
   - Files use `CREATE TABLE IF NOT EXISTS` and `ON DUPLICATE KEY UPDATE` to be idempotent

3. **Existing Database**: If you have an existing database:
   - Part 01-03: Safe to run (uses IF NOT EXISTS)
   - Part 04: Cleans up orphaned data and creates Kanban tables
   - Part 05: Safe to run (handles fixes and defaults)
   - Part 06: Safe to run (uses ON DUPLICATE KEY UPDATE)

4. **Foreign Key Checks**: Files handle `SET FOREIGN_KEY_CHECKS = 0/1` automatically

5. **Super Admin User**: Part 06 creates a default Super Admin user:
   - Email: `murali@gmail.com`
   - Password: `admin123`
   - **⚠️ CHANGE THIS PASSWORD IMMEDIATELY AFTER FIRST LOGIN!**

6. **Kanban Foreign Key Fix**: Part 04 includes cleanup of orphaned `kanban_board_members` records that reference non-existent boards. This fixes the error:
   ```
   #1452 - Cannot add or update a child row: a foreign key constraint fails
   ```

## Verification Queries

After running all migrations, verify the setup:

```sql
-- Check tables
SHOW TABLES;

-- Check Super Admin user
SELECT id, uuid, name, email, role_id, is_active FROM users WHERE email = 'murali@gmail.com';

-- Check UUIDs
SELECT 
  (SELECT COUNT(*) FROM users WHERE uuid IS NOT NULL) as users_with_uuid,
  (SELECT COUNT(*) FROM projects WHERE uuid IS NOT NULL) as projects_with_uuid,
  (SELECT COUNT(*) FROM tasks WHERE uuid IS NOT NULL) as tasks_with_uuid,
  (SELECT COUNT(*) FROM bugs WHERE uuid IS NOT NULL) as bugs_with_uuid;

-- Check permissions
SELECT COUNT(*) as total_permissions FROM permissions;

-- Check roles
SELECT * FROM roles;

-- Check asset categories
SELECT * FROM asset_categories;

-- Check Kanban tables
SELECT COUNT(*) as kanban_boards FROM kanban_boards;
SELECT COUNT(*) as kanban_board_members FROM kanban_board_members;
```

## Troubleshooting

### Error: Table already exists
- This is normal if running on an existing database
- The migrations use `IF NOT EXISTS` clauses

### Error: Duplicate entry
- Check if seed data already exists
- The migrations use `ON DUPLICATE KEY UPDATE` to handle this

### Error: Foreign key constraint fails
- Make sure you're running migrations in order
- Check that parent tables exist before child tables
- Part 04 includes cleanup for orphaned Kanban data

### Error: Column already exists
- Some ALTER statements use conditional logic
- If a column already exists, the migration will skip it

### Error: #1452 - Cannot add or update a child row
- This is fixed in Part 04 which cleans up orphaned data before adding constraints
- If you still see this error, run Part 04 again

## Support

If you encounter any issues:
1. Check the error message carefully
2. Verify you're running migrations in the correct order (01-06)
3. Ensure your MySQL version is 8.0 or higher
4. Check that all required privileges are granted
5. Verify the database name is `prasowla_ntpl_admin`

## Database Requirements

- MySQL 8.0 or higher
- Database: `prasowla_ntpl_admin`
- Character Set: `utf8mb4`
- Collation: `utf8mb4_unicode_ci`


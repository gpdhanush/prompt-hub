# Consolidated Database Migrations

This directory contains consolidated database migrations split into multiple files for easier management. Each file contains approximately 750 lines or less.

## Migration Files

The migrations are organized into 5 parts that should be run in sequence:

1. **consolidated_migrations_part_01.sql** - Base schema and core tables
   - Authentication & Authorization tables (roles, permissions, users)
   - Employee Management tables
   - Project Management tables
   - Project Activities table

2. **consolidated_migrations_part_02.sql** - Task Management and Additional Features
   - Task Management tables
   - Bugs table
   - Timesheets table
   - AI Prompt Library tables
   - Notifications & Audit tables
   - Settings table
   - FCM Tokens table
   - Calendar Reminders table
   - Views

3. **consolidated_migrations_part_03.sql** - IT Asset Management
   - IT Asset Management tables (assets, categories, assignments, tickets)
   - Asset detail tables (laptop, mobile, accessory)
   - Asset maintenance and audit logs
   - Asset approvals and settings
   - Inventory Management tables
   - Inventory triggers and views

4. **consolidated_migrations_part_04.sql** - Table Modifications and ALTER Statements
   - Users table modifications (MFA, session management)
   - Roles table modifications (level column)
   - Positions table modifications (hierarchy)
   - Employees table modifications (status, skype/teams, whatsapp, bank details)
   - Employee Documents modifications
   - Reimbursements multi-level approval
   - Timesheets modifications (bug_id, project_id)
   - MFA tables

5. **consolidated_migrations_part_05.sql** - Seed Data and Initial Setup
   - Roles seed data
   - Permissions seed data (all modules)
   - Role-Permission mappings
   - Positions seed data (hierarchical)
   - Super Admin user creation
   - Settings seed data
   - Asset Categories seed data
   - Asset Settings seed data
   - Project ID fix (if id=0 exists)

## How to Run

### Option 1: Run All Migrations Sequentially

```bash
# Run in order
mysql -u your_username -p admin_dashboard < consolidated_migrations_part_01.sql
mysql -u your_username -p admin_dashboard < consolidated_migrations_part_02.sql
mysql -u your_username -p admin_dashboard < consolidated_migrations_part_03.sql
mysql -u your_username -p admin_dashboard < consolidated_migrations_part_04.sql
mysql -u your_username -p admin_dashboard < consolidated_migrations_part_05.sql
```

### Option 2: Using MySQL Command Line

```sql
-- Connect to MySQL
mysql -u your_username -p

-- Select database
USE admin_dashboard;

-- Run each file
SOURCE /path/to/consolidated_migrations_part_01.sql;
SOURCE /path/to/consolidated_migrations_part_02.sql;
SOURCE /path/to/consolidated_migrations_part_03.sql;
SOURCE /path/to/consolidated_migrations_part_04.sql;
SOURCE /path/to/consolidated_migrations_part_05.sql;
```

### Option 3: Using phpMyAdmin

1. Select your database
2. Go to the SQL tab
3. Copy and paste the contents of each file in order
4. Execute each file sequentially

## Important Notes

1. **Run in Order**: Always run the migration files in numerical order (01, 02, 03, 04, 05)

2. **Backup First**: Always backup your database before running migrations:
   ```bash
   mysqldump -u your_username -p admin_dashboard > backup_before_migration.sql
   ```

3. **Fresh Installation**: If creating a fresh database, you can run all parts sequentially. The files use `CREATE TABLE IF NOT EXISTS` and `INSERT ... ON DUPLICATE KEY UPDATE` to be idempotent.

4. **Existing Database**: If you have an existing database:
   - Part 01-03: Safe to run (uses IF NOT EXISTS)
   - Part 04: Contains ALTER statements - review carefully
   - Part 05: Safe to run (uses ON DUPLICATE KEY UPDATE)

5. **Foreign Key Checks**: The files handle `SET FOREIGN_KEY_CHECKS = 0/1` automatically.

6. **Super Admin User**: Part 05 creates a default Super Admin user:
   - Email: `murali@gmail.com`
   - Password: `admin123`
   - **Change this password immediately after first login!**

## What's Included

### Core Features
- ✅ User authentication and authorization
- ✅ Role-based permissions system
- ✅ Employee management
- ✅ Project management
- ✅ Task and bug tracking
- ✅ Timesheet management
- ✅ Leave management
- ✅ Reimbursement management (multi-level approval)
- ✅ AI Prompt Library
- ✅ Audit logging
- ✅ Notifications

### IT Asset Management
- ✅ Asset categories and assets
- ✅ Asset assignments
- ✅ Asset tickets and requests
- ✅ Asset maintenance tracking
- ✅ Asset approvals workflow
- ✅ Inventory management
- ✅ Low stock alerts

### Additional Features
- ✅ MFA (Multi-Factor Authentication) support
- ✅ Session management
- ✅ FCM push notifications
- ✅ Calendar reminders
- ✅ Project activities (GitHub/Bitbucket webhooks)
- ✅ Position hierarchy

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

### Error: Column already exists
- Some ALTER statements use conditional logic
- If a column already exists, the migration will skip it

## Verification

After running all migrations, verify the setup:

```sql
-- Check tables
SHOW TABLES;

-- Check Super Admin user
SELECT * FROM users WHERE email = 'murali@gmail.com';

-- Check permissions
SELECT COUNT(*) FROM permissions;

-- Check roles
SELECT * FROM roles;

-- Check asset categories
SELECT * FROM asset_categories;
```

## Support

If you encounter any issues:
1. Check the error message carefully
2. Verify you're running migrations in the correct order
3. Ensure your MySQL version is 8.0 or higher
4. Check that all required privileges are granted


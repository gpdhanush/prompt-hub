# How to Configure Permissions

If you see **"No permissions data available. Permissions are not configured."** in the Settings page, you need to initialize the permissions in your database.

## Quick Fix

Run the SQL script to initialize all permissions and role-permission mappings:

### Option 1: Using MySQL Command Line

```bash
mysql -u your_username -p prasowla_ntpl_admin < database/initialize_permissions.sql
```

### Option 2: Using MySQL Workbench or phpMyAdmin

1. Open MySQL Workbench or phpMyAdmin
2. Select the `prasowla_ntpl_admin` database
3. Open the file `database/initialize_permissions.sql`
4. Execute the entire script

### Option 3: Using Node.js (if you have a script runner)

```bash
# If you have a database connection script
node -e "require('./server/config/database.js'); /* run SQL */"
```

## What the Script Does

1. **Inserts Permissions**: Creates all 25 base permissions (users, employees, projects, tasks, bugs, prompts, audit, settings)

2. **Maps Role Permissions**: Assigns permissions to each role:
   - **Super Admin**: All permissions (cannot be modified)
   - **Admin**: Most permissions (users, employees, projects, tasks, bugs, prompts, audit, settings)
   - **Team Lead**: Project and task management permissions
   - **Employee**: Basic task and bug management
   - **Viewer**: Read-only access
   - **Developer**: Similar to Employee
   - **Designer**: Similar to Employee
   - **Tester**: Bug and task viewing

3. **Uses ON DUPLICATE KEY UPDATE**: Safe to run multiple times - won't create duplicates

## Verification

After running the script, you should see:
- A summary table showing permission counts per role
- A success message: "Permissions initialized successfully!"

## Manual Check

You can verify permissions are configured by running:

```sql
SELECT 
  r.name as role_name,
  COUNT(rp.permission_id) as permission_count
FROM roles r
LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.allowed = TRUE
GROUP BY r.id, r.name
ORDER BY r.name;
```

## After Initialization

1. Refresh the Settings page in your application
2. Go to **Settings → Roles & Permissions** tab
3. Click on any role to see its permissions
4. As Super Admin, you can now edit permissions using the checkboxes

## Troubleshooting

### Still seeing "No permissions data available"?

1. **Check if roles exist**: 
   ```sql
   SELECT * FROM roles;
   ```

2. **Check if permissions exist**:
   ```sql
   SELECT * FROM permissions;
   ```

3. **Check if role_permissions exist**:
   ```sql
   SELECT * FROM role_permissions;
   ```

4. **Verify you're logged in as Super Admin**: Only Super Admin can see and edit permissions

### Permission IDs don't match?

If you have custom permissions or different IDs, you may need to:
1. Check your existing `permissions` table structure
2. Adjust the permission IDs in the script to match your database
3. Or run the full `seed.sql` script instead

## Alternative: Run Full Seed Script

If you want to start fresh with all default data:

```bash
mysql -u your_username -p prasowla_ntpl_admin < database/seed.sql
```

**Warning**: This will insert default roles, permissions, and sample users. Use only if you want to reset everything.

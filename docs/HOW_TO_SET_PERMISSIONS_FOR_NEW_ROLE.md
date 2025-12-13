# How to Set Permissions for a New Role

This guide explains how to assign permissions to a newly created role.

## Method 1: Using the UI (Recommended)

### Step 1: Create the New Role (if not already created)

1. Go to **Roles & Positions** page (if available) or create the role directly in the database
2. Or use SQL:
   ```sql
   INSERT INTO `roles` (`name`, `description`) 
   VALUES ('Your New Role Name', 'Role description here');
   ```

### Step 2: Set Permissions via Settings Page

1. **Login as Super Admin**
   - Only Super Admin can edit permissions

2. **Navigate to Settings**
   - Go to **Settings** → **Roles & Permissions** tab

3. **Select the New Role**
   - Click on the new role card to expand it
   - You'll see "No permissions data available" or an empty permissions list

4. **Click "Edit Permissions"**
   - A button will appear at the top right of the permissions section
   - Click it to enter edit mode

5. **Select/Deselect Permissions**
   - Permissions are grouped by module (Users, Employees, Projects, Tasks, Bugs, etc.)
   - Check the boxes for permissions you want to grant
   - Uncheck boxes for permissions you want to deny

6. **Save Changes**
   - Click the **"Save"** button
   - Permissions will be saved to the database
   - You'll see a success message

### Example: Setting Permissions for a "Project Manager" Role

1. Click on "Project Manager" role
2. Click "Edit Permissions"
3. Select permissions like:
   - ✅ Projects: View, Create, Edit
   - ✅ Tasks: View, Create, Edit, Assign
   - ✅ Bugs: View, Create, Edit
   - ✅ Employees: View
   - ❌ Users: (none)
   - ❌ Settings: (none)
4. Click "Save"

---

## Method 2: Using SQL (Direct Database)

If you prefer to set permissions directly via SQL:

### Step 1: Find the Role ID

```sql
SELECT id, name FROM roles WHERE name = 'Your New Role Name';
```

Note the `id` value (e.g., 9)

### Step 2: Find Permission IDs

```sql
SELECT id, code, module FROM permissions ORDER BY module, code;
```

### Step 3: Insert Permissions

```sql
-- Example: Grant specific permissions to role ID 9
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(9, 1, TRUE),  -- users.view
(9, 5, TRUE),  -- employees.view
(9, 8, TRUE),  -- projects.view
(9, 9, TRUE),  -- projects.create
(9, 10, TRUE), -- projects.edit
(9, 12, TRUE), -- tasks.view
(9, 13, TRUE), -- tasks.create
(9, 14, TRUE), -- tasks.edit
(9, 15, TRUE), -- tasks.assign
(9, 16, TRUE), -- bugs.view
(9, 17, TRUE), -- bugs.create
(9, 18, TRUE)  -- bugs.edit
ON DUPLICATE KEY UPDATE `allowed` = TRUE;
```

### Complete Example: Create Role and Set Permissions

```sql
-- 1. Create the role
INSERT INTO `roles` (`name`, `description`) 
VALUES ('Project Manager', 'Manages projects and teams')
ON DUPLICATE KEY UPDATE `description` = 'Manages projects and teams';

-- 2. Get the role ID (assuming it's 9)
SET @new_role_id = (SELECT id FROM roles WHERE name = 'Project Manager');

-- 3. Insert permissions
INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(@new_role_id, 5, TRUE),   -- employees.view
(@new_role_id, 8, TRUE),   -- projects.view
(@new_role_id, 9, TRUE),   -- projects.create
(@new_role_id, 10, TRUE),  -- projects.edit
(@new_role_id, 12, TRUE),  -- tasks.view
(@new_role_id, 13, TRUE),  -- tasks.create
(@new_role_id, 14, TRUE),  -- tasks.edit
(@new_role_id, 15, TRUE),   -- tasks.assign
(@new_role_id, 16, TRUE),  -- bugs.view
(@new_role_id, 17, TRUE),  -- bugs.create
(@new_role_id, 18, TRUE)   -- bugs.edit
ON DUPLICATE KEY UPDATE `allowed` = TRUE;
```

---

## Available Permissions Reference

Here are all available permissions you can assign:

### Users Module
- `users.view` (ID: 1) - View users list
- `users.create` (ID: 2) - Create new users
- `users.edit` (ID: 3) - Edit user details
- `users.delete` (ID: 4) - Delete users

### Employees Module
- `employees.view` (ID: 5) - View employees
- `employees.create` (ID: 6) - Create employees
- `employees.edit` (ID: 7) - Edit employees

### Projects Module
- `projects.view` (ID: 8) - View projects
- `projects.create` (ID: 9) - Create projects
- `projects.edit` (ID: 10) - Edit projects
- `projects.delete` (ID: 11) - Delete projects

### Tasks Module
- `tasks.view` (ID: 12) - View tasks
- `tasks.create` (ID: 13) - Create tasks
- `tasks.edit` (ID: 14) - Edit tasks
- `tasks.assign` (ID: 15) - Assign tasks

### Bugs Module
- `bugs.view` (ID: 16) - View bugs
- `bugs.create` (ID: 17) - Create bugs
- `bugs.edit` (ID: 18) - Edit bugs

### Prompts Module
- `prompts.view` (ID: 19) - View prompts
- `prompts.create` (ID: 20) - Create prompts
- `prompts.edit` (ID: 21) - Edit prompts
- `prompts.approve` (ID: 22) - Approve prompts
- `prompts.export` (ID: 23) - Export prompts

### Audit Module
- `audit.view` (ID: 24) - View audit logs

### Settings Module
- `settings.edit` (ID: 25) - Edit system settings

---

## Quick SQL Template

Use this template to quickly set permissions for a new role:

```sql
-- Replace @role_id with your new role's ID
-- Replace the permission IDs with the ones you want

INSERT INTO `role_permissions` (`role_id`, `permission_id`, `allowed`) VALUES
(@role_id, 1, TRUE),   -- users.view
(@role_id, 5, TRUE),   -- employees.view
(@role_id, 8, TRUE),   -- projects.view
-- Add more permissions as needed
ON DUPLICATE KEY UPDATE `allowed` = TRUE;
```

---

## Tips

1. **Start with minimal permissions**: Grant only what's needed, add more later
2. **Use the UI for visual clarity**: The Settings page shows permissions grouped by module
3. **Test after setting**: Assign the role to a test user and verify access
4. **Document your choices**: Note why certain permissions were granted/denied
5. **Super Admin is protected**: Super Admin role cannot have its permissions modified

---

## Troubleshooting

### "No permissions data available" after creating role
- This is normal for new roles
- Click "Edit Permissions" to start assigning permissions

### Can't see "Edit Permissions" button
- Make sure you're logged in as **Super Admin**
- The button only appears for roles other than Super Admin

### Permissions not saving
- Check browser console for errors
- Verify you have Super Admin access
- Try refreshing the page and editing again

### Need to remove all permissions
- In edit mode, uncheck all boxes and save
- Or use SQL: `DELETE FROM role_permissions WHERE role_id = ?`

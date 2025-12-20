# Client Project Assignment Guide

## Overview
This guide explains how to assign projects to CLIENT users and how the client dashboard displays assigned projects.

## How to Assign Projects to Clients

### Method 1: When Creating a New Project

1. **Navigate to Projects** → Click "New Project"
2. **Fill in Project Details** (name, description, dates, etc.)
3. **In the "Resource Allocation" Section:**
   - Select a Team Lead (optional, but recommended)
   - Scroll to **"Assigned Members (Optional)"**
   - You will see:
     - **Employees** that report to the selected Team Lead (if a Team Lead is selected)
     - **CLIENT users** (always visible, regardless of Team Lead selection)
4. **Select CLIENT Users:**
   - CLIENT users are highlighted with a blue background
   - They are labeled with "Client (Read-only)" badge
   - Click on CLIENT users to add them to the project
5. **Save the Project**

### Method 2: When Editing an Existing Project

1. **Navigate to Projects** → Click on a project
2. **Click "Edit Project"**
3. **In the "Resource Allocation" Section:**
   - Scroll to **"Assigned Members (Optional)"**
   - CLIENT users will appear in the list (even if no Team Lead is selected)
4. **Select/Deselect CLIENT Users:**
   - Click to add CLIENT users to the project
   - Click again to remove them
5. **Save Changes**

## How It Works (Technical Details)

### Database Structure

Projects are assigned to users (including clients) through the `project_users` table:

```sql
project_users (
  id,
  project_id,
  user_id,
  role_in_project,  -- 'admin', 'tl', 'developer', 'qa', 'designer', 'employee'
  is_active,         -- Must be 1 for client to see project
  joined_at
)
```

### Backend Logic

When you assign a CLIENT user to a project:
1. A record is inserted into `project_users` table with:
   - `project_id` = the project ID
   - `user_id` = the CLIENT user ID
   - `role_in_project` = 'employee' (default)
   - `is_active` = 1 (default)

### Access Control

For CLIENT users to see a project, **ALL** of these must be true:
- ✅ `users.is_active = 1` (client user is active)
- ✅ `projects.is_active = 1` (project is active)
- ✅ `project_users.is_active = 1` (project assignment is active)
- ✅ `project_users.user_id = client_user_id` (client is assigned to project)

## How Client Dashboard Shows Projects

### Dashboard Query

The client dashboard calls:
```javascript
projectsApi.getAll({ my_projects: 1 })
```

### Backend Filtering

The backend automatically filters projects for CLIENT users:

```javascript
// For CLIENT users, only show projects they have access to
if (userRole === 'CLIENT') {
  query += ` AND pu.user_id = ? AND pu.is_active = 1 AND p.is_active = 1`;
  params.push(userId);
}
```

### What Clients See

1. **Project Stats Cards:**
   - Total Projects (count of assigned projects)
   - In Progress (count of projects with status "In Progress")
   - Completed (count of projects with status "Completed")
   - On Hold (count of projects with status "On Hold")

2. **Assigned Projects List:**
   - Shows up to 5 most recent projects
   - Each project shows:
     - Project name
     - Project code
     - Status badge
     - Progress bar (if available)
   - Click on a project to view details
   - "View All Projects" button if more than 5 projects

3. **Next Holidays:**
   - Shows next 5 upcoming holidays
   - Highlights today's holiday
   - Shows days until holiday

### What Clients DON'T See

- ❌ Employees list
- ❌ Team members
- ❌ Internal notes
- ❌ Admin remarks
- ❌ Cost/estimate information
- ❌ GitHub/Bitbucket repo URLs
- ❌ Technologies used (in some views)

## Deactivating Client Access to a Project

### Method 1: Remove from Project Members

1. Edit the project
2. In "Assigned Members", uncheck the CLIENT user
3. Save changes

This sets `project_users.is_active = 0` for that client.

### Method 2: Deactivate Project Assignment (Database)

```sql
UPDATE project_users 
SET is_active = 0 
WHERE project_id = ? AND user_id = ?;
```

### Method 3: Deactivate the Entire Project

```sql
UPDATE projects 
SET is_active = 0 
WHERE id = ?;
```

This hides the project from ALL users (including clients).

## Troubleshooting

### Client Can't See Assigned Project

Check:
1. ✅ Client user is active: `users.is_active = 1`
2. ✅ Project is active: `projects.is_active = 1`
3. ✅ Project assignment is active: `project_users.is_active = 1`
4. ✅ Client is in `project_users` table: `SELECT * FROM project_users WHERE project_id = ? AND user_id = ?`

### Client Sees Wrong Projects

- Verify `project_users` table has correct `user_id` for the client
- Check that `is_active` flags are set correctly
- Ensure client is logged in with the correct account

### CLIENT Users Not Appearing in Member Selection

- Verify CLIENT users exist in `users` table with role = 'CLIENT' or 'Client'
- Check that users are active: `users.is_active = 1`
- Refresh the project form page

## Best Practices

1. **Always activate CLIENT users** before assigning them to projects
2. **Use descriptive project names** so clients can easily identify their projects
3. **Keep project status updated** so clients see accurate progress
4. **Regularly review project assignments** to ensure clients only see relevant projects
5. **Deactivate old projects** instead of deleting them to maintain audit trail

## Related Documentation

- [Client Security Implementation](./CLIENT_SECURITY_IMPLEMENTATION.md)
- [Super Admin User Management](./SUPER_ADMIN_USER_MANAGEMENT.md)


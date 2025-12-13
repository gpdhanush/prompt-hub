# How to Use the Roles & Permissions Screen

## Overview
The Roles & Permissions screen allows Super Admins to manage what actions each role can perform in the system. Permissions are organized by modules (e.g., Employees, IT Asset Management, Reports).

## Step-by-Step Guide

### 1. Access the Screen
- Navigate to **Roles & Permissions** from the sidebar (Super Admin only)
- You'll see a list of all roles in the system

### 2. Select a Role
- **Click on a role card** to expand it and view its current permissions
- The role card will highlight when selected
- Click again to collapse it

### 3. View Permissions
- Permissions are **grouped by module** (e.g., Employees, IT Asset Management)
- Each permission shows:
  - ✅ **Checkmark** = Permission is granted
  - ❌ **X mark** = Permission is denied
- Permissions are displayed in a grid layout (3 columns on large screens)

### 4. Edit Permissions (Super Admin Only)

#### Step 4.1: Enter Edit Mode
- Click the **"Edit Permissions"** button at the top of the permissions section
- The button appears only for roles other than "Super Admin"

#### Step 4.2: Select Permissions
Once in edit mode, you have several options:

**Option A: Select Individual Permissions**
- Click the **checkbox** next to each permission you want to grant
- Uncheck to revoke a permission
- Selected permissions are highlighted with a blue background

**Option B: Select All Permissions in a Module**
- At the top of each module section, you'll see a **"Check All"** checkbox
- Click it to select/deselect all permissions in that module at once
- Useful for granting full access to a module (e.g., all IT Asset Management permissions)

**Option C: Select All Permissions Globally**
- At the very top, there's a **"Check All Permissions"** checkbox
- This selects/deselects ALL permissions for the role at once
- Use this to grant full system access or revoke all permissions

### 5. Save Changes
- After making your selections, click the **"Save"** button
- A loading indicator will show while saving
- You'll see a success message when permissions are updated
- The screen will automatically exit edit mode

### 6. Cancel Changes
- If you want to discard your changes, click **"Cancel"**
- This will revert all checkboxes to their original state
- No changes will be saved

## Permission Naming Convention

Permissions follow this format: `module.action`

Examples:
- `employees.view` = View employees
- `it_assets.assets.create` = Create assets
- `reports.view` = View reports

## Common Permission Patterns

### Full Access to a Module
1. Click "Edit Permissions"
2. Find the module (e.g., "IT Asset Management")
3. Click "Check All" for that module
4. Click "Save"

### Grant Specific Actions Only
1. Click "Edit Permissions"
2. Find the module
3. Check only the specific permissions needed (e.g., only "view" and "create", but not "delete")
4. Click "Save"

### Grant Access to Multiple Modules
1. Click "Edit Permissions"
2. Use "Check All" for each module you want to grant access to
3. Click "Save"

## Important Notes

### Super Admin Role
- **Cannot be edited** - Super Admin automatically has all permissions
- No "Edit Permissions" button appears for this role
- This is by design for security

### Permission States
- **Checked (✅)**: User with this role CAN perform this action
- **Unchecked (❌)**: User with this role CANNOT perform this action

### Real-time Updates
- Changes take effect immediately after saving
- Users may need to refresh their browser to see permission changes
- Some permissions require a new login session

## Example Workflow

**Scenario: Grant Admin role full IT Asset Management access**

1. Navigate to Roles & Permissions
2. Click on "Admin" role card
3. Click "Edit Permissions" button
4. Scroll to "IT Asset Management" module
5. Click "Check All" next to "IT Asset Management"
6. Click "Save" button
7. Wait for success message
8. Done! Admin role now has all IT Asset Management permissions

## Troubleshooting

### Can't see "Edit Permissions" button?
- Make sure you're logged in as Super Admin
- The button only appears for roles other than "Super Admin"

### Changes not saving?
- Check your internet connection
- Make sure you clicked "Save" (not just "Cancel")
- Refresh the page and try again

### Can't find a specific permission?
- Permissions are grouped by module
- Use browser search (Ctrl+F / Cmd+F) to find specific permissions
- Make sure the migration script has been run to add all permissions

### Permission not working after assignment?
- User may need to log out and log back in
- Clear browser cache
- Verify the permission code matches what's expected in the code

## Visual Indicators

- **Blue highlight**: Selected/active role
- **Blue background on permission**: Permission is granted (in edit mode)
- **Checkmark icon**: Permission is granted (view mode)
- **X icon**: Permission is denied (view mode)
- **Loading spinner**: Saving in progress

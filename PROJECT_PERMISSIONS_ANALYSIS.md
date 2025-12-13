# Project Permissions Analysis

## Overview
This document provides a complete analysis of all permissions needed for the currently visible menus in the application, based on the AdminSidebar.tsx structure.

## Current Menu Structure

### 1. Dashboard
- **Route**: `/dashboard`
- **Access**: All authenticated users (no permission check)
- **Permission**: Not required (default access)

### 2. Administration Section (Super Admin only)
- **Audit Logs** (`/audit-logs`)
  - Permission: `audit.view` ✅ (exists in schema)
- **Roles & Positions** (`/roles-positions`)
  - Access: Super Admin only (role-based, no permission)
- **Roles & Permissions** (`/roles-permissions`)
  - Permission: `roles_permissions.view` ✅ (exists)

### 3. Main Management Section
- **Employees** (`/employees`)
  - Permissions: `employees.view`, `employees.create`, `employees.edit`, `employees.delete` ✅ (exists)
- **Projects** (`/projects`)
  - Permissions: `projects.view`, `projects.create`, `projects.edit`, `projects.delete` ✅ (exists)
- **Tasks** (`/tasks`)
  - Permissions: `tasks.view`, `tasks.create`, `tasks.edit`, `tasks.assign` ✅ (exists)
- **Bugs** (`/bugs`)
  - Permissions: `bugs.view`, `bugs.create`, `bugs.edit` ✅ (exists)
- **Leaves** (`/leaves`)
  - Permissions: `leaves.view`, `leaves.create`, `leaves.edit`, `leaves.approve`, `leaves.accept`, `leaves.reject` ⚠️ (needs verification)
- **Reimbursements** (`/reimbursements`)
  - Permissions: `reimbursements.view`, `reimbursements.create`, `reimbursements.edit`, `reimbursements.approve` ⚠️ (needs verification)
- **Reports** (`/reports`)
  - Permission: `reports.view` ❌ **MISSING** (user mentioned)

### 4. IT Asset Management Section (Admin only)
- **IT Asset Dashboard** (`/it-assets/dashboard`)
  - Permission: `it_assets.dashboard.view` ❌ **MISSING**
- **Assets** (`/it-assets/assets`)
  - Permissions: `it_assets.assets.view`, `it_assets.assets.create`, `it_assets.assets.edit`, `it_assets.assets.delete` ❌ **MISSING**
- **Assignments** (`/it-assets/assignments`)
  - Permissions: `it_assets.assignments.view`, `it_assets.assignments.create`, `it_assets.assignments.edit`, `it_assets.assignments.delete` ❌ **MISSING**
- **Tickets** (`/it-assets/tickets`)
  - Permissions: `it_assets.tickets.view`, `it_assets.tickets.create`, `it_assets.tickets.edit`, `it_assets.tickets.approve` ❌ **MISSING**
- **Maintenance** (`/it-assets/maintenance`)
  - Permissions: `it_assets.maintenance.view`, `it_assets.maintenance.create`, `it_assets.maintenance.edit`, `it_assets.maintenance.delete` ❌ **MISSING**
- **Inventory** (`/it-assets/inventory`)
  - Permissions: `it_assets.inventory.view`, `it_assets.inventory.create`, `it_assets.inventory.edit`, `it_assets.inventory.delete`, `it_assets.inventory.adjust` ❌ **MISSING**

### 5. My Devices Section
- **My Devices** (`/my-devices`)
  - Permissions: `my_devices.view`, `my_devices.create` ✅ (added in migration)

### 6. Support Section
- **Support** (`/support`)
  - Access: All users except Super Admin (role-based, no permission needed)

## Missing Permissions Summary

### Critical Missing Permissions:
1. **Reports Module**: `reports.view` ❌
2. **IT Asset Management Module**: All 22 permissions ❌
   - Dashboard: 1 permission
   - Assets: 4 permissions
   - Assignments: 4 permissions
   - Tickets: 4 permissions
   - Maintenance: 4 permissions
   - Inventory: 5 permissions

### Total Missing Permissions: 23

## Permission Insert Script

A complete SQL script has been created at:
`database/migrations/add_all_missing_permissions.sql`

This script includes:
- ✅ Reports.view permission
- ✅ All IT Asset Management permissions (22 permissions)
- ✅ Leaves complete permissions (if missing)
- ✅ Reimbursements complete permissions (if missing)
- ✅ My Devices permissions (for completeness)
- ✅ Audit and Roles permissions (for completeness)

## Next Steps

1. **Run the Migration Script**:
   ```bash
   mysql -u root -p admin_dashboard < database/migrations/add_all_missing_permissions.sql
   ```

2. **Assign Permissions to Roles**:
   - Navigate to Roles & Permissions page (Super Admin only)
   - Select each role and assign appropriate permissions:
     - **Admin Role**: All IT Asset Management permissions
     - **Admin, Team Leader, Team Lead**: Reports.view
     - **All Employee Roles**: My Devices permissions
     - **Appropriate Roles**: Leaves and Reimbursements permissions

3. **Verify Permissions**:
   - Run: `SELECT module, code, description FROM permissions ORDER BY module, code;`
   - Check that all permissions are present

## Permission Code Format

All permissions follow the format: `module.action`

Examples:
- `reports.view`
- `it_assets.assets.create`
- `my_devices.view`

## Notes

- Super Admin automatically has all permissions (hardcoded in backend)
- Permissions are checked using `hasPermission('permission.code')` in frontend
- Backend uses `requirePermission('permission.code')` middleware
- The Roles & Permissions page dynamically loads permissions from database
- The `permissionModules` array in RolesPermissions.tsx is for reference only

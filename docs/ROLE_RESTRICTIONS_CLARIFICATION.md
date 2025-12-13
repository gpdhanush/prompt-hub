# Role Restrictions Clarification

## Important Distinction

There are **TWO different pages** with **DIFFERENT role restrictions**:

### 1. **Users Page** (`/users`)
- **Purpose**: Edit existing users and change their roles
- **Super Admin can see**: **ALL roles** (Admin, Team Lead, Developer, Designer, Tester, etc.)
- **Restriction**: None - Super Admin can assign any role to any user
- **Use case**: Changing an existing user's role (e.g., change Super Admin to Admin)

### 2. **Employee Create Page** (`/employees/new`)
- **Purpose**: Create new employees
- **Super Admin can see**: **Only Team Lead, Team Leader, and Developer**
- **Restriction**: Super Admin can only CREATE new employees with these roles
- **Use case**: Creating new team members

## Why This Design?

1. **Users Page (Editing)**: Super Admin needs full flexibility to change any user's role
   - Example: Change a Super Admin user to Admin role
   - Example: Change a Developer to Team Lead
   - Example: Change any user to any role

2. **Employee Create Page (Creating)**: Super Admin is restricted to maintain hierarchy
   - Super Admin creates Team Leads (Level 1)
   - Team Leads then create their own team members (Developers, Designers, Testers)
   - Super Admin can also directly create Developers when needed

## Current Behavior

### When Super Admin Logs In:

**Users Page (`/users`):**
- ✅ Shows **ALL roles** in dropdown
- ✅ Can assign any role to any user
- ✅ Can change Super Admin to Admin
- ✅ Can change any user to any role

**Employee Create Page (`/employees/new`):**
- ✅ Shows **only Team Lead, Team Leader, Developer** in dropdown
- ✅ Can only create employees with these roles
- ❌ Cannot create Admin, Manager, Designer, Tester, etc.

## If You're Only Seeing "TL" and "Employee" in Users Page

This could mean:

1. **Database Issue**: Your database might only have those roles
   - Check: `SELECT * FROM roles;` in your database
   - You may need to add more roles

2. **Wrong Page**: You might be on Employee Create page instead of Users page
   - Users page: `/users` (shows all roles)
   - Employee Create: `/employees/new` (shows only Team Lead, Developer)

3. **API Issue**: The roles API might not be returning all roles
   - Check browser console for errors
   - Check network tab for `/api/roles` response

## How to Verify

1. **Check Database Roles:**
   ```sql
   SELECT id, name, level FROM roles ORDER BY name;
   ```

2. **Check API Response:**
   - Open browser DevTools → Network tab
   - Go to Users page
   - Look for request to `/api/roles`
   - Check response - should contain all roles

3. **Check Which Page You're On:**
   - URL should be `/users` (not `/employees/new`)
   - Users page has "Users" in the title
   - Employee Create page has "Create New Employee" in the title

## Summary

| Page | Super Admin Can See | Purpose |
|------|---------------------|---------|
| **Users** (`/users`) | **ALL roles** | Edit existing users, change roles |
| **Employee Create** (`/employees/new`) | **Team Lead, Developer only** | Create new employees |

The restriction **ONLY applies to creating new employees**, not to editing existing users.

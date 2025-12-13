# Super Admin Role Restrictions

## Overview

Super Admin users are now restricted to only create employees with specific roles: **Team Lead** (or Team Leader) and **Developer**.

**Important Note:** 
- **Team Lead** is a **Level 1** role (Manager level) ✅
- **Developer** is a **Level 2** role (Employee level) ⚠️
- The system allows Developer as an **exception** to the normal Level 1 restriction for Super Admin

## Changes Made

### 1. Frontend Restriction (`src/pages/EmployeeCreate.tsx`)

Super Admin users will only see the following roles in the role dropdown when creating a new employee:
- Team Lead
- Team Leader  
- Developer

**Code Location:** Lines 150-156

```typescript
// Super Admin can only create Team Lead and Developer roles
const availableRoles = isSuperAdmin
  ? allRoles.filter((role: any) => 
      role.name === 'Team Lead' || 
      role.name === 'Team Leader' || 
      role.name === 'Developer'
    )
  : // ... other role filters
```

### 2. Backend Role Restriction (`server/routes/employees.js`)

Backend validation ensures Super Admin cannot create employees with roles other than Team Lead, Team Leader, or Developer.

**Code Location:** Lines 585-593

```javascript
// Super Admin can only create Team Lead and Developer roles
if (isUserSuperAdmin || currentUserRole === 'Super Admin') {
  const allowedRoles = ['Team Lead', 'Team Leader', 'Developer'];
  if (!allowedRoles.includes(dbRoleName)) {
    return res.status(403).json({ 
      error: `Super Admin can only create employees with roles: Team Lead, Team Leader, or Developer` 
    });
  }
}
```

### 3. Level Validation Exception (`server/utils/positionValidation.js`)

The level validation normally prevents Super Admin from creating Level 2 users. However, **Developer** is allowed as an exception.

**Code Location:** Lines 244-254

```javascript
// Super Admin (Level 0) can only create Level 1 users
// Exception: Developer role (Level 2) is allowed for Super Admin
const allowedLevel2ForSuperAdmin = ['Developer'];
const isAllowedException = allowedLevel2ForSuperAdmin.includes(newUserRole.name);

if (newUserLevel !== 1 && !isAllowedException) {
  // Reject creation
}
```

## Role Levels Explained

### Level 0 (Super Admin)
- **Super Admin** - Can create Level 1 users (and Developer as exception)

### Level 1 (Managers/Admins)
- **Admin**
- **Team Lead** / **Team Leader**
- **Manager**
- **Accounts Manager**
- **Office Manager**
- **HR Manager**

### Level 2 (Employees)
- **Developer** ⚠️ (Exception: Super Admin can create this)
- **Designer**
- **Tester**
- **Employee**
- **Accountant**
- **Network Admin**
- **System Admin**
- **Office Staff**

## Can Super Admin Create Level 1 Users?

**YES**, but with restrictions:

✅ **Super Admin CAN create:**
- **Team Lead** (Level 1) ✅
- **Team Leader** (Level 1) ✅
- **Developer** (Level 2 - Exception) ✅

❌ **Super Admin CANNOT create:**
- **Admin** (Level 1) ❌ - Not in allowed list
- **Manager** (Level 1) ❌ - Not in allowed list
- **Accounts Manager** (Level 1) ❌ - Not in allowed list
- **Office Manager** (Level 1) ❌ - Not in allowed list
- **HR Manager** (Level 1) ❌ - Not in allowed list
- **Designer** (Level 2) ❌ - Not in allowed list
- **Tester** (Level 2) ❌ - Not in allowed list
- Any other roles ❌

## Why This Design?

The restriction limits Super Admin to only create:
1. **Team Leads** - Who can then create their own team members (Developers, Designers, Testers)
2. **Developers** - Direct employee creation when needed

This maintains hierarchy while giving Super Admin flexibility to create developers directly.

## Changing Super Admin User to Admin Role

Super Admin users can change any user's role (including other Super Admin users) to Admin through the Users management page.

### Steps to Change Super Admin to Admin:

1. **Navigate to Users Page**
   - Go to `/users` in the application
   - Login as Super Admin

2. **Find the Super Admin User**
   - Locate the Super Admin user in the users list
   - Click the three-dot menu (⋮) next to the user

3. **Edit User**
   - Click "Edit" from the dropdown menu
   - In the Edit User dialog, change the "Role" field to "Admin"
   - Save the changes

4. **Verification**
   - The user's role will be updated to Admin
   - The user will now have Admin-level permissions (not Super Admin)

### Backend Support

The backend already supports this functionality:
- Super Admin can assign Admin role to any user (`server/routes/users.js` lines 472-494)
- Only Team Leader/Manager roles are restricted from assigning Admin role
- Super Admin has full permission to change roles

## Role Creation Matrix

| Creator Role | Can Create Roles |
|--------------|------------------|
| Super Admin | **Team Lead, Team Leader, Developer only** |
| Admin | All roles (except Super Admin) |
| Team Leader | Developer, Designer, Tester only |
| Manager | Developer, Designer, Tester only |

## Validation Flow

When Super Admin creates an employee:

1. **Role Restriction Check** (First)
   - ✅ Is role in allowed list? (Team Lead, Team Leader, Developer)
   - ❌ If not → Reject with 403 error

2. **Level Validation Check** (Second)
   - ✅ Is role Level 1? → Allow
   - ✅ Is role Developer (Level 2 exception)? → Allow
   - ❌ If not → Reject with validation error

## Testing

To test the restrictions:

1. **Test Super Admin Employee Creation:**
   - Login as Super Admin
   - Go to Employees → Create New Employee
   - Verify only Team Lead, Team Leader, and Developer roles appear in dropdown

2. **Test Backend Validation:**
   - Try to create employee with Admin role via API (should fail with 403 error)
   - Try to create employee with Team Lead role (should succeed)
   - Try to create employee with Developer role (should succeed - exception)

3. **Test Level Validation:**
   - Super Admin creating Team Lead (Level 1) → ✅ Should succeed
   - Super Admin creating Developer (Level 2) → ✅ Should succeed (exception)
   - Super Admin creating Designer (Level 2) → ❌ Should fail (not in allowed list)

4. **Test Role Change:**
   - Login as Super Admin
   - Go to Users page
   - Edit a Super Admin user and change role to Admin
   - Verify the change is successful

## Notes

- **Super Admin cannot create Admin users** through the employee creation form
- **Super Admin can change existing users to Admin** through the Users edit page
- **Developer is an exception** to the Level 1 restriction for Super Admin
- This restriction applies only to **creating new employees**, not editing existing users
- The restriction is enforced both on frontend (UI) and backend (API validation)

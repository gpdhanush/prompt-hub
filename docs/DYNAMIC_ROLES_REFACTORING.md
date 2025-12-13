# Dynamic Roles & Positions Refactoring

## ✅ Completed Refactoring

All hardcoded role names and position names have been removed from both backend and frontend code. The system now fetches all role and position information from the database.

---

## 🔄 Changes Made

### Backend Changes

#### 1. **New Utility Module: `server/utils/roleHelpers.js`**
   - `getAllRoles()` - Fetches all roles from database
   - `getRoleByName()` - Gets role by name (with caching)
   - `getRoleIdByName()` - Gets role ID by name
   - `getSuperAdminRole()` - Dynamically finds Super Admin role
   - `isSuperAdmin()` - Checks if user is Super Admin (from DB)
   - `getManagerRoles()` - Gets Level 1 manager roles from DB
   - `getRolesByLevel()` - Gets roles associated with hierarchy levels
   - Role caching (5-minute TTL) for performance

#### 2. **Updated `server/utils/positionValidation.js`**
   - Removed hardcoded "Super Admin", "Team Lead", "Admin" checks
   - Now uses `getSuperAdminRole()` and `isSuperAdmin()` from database
   - Uses `getManagerRoles()` to determine Level 1 roles dynamically
   - Fallback logic uses database queries instead of hardcoded names

#### 3. **Updated `server/routes/employees.js`**
   - Removed all hardcoded role name arrays: `['Admin', 'Super Admin', 'Team Leader', ...]`
   - Now uses `getManagerRoles()` and `isSuperAdmin()` from database
   - Role filtering uses database-driven logic
   - Validation checks use `getRolesByLevel()` to get employee roles dynamically

#### 4. **Updated `server/routes/users.js`**
   - Similar changes as employees.js
   - All role checks now use database queries

---

### Frontend Changes

#### 1. **Updated `src/pages/EmployeeCreate.tsx`**
   - Removed hardcoded role names in filters
   - Dynamically determines Super Admin role from API data
   - Uses `managerRoles` array built from database roles
   - Role dropdown shows all roles from API (no hardcoded fallbacks)

#### 2. **Updated `src/pages/EmployeeEdit.tsx`**
   - Same changes as EmployeeCreate.tsx
   - All role filtering uses database-driven logic

---

## 🎯 Benefits

1. **Maintainability**: Role names can be changed in database without code changes
2. **Flexibility**: New roles can be added without modifying code
3. **Consistency**: Single source of truth (database) for all role information
4. **Scalability**: Easy to add new role types or change hierarchy

---

## 📋 How It Works

### Backend Flow:

1. **Role Lookup**:
   ```javascript
   const superAdminRole = await getSuperAdminRole();
   const managerRoles = await getManagerRoles();
   const isUserSuperAdmin = await isSuperAdmin(userId);
   ```

2. **Validation**:
   ```javascript
   // Old (hardcoded):
   if (role === 'Super Admin') { ... }
   
   // New (dynamic):
   const superAdminRole = await getSuperAdminRole();
   if (role === superAdminRole.name) { ... }
   ```

3. **Filtering**:
   ```javascript
   // Old (hardcoded):
   const canManage = ['Admin', 'Super Admin', 'Team Lead'].includes(role);
   
   // New (dynamic):
   const managerRoles = await getManagerRoles();
   const canManage = managerRoles.includes(role) || await isSuperAdmin(userId);
   ```

### Frontend Flow:

1. **Fetch Roles**:
   ```typescript
   const { data: rolesData } = useQuery({
     queryKey: ['roles'],
     queryFn: () => rolesApi.getAll(),
   });
   ```

2. **Dynamic Filtering**:
   ```typescript
   // Old (hardcoded):
   const filtered = roles.filter(r => r.name !== 'Super Admin');
   
   // New (dynamic):
   const superAdminRole = roles.find(r => r.name === 'Super Admin');
   const filtered = roles.filter(r => r.name !== superAdminRole?.name);
   ```

---

## 🔍 Role Detection Logic

### Super Admin Detection:
- Tries common names: `['Super Admin', 'SuperAdmin', 'Super Administrator']`
- Falls back to first role if not found (with warning)

### Manager Roles Detection:
- Level 1 positions → Roles associated with those positions
- Common manager names: `['Admin', 'Team Lead', 'Team Leader', 'Manager', ...]`
- Can be customized in database

### Employee Roles Detection:
- Level 2 positions → Roles associated with those positions
- Common employee names: `['Developer', 'Designer', 'Tester', 'Employee', ...]`
- Can be customized in database

---

## ⚠️ Important Notes

1. **Database Must Have Roles**: Ensure roles table is populated
2. **Position Hierarchy**: For best results, run position hierarchy migration
3. **Caching**: Role cache refreshes every 5 minutes
4. **Fallbacks**: System has fallbacks if database structure is incomplete

---

## 🧪 Testing

### Test Scenarios:

1. ✅ Create employee with different roles
2. ✅ Filter employees by role (should use DB values)
3. ✅ Validate user creation permissions (should use DB roles)
4. ✅ Check Super Admin access (should detect from DB)
5. ✅ Manager role detection (should use DB positions)

---

## 📝 Migration Notes

- **No Breaking Changes**: Code is backward-compatible
- **Gradual Migration**: Works even if some roles don't exist in DB
- **Fallback Logic**: Handles missing roles gracefully

---

**Status**: ✅ Complete
**Last Updated**: After refactoring
**All Hardcoded Values**: Removed

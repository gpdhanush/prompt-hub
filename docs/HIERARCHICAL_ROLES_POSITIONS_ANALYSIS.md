# Hierarchical Roles & Positions System - Analysis & Implementation Plan

## 📋 Executive Summary

This document provides a comprehensive analysis of implementing a hierarchical role and position system with level-based user creation rules, role-based menus, and permission management.

---

## 🎯 Key Concepts Clarification

### **Roles vs Positions - The Critical Distinction**

| Concept | Purpose | Examples | Storage |
|---------|---------|----------|---------|
| **Role** | **Functional responsibility** - What the user CAN DO | SA, TL, OA, Developer, Designer, Tester, Network Admin, Manager | `roles` table |
| **Position** | **Job title/designation** - What the user IS | Developer, Designer, Network Admin, Office Staff, Senior Developer | `positions` table (with hierarchy) |
| **Level** | **Hierarchy level** - Who can create whom | 0 (Super Admin), 1 (Managers), 2 (Employees) | `positions.level` |
| **Parent** | **Reporting structure** - Who they report to | Position hierarchy | `positions.parent_id` |

### **Why Both Are Needed**

- **Role** = **Permissions & Access** (What menus/features they see)
- **Position** = **Organizational Hierarchy** (Who reports to whom, who can create whom)

**Example:**
- A user can have **Role**: "Developer" (defines permissions)
- And **Position**: "Senior Developer" (defines hierarchy level and reporting)

---

## 🏗️ Proposed Database Schema

### 1. **Update `positions` Table** (Add Hierarchy)

```sql
ALTER TABLE `positions` 
ADD COLUMN `level` INT UNSIGNED NOT NULL DEFAULT 0,
ADD COLUMN `parent_id` INT UNSIGNED NULL,
ADD INDEX `idx_position_level` (`level`),
ADD INDEX `idx_position_parent` (`parent_id`),
ADD FOREIGN KEY (`parent_id`) REFERENCES `positions`(`id`) ON DELETE SET NULL;
```

### 2. **Update `roles` Table** (Add Level Reference)

```sql
ALTER TABLE `roles`
ADD COLUMN `default_level` INT UNSIGNED NULL COMMENT 'Default hierarchy level for this role',
ADD INDEX `idx_role_level` (`default_level`);
```

### 3. **New Table: `position_roles`** (Many-to-Many)

This allows one position to have multiple roles (e.g., "Senior Developer" position can have "Developer" or "Tech Lead" roles).

```sql
CREATE TABLE IF NOT EXISTS `position_roles` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `position_id` INT UNSIGNED NOT NULL,
  `role_id` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_position_role` (`position_id`, `role_id`),
  FOREIGN KEY (`position_id`) REFERENCES `positions`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  INDEX `idx_position_role` (`position_id`, `role_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 📊 Hierarchical Structure Example

### **Position Hierarchy** (Your Example)

```
Super Admin (Level 0, parent: NULL)
└── Level 1 Positions
    ├── Admin (Level 1, parent: Super Admin)
    ├── Team Lead (Level 1, parent: Super Admin)
    ├── Accounts Manager (Level 1, parent: Super Admin)
    ├── Office Manager (Level 1, parent: Super Admin)
    └── HR Manager (Level 1, parent: Super Admin)
        └── Level 2 Positions
            ├── Developer (Level 2, parent: Team Lead)
            ├── Designer (Level 2, parent: Team Lead)
            ├── Tester (Level 2, parent: Team Lead)
            ├── Network Admin (Level 2, parent: Office Manager)
            ├── System Admin (Level 2, parent: Office Manager)
            ├── Accountant (Level 2, parent: Accounts Manager)
            └── Office Staff (Level 2, parent: Office Manager)
```

### **Sample Data**

```sql
-- Positions with hierarchy
INSERT INTO positions (id, name, level, parent_id) VALUES
(1, 'Super Admin', 0, NULL),
(2, 'Admin', 1, 1),
(3, 'Team Lead', 1, 1),
(4, 'Accounts Manager', 1, 1),
(5, 'Office Manager', 1, 1),
(6, 'HR Manager', 1, 1),
(7, 'Developer', 2, 3),
(8, 'Designer', 2, 3),
(9, 'Tester', 2, 3),
(10, 'Network Admin', 2, 5),
(11, 'System Admin', 2, 5),
(12, 'Accountant', 2, 4),
(13, 'Office Staff', 2, 5);
```

---

## 🔐 User Creation Rules (Backend Validation)

### **Rule Set**

| Creator Level | Can Create | Cannot Create |
|---------------|------------|---------------|
| **Level 0** (Super Admin) | Level 1 positions only | Level 0, Level 2 |
| **Level 1** (Managers) | Level 2 positions (their employees) | Level 0, Level 1 |
| **Level 2** (Employees) | ❌ No one | Anyone |

### **Backend Validation Logic**

```javascript
// In server/routes/employees.js or server/routes/users.js

async function validateUserCreation(creatorUserId, newUserPositionId) {
  // Get creator's position level
  const [creator] = await db.query(`
    SELECT p.level, p.name as position_name
    FROM users u
    INNER JOIN positions p ON u.position_id = p.id
    WHERE u.id = ?
  `, [creatorUserId]);
  
  if (creator.length === 0) {
    throw new Error('Creator user not found');
  }
  
  const creatorLevel = creator[0].level;
  
  // Get new user's position level
  const [newPosition] = await db.query(`
    SELECT level, name, parent_id
    FROM positions
    WHERE id = ?
  `, [newUserPositionId]);
  
  if (newPosition.length === 0) {
    throw new Error('Position not found');
  }
  
  const newUserLevel = newPosition[0].level;
  
  // Validation Rules
  if (creatorLevel === 0) {
    // Super Admin can only create Level 1 users
    if (newUserLevel !== 1) {
      throw new Error('Super Admin can only create Level 1 users (Managers/Admins)');
    }
  } else if (creatorLevel === 1) {
    // Level 1 users can only create Level 2 users (their employees)
    if (newUserLevel !== 2) {
      throw new Error('You can only create your employees (Level 2 users)');
    }
    
    // Additional check: Ensure new user's position parent matches creator's position
    const newUserParentId = newPosition[0].parent_id;
    const [creatorPosition] = await db.query(`
      SELECT id FROM positions WHERE id = (SELECT position_id FROM users WHERE id = ?)
    `, [creatorUserId]);
    
    if (creatorPosition.length > 0 && newUserParentId !== creatorPosition[0].id) {
      throw new Error(`You can only create employees under your position. This position reports to a different manager.`);
    }
  } else if (creatorLevel === 2) {
    // Level 2 users cannot create anyone
    throw new Error('Employees cannot create users');
  }
  
  return true;
}
```

---

## 🎨 Role-Based Menu System

### **Current System**
- Permissions are stored in `permissions` table
- Role-Permission mapping in `role_permissions` table
- Frontend uses `usePermissions` hook

### **Enhanced Menu System**

1. **Menu Items Table** (if not exists)

```sql
CREATE TABLE IF NOT EXISTS `menu_items` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(100) NOT NULL,
  `path` VARCHAR(255) NOT NULL,
  `icon` VARCHAR(100),
  `parent_id` INT UNSIGNED NULL,
  `order` INT UNSIGNED DEFAULT 0,
  `permission_code` VARCHAR(100) NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  FOREIGN KEY (`parent_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE,
  INDEX `idx_menu_permission` (`permission_code`),
  INDEX `idx_menu_order` (`order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

2. **Role-Specific Menus**

```sql
CREATE TABLE IF NOT EXISTS `role_menus` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `role_id` INT UNSIGNED NOT NULL,
  `menu_item_id` INT UNSIGNED NOT NULL,
  `visible` BOOLEAN DEFAULT TRUE,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_role_menu` (`role_id`, `menu_item_id`),
  FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

### **Frontend Menu Filtering**

```typescript
// In AdminSidebar.tsx or similar
const { hasPermission } = usePermissions();
const currentUser = getCurrentUser();
const userRole = currentUser?.role;

// Filter menu items based on role and permissions
const visibleMenus = menuItems.filter(menu => {
  // Super Admin sees all
  if (userRole === 'Super Admin') return true;
  
  // Check if menu requires permission
  if (menu.permission_code) {
    return hasPermission(menu.permission_code);
  }
  
  // Check role-specific menu visibility
  return roleMenus[userRole]?.includes(menu.id) || false;
});
```

---

## 🔄 Implementation Steps

### **Phase 1: Database Migration**

1. ✅ Add `level` and `parent_id` to `positions` table
2. ✅ Add `default_level` to `roles` table (optional, for reference)
3. ✅ Create `position_roles` table (if needed for many-to-many)
4. ✅ Create `menu_items` and `role_menus` tables
5. ✅ Migrate existing positions to have levels
6. ✅ Seed initial hierarchical positions

### **Phase 2: Backend Updates**

1. ✅ Update `server/routes/employees.js`:
   - Add `validateUserCreation()` function
   - Enforce level-based creation rules
   - Filter available positions based on creator's level

2. ✅ Update `server/routes/users.js`:
   - Same validation logic
   - Position-based filtering

3. ✅ Create `server/routes/positions.js` (if not exists):
   - GET `/positions` - Filter by level/parent
   - GET `/positions/:id/children` - Get child positions
   - GET `/positions/hierarchy` - Get full hierarchy tree

4. ✅ Update `server/routes/menus.js` (new):
   - GET `/menus` - Get menu items for current user's role
   - GET `/menus/all` - Get all menus (Super Admin only)

### **Phase 3: Frontend Updates**

1. ✅ Update `EmployeeCreate.tsx`:
   - Filter positions based on current user's level
   - Show only positions user can create
   - Display position hierarchy

2. ✅ Update `EmployeeEdit.tsx`:
   - Same position filtering
   - Prevent changing to invalid positions

3. ✅ Update `AdminSidebar.tsx`:
   - Fetch role-based menus from API
   - Filter menu items based on permissions

4. ✅ Create `PositionsManagement.tsx` (new):
   - Super Admin can manage positions hierarchy
   - Create/edit positions with level and parent
   - Visual hierarchy tree

### **Phase 4: Super Admin Controls**

1. ✅ **Roles Management** (`RolesPermissions.tsx`):
   - Create/edit roles
   - Assign permissions to roles
   - Set default level for roles

2. ✅ **Positions Management** (`PositionsManagement.tsx`):
   - Create/edit positions
   - Set level and parent
   - Map roles to positions

3. ✅ **Menu Management** (`MenuManagement.tsx` - new):
   - Create/edit menu items
   - Assign menus to roles
   - Set menu permissions

---

## 📝 Example: Your Office Structure

### **Roles** (Functional Responsibilities)
- SA (Super Admin)
- TL (Team Lead)
- OA (Office Admin)
- Developer
- Designer
- Tester
- Network Admin
- System Admin
- Manager
- Accountant
- Office Staff

### **Positions** (Hierarchical Structure)

```
Level 0:
  - Super Admin

Level 1 (parent: Super Admin):
  - Admin
  - Team Lead
  - Accounts Manager
  - Office Manager
  - HR Manager

Level 2 (parent: varies):
  - Developer (parent: Team Lead)
  - Designer (parent: Team Lead)
  - Tester (parent: Team Lead)
  - Network Admin (parent: Office Manager)
  - System Admin (parent: Office Manager)
  - Accountant (parent: Accounts Manager)
  - Office Staff (parent: Office Manager)
```

### **User Creation Scenarios**

1. **Super Admin creates Team Lead:**
   - ✅ Valid: Team Lead is Level 1
   - Position: "Team Lead"
   - Role: "TL" (or "Team Lead")

2. **Team Lead creates Developer:**
   - ✅ Valid: Developer is Level 2, parent is Team Lead
   - Position: "Developer"
   - Role: "Developer"

3. **Office Manager creates Network Admin:**
   - ✅ Valid: Network Admin is Level 2, parent is Office Manager
   - Position: "Network Admin"
   - Role: "Network Admin"

4. **Team Lead tries to create Office Manager:**
   - ❌ Invalid: Office Manager is Level 1 (same as Team Lead)
   - Error: "You can only create your employees (Level 2 users)"

5. **Developer tries to create anyone:**
   - ❌ Invalid: Developer is Level 2
   - Error: "Employees cannot create users"

---

## 🎯 Key Implementation Points

### **1. Position-Based Hierarchy**
- Use `positions.level` to determine who can create whom
- Use `positions.parent_id` to enforce reporting structure
- Level 1 users can only create positions where `parent_id` matches their position

### **2. Role-Based Permissions**
- Roles define what users can DO (permissions)
- Roles are mapped to positions via `role_positions` or `position_roles`
- Super Admin controls role-permission mappings

### **3. Menu Visibility**
- Menus are filtered by:
  - Role-based permissions (`permissions` table)
  - Role-specific menu assignments (`role_menus` table)
  - Super Admin sees all menus

### **4. Data Flow**

```
User Creation Flow:
1. Creator selects Position (filtered by their level)
2. Creator selects Role (filtered by position-role mapping)
3. Backend validates:
   - Creator's level can create selected position's level
   - Position's parent matches creator's position (for Level 1 → Level 2)
4. User created with position_id and role_id
5. Permissions assigned based on role
6. Menus filtered based on role permissions
```

---

## 🚀 Next Steps

1. **Review this analysis** - Confirm understanding
2. **Database migration** - Add hierarchy columns
3. **Backend validation** - Implement level-based rules
4. **Frontend filtering** - Update create/edit forms
5. **Menu system** - Implement role-based menus
6. **Super Admin UI** - Build management interfaces

---

## ❓ Questions to Clarify

1. **Position-Role Relationship:**
   - Can one position have multiple roles? (e.g., "Senior Developer" can be "Developer" or "Tech Lead"?)
   - Or is it one-to-one? (one position = one role)

2. **Level Flexibility:**
   - Can positions have different levels in different contexts?
   - Or is level fixed per position?

3. **Menu System:**
   - Do you want a visual menu builder for Super Admin?
   - Or just code-based menu configuration?

4. **Existing Data:**
   - How should we migrate existing users/positions to the new hierarchy?
   - What default level should existing positions get?

---

## 📚 Related Files to Update

- `database/complete_schema.sql` - Add hierarchy columns
- `server/routes/employees.js` - Add validation
- `server/routes/users.js` - Add validation
- `server/routes/positions.js` - Add hierarchy endpoints
- `src/pages/EmployeeCreate.tsx` - Filter positions
- `src/pages/EmployeeEdit.tsx` - Filter positions
- `src/components/layout/AdminSidebar.tsx` - Role-based menus
- `src/pages/RolesPermissions.tsx` - Add level management
- Create `src/pages/PositionsManagement.tsx` - New page
- Create `src/pages/MenuManagement.tsx` - New page (optional)

---

**End of Analysis Document**

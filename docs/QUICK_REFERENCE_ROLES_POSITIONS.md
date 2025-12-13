# Quick Reference: Roles vs Positions

## 🎯 Simple Explanation

### **Role = What You CAN DO**
- Defines **permissions** and **access rights**
- Examples: SA, TL, OA, Developer, Designer, Tester, Network Admin
- Stored in: `roles` table
- Controls: Menu visibility, feature access, permissions

### **Position = What You ARE (Job Title)**
- Defines **hierarchy level** and **reporting structure**
- Examples: Developer, Designer, Network Admin, Office Staff, Senior Developer
- Stored in: `positions` table (with `level` and `parent_id`)
- Controls: Who can create you, who you report to

---

## 📊 Example: Real-World Scenario

### **Scenario: Team Lead creates a Developer**

**Step 1: Select Position**
- Position: "Developer" (Level 2, parent: "Team Lead")
- This determines: Hierarchy level, who they report to

**Step 2: Select Role**
- Role: "Developer"
- This determines: Permissions, menu access, what they can do

**Result:**
- User has **Position**: "Developer" (organizational structure)
- User has **Role**: "Developer" (functional permissions)
- User reports to: Team Lead (based on position parent)
- User can: View tasks, create tasks, etc. (based on role permissions)

---

## 🔐 User Creation Rules (Simple)

| Who Creates | Can Create | Example |
|-------------|------------|---------|
| **Super Admin** (Level 0) | **Level 1 only** | Admin, Team Lead, Office Manager |
| **Level 1 Users** (Managers) | **Level 2 only** (their employees) | Developer, Designer, Network Admin |
| **Level 2 Users** (Employees) | **❌ No one** | Cannot create users |

---

## 🏗️ Your Office Structure

### **Level 0**
- Super Admin

### **Level 1** (Created by Super Admin)
- Admin
- Team Lead
- Accounts Manager
- Office Manager
- HR Manager

### **Level 2** (Created by Level 1)
- **Team Lead creates:**
  - Developer
  - Designer
  - Tester

- **Office Manager creates:**
  - Network Admin
  - System Admin
  - Office Staff

- **Accounts Manager creates:**
  - Accountant

---

## 💡 Key Points

1. **One user = One Position + One Role**
   - Position: Where they are in hierarchy
   - Role: What they can do

2. **Level determines creation rights**
   - Level 0 → creates Level 1
   - Level 1 → creates Level 2
   - Level 2 → creates no one

3. **Parent determines reporting**
   - Level 2 positions have `parent_id` pointing to Level 1 position
   - Ensures proper reporting structure

4. **Role determines permissions**
   - Different roles = different menus
   - Super Admin controls role-permission mappings

---

## 🔄 Data Flow

```
User Creation:
1. Creator selects Position (filtered by creator's level)
2. Creator selects Role (filtered by position-role mapping)
3. Backend validates level rules
4. User created with position_id + role_id
5. Permissions assigned from role
6. Menus filtered by role permissions
```

---

## 📝 Common Questions

**Q: Can one position have multiple roles?**
A: Yes, via `position_roles` junction table. Example: "Senior Developer" position can have "Developer" or "Tech Lead" roles.

**Q: Can one role be used by multiple positions?**
A: Yes. Example: "Developer" role can be used by "Developer", "Senior Developer", "Junior Developer" positions.

**Q: What if I want to change a user's level?**
A: Change their position. Position determines level, not role.

**Q: How do I add a new role?**
A: Super Admin creates role in Roles Management, assigns permissions, maps to positions.

**Q: How do I add a new position?**
A: Super Admin creates position in Positions Management, sets level and parent.

---

## 🎨 Menu System

- **Menus are role-based**
- Each menu item can require a permission
- Super Admin sees all menus
- Other users see menus based on their role's permissions

---

**This is a quick reference. See `HIERARCHICAL_ROLES_POSITIONS_ANALYSIS.md` for full details.**

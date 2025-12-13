# Permissions Screen - Quick User Guide

## 🎯 Quick Start

1. **Navigate** to "Roles & Permissions" from sidebar (Super Admin only)
2. **Click** on a role card to expand it
3. **Click** "Edit Permissions" button
4. **Select** permissions using checkboxes
5. **Click** "Save" to apply changes

---

## 📋 Screen Layout

```
┌─────────────────────────────────────────┐
│  Roles & Permissions                    │
├─────────────────────────────────────────┤
│  [Role Card 1]                          │
│  [Role Card 2] ← Click to expand       │
│  [Role Card 3]                          │
└─────────────────────────────────────────┘

When expanded:
┌─────────────────────────────────────────┐
│  Role Name                              │
│  ┌───────────────────────────────────┐ │
│  │ Permissions        [Edit Button]   │ │
│  ├───────────────────────────────────┤ │
│  │ ☑ Check All Permissions (X total) │ │ ← Select all at once
│  ├───────────────────────────────────┤ │
│  │ Module: Employees                 │ │
│  │ ☑ Check All (3)                   │ │ ← Select all in module
│  │ ☑ create  ☑ edit  ☑ view         │ │
│  ├───────────────────────────────────┤ │
│  │ Module: IT Asset Management       │ │
│  │ ☐ Check All (22)                  │ │
│  │ ☐ create  ☐ edit  ☐ view         │ │
│  │ ☐ delete  ☐ adjust ☐ approve     │ │
│  └───────────────────────────────────┘ │
│  [Cancel]  [Save]                        │
└─────────────────────────────────────────┘
```

---

## 🖱️ How to Use

### Step 1: Select a Role
- Click anywhere on a role card to expand/collapse it
- Selected role is highlighted in blue

### Step 2: Enter Edit Mode
- Click **"Edit Permissions"** button (top right of permissions section)
- Only appears for non-Super Admin roles
- Checkboxes become visible

### Step 3: Select Permissions

#### Method 1: Individual Selection
- Click checkbox next to each permission
- Selected = ✅ Blue background
- Unselected = ☐ Gray background

#### Method 2: Module-Level Selection
- Click **"Check All"** next to module name
- Selects/deselects all permissions in that module
- Example: Click "Check All" for "IT Asset Management" to grant all IT Asset permissions

#### Method 3: Global Selection
- Click **"Check All Permissions"** at the top
- Selects/deselects ALL permissions for the role
- Useful for granting full system access

### Step 4: Save Changes
- Click **"Save"** button (bottom right)
- Wait for success message
- Changes are applied immediately

### Step 5: Cancel (Optional)
- Click **"Cancel"** to discard changes
- Reverts to original state

---

## 📊 Permission Display

### View Mode (Not Editing)
- ✅ **Checkmark icon** = Permission granted
- ❌ **X icon** = Permission denied

### Edit Mode (Editing)
- ☑ **Checked checkbox** = Will grant permission
- ☐ **Unchecked checkbox** = Will deny permission
- **Blue background** = Currently selected
- **Gray background** = Currently unselected

---

## 🎨 Visual Indicators

| Element | Meaning |
|---------|---------|
| 🔵 Blue highlight | Selected/active role |
| ✅ Checkmark | Permission granted |
| ❌ X mark | Permission denied |
| ☑ Checkbox (checked) | Will grant permission |
| ☐ Checkbox (unchecked) | Will deny permission |
| 🔄 Loading spinner | Saving in progress |

---

## 💡 Common Use Cases

### Grant Full Access to IT Asset Management
1. Click role → "Edit Permissions"
2. Find "IT Asset Management" module
3. Click "Check All" next to module name
4. Click "Save"

### Grant Only View Access
1. Click role → "Edit Permissions"
2. Find module
3. Check only "view" permission
4. Uncheck all others
5. Click "Save"

### Grant Multiple Modules
1. Click role → "Edit Permissions"
2. Use "Check All" for each desired module
3. Click "Save"

### Revoke All Permissions
1. Click role → "Edit Permissions"
2. Uncheck "Check All Permissions" at top
3. Click "Save"

---

## ⚠️ Important Notes

- **Super Admin** role cannot be edited (has all permissions by default)
- Changes take effect immediately after saving
- Users may need to refresh or re-login to see permission changes
- Permission names are displayed in lowercase (e.g., "view", "create", "edit")

---

## 🔍 Finding Permissions

Permissions are organized by **Module**:
- **Employees**: view, create, edit, delete
- **IT Asset Management**: view, create, edit, delete, adjust, approve (for various sub-modules)
- **Reports**: view
- **My Devices**: view, create
- And more...

Each module groups related permissions together for easy management.

---

## ❓ Troubleshooting

**Q: Can't see "Edit Permissions" button?**  
A: Make sure you're logged in as Super Admin and the role is not "Super Admin"

**Q: Changes not saving?**  
A: Check internet connection, make sure you clicked "Save" (not "Cancel")

**Q: Can't find a permission?**  
A: Use browser search (Ctrl+F / Cmd+F) or scroll through modules

**Q: Permission not working?**  
A: User may need to log out and log back in, or clear browser cache

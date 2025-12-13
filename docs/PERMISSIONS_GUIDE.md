# How to Add Access Permissions for Future Screens

This guide explains how to implement permission-based access control for new screens/pages in the application.

## Table of Contents
1. [Overview](#overview)
2. [Step 1: Add Permission to Database](#step-1-add-permission-to-database)
3. [Step 2: Protect Frontend Route](#step-2-protect-frontend-route)
4. [Step 3: Use Permissions in Components](#step-3-use-permissions-in-components)
5. [Step 4: Protect Backend Routes](#step-4-protect-backend-routes)
6. [Step 5: Assign Permissions to Roles](#step-5-assign-permissions-to-roles)
7. [Examples](#examples)

---

## Overview

The permission system uses:
- **Frontend**: `usePermissions` hook and `ProtectedRoute` component
- **Backend**: `requirePermission` middleware
- **Database**: `permissions` and `role_permissions` tables

**Permission Code Format**: `module.action` (e.g., `projects.create`, `users.edit`)

---

## Step 1: Add Permission to Database

### Option A: Using the Permissions Management Page (Recommended)

1. Navigate to `/permissions` (Super Admin only)
2. Click "New Permission"
3. Fill in:
   - **Code**: `module.action` (e.g., `invoices.view`, `invoices.create`)
   - **Module**: Select from dropdown (or add new module name)
   - **Description**: Brief description of what this permission allows
4. Click "Create Permission"

### Option B: Direct SQL Insert

```sql
INSERT INTO permissions (code, description, module) 
VALUES ('invoices.view', 'View invoices', 'Invoices');

INSERT INTO permissions (code, description, module) 
VALUES ('invoices.create', 'Create invoices', 'Invoices');

INSERT INTO permissions (code, description, module) 
VALUES ('invoices.edit', 'Edit invoices', 'Invoices');

INSERT INTO permissions (code, description, module) 
VALUES ('invoices.delete', 'Delete invoices', 'Invoices');
```

---

## Step 2: Protect Frontend Route

In `src/App.tsx`, wrap your route with `ProtectedRoute`:

### Method 1: Using Permission Code (Recommended)

```tsx
import YourNewPage from "./pages/YourNewPage";

// In your routes:
<Route 
  path="/your-new-page" 
  element={
    <ProtectedRoute requiredPermission="invoices.view">
      <YourNewPage />
    </ProtectedRoute>
  } 
/>
```

### Method 2: Using Role-Based (Less Flexible)

```tsx
<Route 
  path="/your-new-page" 
  element={
    <ProtectedRoute allowedRoles={['Admin', 'Super Admin', 'Manager']}>
      <YourNewPage />
    </ProtectedRoute>
  } 
/>
```

### Method 3: Multiple Permissions (OR logic)

If you need to check multiple permissions (user needs ANY of them):

```tsx
// You'll need to modify ProtectedRoute or create a custom check
// For now, use role-based or check inside component
```

---

## Step 3: Use Permissions in Components

### Basic Usage

```tsx
import { usePermissions } from "@/hooks/usePermissions";

export default function YourNewPage() {
  const { hasPermission, isLoading } = usePermissions();
  
  // Check if user has permission
  const canView = hasPermission('invoices.view');
  const canCreate = hasPermission('invoices.create');
  const canEdit = hasPermission('invoices.edit');
  const canDelete = hasPermission('invoices.delete');
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  return (
    <div>
      {canView && (
        <div>
          {/* Content visible only to users with invoices.view */}
        </div>
      )}
      
      {canCreate && (
        <Button onClick={handleCreate}>
          Create Invoice
        </Button>
      )}
      
      {canEdit && (
        <Button onClick={handleEdit}>
          Edit
        </Button>
      )}
      
      {canDelete && (
        <Button onClick={handleDelete} variant="destructive">
          Delete
        </Button>
      )}
    </div>
  );
}
```

### Conditional Rendering Example

```tsx
export default function InvoicesPage() {
  const { hasPermission } = usePermissions();
  
  const canCreate = hasPermission('invoices.create');
  const canEdit = hasPermission('invoices.edit');
  const canDelete = hasPermission('invoices.delete');
  
  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1>Invoices</h1>
        {canCreate && (
          <Button onClick={handleCreate}>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        )}
      </div>
      
      <Table>
        {/* Table content */}
        <TableRow>
          <TableCell>Invoice #123</TableCell>
          <TableCell>
            {canEdit && (
              <Button variant="ghost" size="sm" onClick={() => handleEdit(123)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            {canDelete && (
              <Button variant="ghost" size="sm" onClick={() => handleDelete(123)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            )}
          </TableCell>
        </TableRow>
      </Table>
    </div>
  );
}
```

### Access Denied Screen

```tsx
import { Shield } from "lucide-react";
import { usePermissions } from "@/hooks/usePermissions";

export default function YourNewPage() {
  const { hasPermission, isLoading } = usePermissions();
  
  if (isLoading) {
    return <div>Loading...</div>;
  }
  
  if (!hasPermission('invoices.view')) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Shield className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    // Your page content
  );
}
```

### Conditional API Calls

```tsx
import { useQuery } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { invoicesApi } from "@/lib/api";

export default function InvoicesPage() {
  const { hasPermission } = usePermissions();
  const canView = hasPermission('invoices.view');
  
  // Only fetch data if user has permission
  const { data, isLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoicesApi.getAll(),
    enabled: canView, // Only run query if user has permission
  });
  
  if (!canView) {
    return <AccessDenied />;
  }
  
  // Rest of component
}
```

---

## Step 4: Protect Backend Routes

In your route file (e.g., `server/routes/invoices.js`):

### Method 1: Using requirePermission Middleware (Recommended)

```javascript
import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { db } from '../config/database.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /invoices - requires invoices.view permission
router.get('/', requirePermission('invoices.view'), async (req, res) => {
  try {
    const [invoices] = await db.query('SELECT * FROM invoices');
    res.json({ data: invoices });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /invoices - requires invoices.create permission
router.post('/', requirePermission('invoices.create'), async (req, res) => {
  try {
    const { amount, description } = req.body;
    // Create invoice logic
    res.status(201).json({ data: newInvoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /invoices/:id - requires invoices.edit permission
router.put('/:id', requirePermission('invoices.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    // Update invoice logic
    res.json({ data: updatedInvoice });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /invoices/:id - requires invoices.delete permission
router.delete('/:id', requirePermission('invoices.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    // Delete invoice logic
    res.json({ message: 'Invoice deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

### Method 2: Multiple Permissions (OR logic)

```javascript
// User needs ANY of these permissions
router.get('/', 
  requirePermission('invoices.view', 'invoices.view.all'), 
  async (req, res) => {
    // Route handler
  }
);
```

### Method 3: Role-Based (Less Flexible)

```javascript
import { authorize } from '../middleware/auth.js';

// Only specific roles can access
router.get('/', authorize('Admin', 'Super Admin', 'Manager'), async (req, res) => {
  // Route handler
});
```

---

## Step 5: Assign Permissions to Roles

1. Navigate to `/roles-permissions` (Super Admin only)
2. Click on a role to expand it
3. Click "Edit Permissions"
4. Check/uncheck the permissions you want to assign
5. Click "Save"

**Note**: Super Admin automatically has all permissions and cannot be modified.

---

## Examples

### Example 1: Simple View-Only Page

**Database:**
```sql
INSERT INTO permissions (code, description, module) 
VALUES ('reports.view', 'View reports', 'Reports');
```

**Frontend Route (`src/App.tsx`):**
```tsx
<Route 
  path="/reports" 
  element={
    <ProtectedRoute requiredPermission="reports.view">
      <Reports />
    </ProtectedRoute>
  } 
/>
```

**Component (`src/pages/Reports.tsx`):**
```tsx
import { usePermissions } from "@/hooks/usePermissions";

export default function Reports() {
  const { hasPermission } = usePermissions();
  
  if (!hasPermission('reports.view')) {
    return <AccessDenied />;
  }
  
  return <div>Reports Content</div>;
}
```

**Backend Route (`server/routes/reports.js`):**
```javascript
router.get('/', requirePermission('reports.view'), async (req, res) => {
  // Return reports
});
```

---

### Example 2: Full CRUD Page

**Database:**
```sql
INSERT INTO permissions (code, description, module) VALUES
('products.view', 'View products', 'Products'),
('products.create', 'Create products', 'Products'),
('products.edit', 'Edit products', 'Products'),
('products.delete', 'Delete products', 'Products');
```

**Frontend Route:**
```tsx
<Route 
  path="/products" 
  element={
    <ProtectedRoute requiredPermission="products.view">
      <Products />
    </ProtectedRoute>
  } 
/>
```

**Component:**
```tsx
export default function Products() {
  const { hasPermission } = usePermissions();
  
  const canView = hasPermission('products.view');
  const canCreate = hasPermission('products.create');
  const canEdit = hasPermission('products.edit');
  const canDelete = hasPermission('products.delete');
  
  return (
    <div>
      {canCreate && <Button onClick={handleCreate}>New Product</Button>}
      
      <Table>
        {products.map(product => (
          <TableRow key={product.id}>
            <TableCell>{product.name}</TableCell>
            <TableCell>
              {canEdit && <EditButton />}
              {canDelete && <DeleteButton />}
            </TableCell>
          </TableRow>
        ))}
      </Table>
    </div>
  );
}
```

**Backend Routes:**
```javascript
router.get('/', requirePermission('products.view'), async (req, res) => {
  // List products
});

router.post('/', requirePermission('products.create'), async (req, res) => {
  // Create product
});

router.put('/:id', requirePermission('products.edit'), async (req, res) => {
  // Update product
});

router.delete('/:id', requirePermission('products.delete'), async (req, res) => {
  // Delete product
});
```

---

### Example 3: Sidebar Menu Item

In `src/components/layout/AdminSidebar.tsx`:

```tsx
import { usePermissions } from "@/hooks/usePermissions";

export function AdminSidebar() {
  const { hasPermission } = usePermissions();
  const isSuperAdmin = userRole === 'Super Admin';
  
  // Check permission
  const canAccessInvoices = isSuperAdmin || hasPermission('invoices.view');
  
  return (
    <nav>
      {/* Other menu items */}
      
      {canAccessInvoices && (
        <MenuItem
          href="/invoices"
          icon={FileText}
          label="Invoices"
        />
      )}
    </nav>
  );
}
```

---

## Best Practices

1. **Always use permission codes, not roles** - More flexible and maintainable
2. **Use consistent naming**: `module.action` format
3. **Protect both frontend and backend** - Never trust frontend-only checks
4. **Use `enabled` in useQuery** - Don't make API calls if user lacks permission
5. **Provide clear error messages** - Users should know why access is denied
6. **Test with different roles** - Ensure permissions work correctly
7. **Document permissions** - Keep a list of all permissions and their purposes

---

## Permission Naming Convention

- **Format**: `module.action`
- **Actions**: `view`, `create`, `edit`, `delete`, `approve`, `export`, etc.
- **Examples**:
  - `users.view`
  - `users.create`
  - `users.edit`
  - `users.delete`
  - `projects.view`
  - `projects.create`
  - `tasks.assign`
  - `leaves.approve`

---

## Quick Checklist

When adding a new screen/page:

- [ ] Add permissions to database (via UI or SQL)
- [ ] Protect frontend route with `ProtectedRoute`
- [ ] Use `usePermissions` hook in component
- [ ] Protect backend routes with `requirePermission`
- [ ] Add menu item with permission check (if needed)
- [ ] Assign permissions to appropriate roles
- [ ] Test with different user roles
- [ ] Document the new permissions

---

## Troubleshooting

### Permission not working?

1. **Check if permission exists in database:**
   ```sql
   SELECT * FROM permissions WHERE code = 'your.permission.code';
   ```

2. **Check if role has permission:**
   ```sql
   SELECT rp.*, p.code, r.name as role_name
   FROM role_permissions rp
   JOIN permissions p ON rp.permission_id = p.id
   JOIN roles r ON rp.role_id = r.id
   WHERE p.code = 'your.permission.code';
   ```

3. **Check user's role:**
   ```sql
   SELECT u.id, u.name, r.name as role_name
   FROM users u
   JOIN roles r ON u.role_id = r.id
   WHERE u.id = ?;
   ```

4. **Clear frontend cache** - Permissions are cached for 5 minutes

5. **Check browser console** - Look for permission-related errors

---

## Additional Resources

- Permission Management: `/permissions`
- Role Permissions: `/roles-permissions`
- Roles & Positions: `/roles-positions`

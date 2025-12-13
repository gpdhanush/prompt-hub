# Permission Implementation Template

Quick copy-paste template for adding permissions to a new page.

## 1. Database - Add Permissions

```sql
-- Replace 'yourmodule' with your actual module name
INSERT INTO permissions (code, description, module) VALUES
('yourmodule.view', 'View yourmodule items', 'YourModule'),
('yourmodule.create', 'Create yourmodule items', 'YourModule'),
('yourmodule.edit', 'Edit yourmodule items', 'YourModule'),
('yourmodule.delete', 'Delete yourmodule items', 'YourModule');
```

## 2. Frontend Route - src/App.tsx

```tsx
import YourNewPage from "./pages/YourNewPage";

// Add to routes:
<Route 
  path="/your-new-page" 
  element={
    <ProtectedRoute requiredPermission="yourmodule.view">
      <YourNewPage />
    </ProtectedRoute>
  } 
/>
```

## 3. Component Template - src/pages/YourNewPage.tsx

```tsx
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePermissions } from "@/hooks/usePermissions";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { yourModuleApi } from "@/lib/api";

export default function YourNewPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isLoading: permissionsLoading } = usePermissions();
  
  // Check permissions
  const canView = hasPermission('yourmodule.view');
  const canCreate = hasPermission('yourmodule.create');
  const canEdit = hasPermission('yourmodule.edit');
  const canDelete = hasPermission('yourmodule.delete');
  
  // Access denied check
  if (!canView) {
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
  
  // Fetch data (only if user has permission)
  const { data, isLoading } = useQuery({
    queryKey: ['yourmodule'],
    queryFn: () => yourModuleApi.getAll(),
    enabled: canView, // Only fetch if user has permission
  });
  
  // Create mutation
  const createMutation = useMutation({
    mutationFn: yourModuleApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['yourmodule'] });
    },
  });
  
  const handleCreate = () => {
    if (!canCreate) {
      toast({
        title: "Access Denied",
        description: "You don't have permission to create items.",
        variant: "destructive",
      });
      return;
    }
    // Your create logic
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Your Module</h1>
        {canCreate && (
          <Button onClick={handleCreate}>
            Create New
          </Button>
        )}
      </div>
      
      {/* Your content */}
    </div>
  );
}
```

## 4. Backend Route - server/routes/yourmodule.js

```javascript
import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { db } from '../config/database.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// GET /yourmodule - requires yourmodule.view permission
router.get('/', requirePermission('yourmodule.view'), async (req, res) => {
  try {
    const [items] = await db.query('SELECT * FROM your_table');
    res.json({ data: items });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /yourmodule - requires yourmodule.create permission
router.post('/', requirePermission('yourmodule.create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    // Your create logic
    res.status(201).json({ data: newItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PUT /yourmodule/:id - requires yourmodule.edit permission
router.put('/:id', requirePermission('yourmodule.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    // Your update logic
    res.json({ data: updatedItem });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE /yourmodule/:id - requires yourmodule.delete permission
router.delete('/:id', requirePermission('yourmodule.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    // Your delete logic
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## 5. Register Backend Route - server/index.js

```javascript
import yourModuleRoutes from './routes/yourmodule.js';

// Add to routes section:
app.use('/api/yourmodule', yourModuleRoutes);
```

## 6. Add to Sidebar - src/components/layout/AdminSidebar.tsx

```tsx
// In the component:
const canAccessYourModule = isSuperAdmin || hasPermission('yourmodule.view');

// In the menu items:
{canAccessYourModule && (
  <MenuItem
    href="/your-new-page"
    icon={YourIcon}
    label="Your Module"
  />
)}
```

## 7. Add API Methods - src/lib/api.ts

```typescript
// YourModule API
export const yourModuleApi = {
  getAll: () =>
    request<{ data: any[] }>('/yourmodule'),
  getById: (id: number) =>
    request<{ data: any }>(`/yourmodule/${id}`),
  create: (data: any) =>
    request<{ data: any }>('/yourmodule', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (id: number, data: any) =>
    request<{ data: any }>(`/yourmodule/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
  delete: (id: number) =>
    request<{ message: string }>(`/yourmodule/${id}`, {
      method: 'DELETE',
    }),
};
```

## 8. Assign Permissions to Roles

1. Go to `/roles-permissions`
2. Select a role
3. Click "Edit Permissions"
4. Check the permissions you want to assign
5. Click "Save"

---

## Quick Checklist

- [ ] Permissions added to database
- [ ] Frontend route protected
- [ ] Component uses `usePermissions` hook
- [ ] Backend routes protected
- [ ] Backend route registered in `server/index.js`
- [ ] API methods added to `src/lib/api.ts`
- [ ] Sidebar menu item added (if needed)
- [ ] Permissions assigned to roles
- [ ] Tested with different user roles

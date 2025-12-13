# Audit Logging Usage Guide

This guide shows how to use the advanced audit logging system in your routes.

## Quick Start

### 1. Import the audit logger utilities

```javascript
import { logCreate, logUpdate, logDelete, logView, getClientIp, getUserAgent } from '../utils/auditLogger.js';
```

### 2. Use in your routes

#### CREATE Action Example

```javascript
router.post('/', authenticate, requirePermission('projects.create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    
    // Get existing data (if needed for comparison)
    // ... your create logic ...
    
    const [result] = await db.query(`
      INSERT INTO projects (name, description, created_by)
      VALUES (?, ?, ?)
    `, [name, description, req.user.id]);
    
    const [newProject] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    
    // Log the CREATE action
    await logCreate(req, 'Projects', result.insertId, newProject[0], 'Project');
    
    res.status(201).json({ data: newProject[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### UPDATE Action Example

```javascript
router.put('/:id', authenticate, requirePermission('projects.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data
    const [existing] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const beforeData = existing[0];
    
    // Update the project
    const { name, description } = req.body;
    await db.query(`
      UPDATE projects 
      SET name = ?, description = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, description, id]);
    
    // Get after data
    const [updated] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    const afterData = updated[0];
    
    // Log the UPDATE action
    await logUpdate(req, 'Projects', id, beforeData, afterData, 'Project');
    
    res.json({ data: afterData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### DELETE Action Example

```javascript
router.delete('/:id', authenticate, requirePermission('projects.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data
    const [existing] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const beforeData = existing[0];
    
    // Delete the project
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    
    // Log the DELETE action
    await logDelete(req, 'Projects', id, beforeData, 'Project');
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

#### VIEW Action Example

```javascript
router.get('/:id', authenticate, requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (projects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Log the VIEW action (optional, can be noisy)
    // await logView(req, 'Projects', id, 'Project');
    
    res.json({ data: projects[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Advanced Usage

### Custom Audit Log with Metadata

```javascript
import { createAuditLog, getClientIp, getUserAgent } from '../utils/auditLogger.js';

// Custom audit log with additional metadata
await createAuditLog({
  userId: req.user.id,
  action: 'EXPORT',
  module: 'Projects',
  itemId: projectId,
  itemType: 'Project',
  beforeData: null,
  afterData: null,
  ipAddress: getClientIp(req),
  userAgent: getUserAgent(req),
  metadata: {
    exportFormat: 'PDF',
    recordCount: 150,
    fileName: 'projects-report.pdf'
  }
});
```

## Best Practices

1. **Always capture before_data for UPDATE and DELETE** - This enables restore functionality
2. **Use consistent module names** - Use the same module name across related routes
3. **Include itemType for clarity** - Helps identify what type of item was affected
4. **Don't log sensitive data** - Exclude passwords, tokens, etc. from before_data and after_data
5. **Log asynchronously when possible** - Don't block the main response for audit logging
6. **Handle errors gracefully** - Audit logging failures shouldn't break your main flow

## Module Names Reference

Use these standard module names:
- `Users`
- `Employees`
- `Projects`
- `Tasks`
- `Bugs`
- `Leaves`
- `Reimbursements`
- `Prompts`
- `Settings`
- `Roles`
- `Positions`
- `Permissions`

## Action Types

Standard action types:
- `CREATE` - New item created
- `UPDATE` - Item updated
- `DELETE` - Item deleted
- `VIEW` - Item viewed (optional, can be noisy)
- `EXPORT` - Data exported
- `APPROVE` - Item approved
- `REJECT` - Item rejected
- `RESTORE` - Data restored from audit log

## Example: Complete CRUD Route with Audit Logging

```javascript
import express from 'express';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { db } from '../config/database.js';

const router = express.Router();
router.use(authenticate);

// CREATE
router.post('/', requirePermission('items.create'), async (req, res) => {
  try {
    const { name, description } = req.body;
    const [result] = await db.query(`
      INSERT INTO items (name, description, created_by)
      VALUES (?, ?, ?)
    `, [name, description, req.user.id]);
    
    const [newItem] = await db.query('SELECT * FROM items WHERE id = ?', [result.insertId]);
    await logCreate(req, 'Items', result.insertId, newItem[0], 'Item');
    
    res.status(201).json({ data: newItem[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// UPDATE
router.put('/:id', requirePermission('items.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    const { name, description } = req.body;
    await db.query(`
      UPDATE items SET name = ?, description = ?, updated_at = NOW()
      WHERE id = ?
    `, [name, description, id]);
    
    const [updated] = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    await logUpdate(req, 'Items', id, existing[0], updated[0], 'Item');
    
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// DELETE
router.delete('/:id', requirePermission('items.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    const [existing] = await db.query('SELECT * FROM items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }
    
    await db.query('DELETE FROM items WHERE id = ?', [id]);
    await logDelete(req, 'Items', id, existing[0], 'Item');
    
    res.json({ message: 'Item deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
```

## Notes

- Audit logs are automatically captured with IP address and user agent
- The restore functionality works for UPDATE and DELETE actions
- Super Admin and Admin can view and restore audit logs
- Audit logs include full before/after data for complete traceability

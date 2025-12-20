# UUID Route Update Guide

## Overview
This guide shows how to update backend routes to support UUIDs while maintaining backward compatibility with numeric IDs.

## Pattern for Updating Routes

### Step 1: Import UUID Resolver
Add this import at the top of your route file:
```javascript
import { resolveIdFromUuid, getRecordByIdentifier } from '../utils/uuidResolver.js';
```

### Step 2: Update GET Route
**Before:**
```javascript
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [records] = await db.query('SELECT * FROM table_name WHERE id = ?', [id]);
  // ...
});
```

**After:**
```javascript
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Resolve UUID to numeric ID if needed
  const recordId = await resolveIdFromUuid('table_name', id);
  if (!recordId) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  const [records] = await db.query('SELECT * FROM table_name WHERE id = ?', [recordId]);
  // ... rest of code uses recordId instead of id
});
```

### Step 3: Update PUT/UPDATE Route
**Before:**
```javascript
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  // ... queries use id
});
```

**After:**
```javascript
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Resolve UUID to numeric ID if needed
  const recordId = await resolveIdFromUuid('table_name', id);
  if (!recordId) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  // Replace all uses of 'id' with 'recordId' in queries
  // ... rest of code uses recordId
});
```

### Step 4: Update DELETE Route
**Before:**
```javascript
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  await db.query('DELETE FROM table_name WHERE id = ?', [id]);
});
```

**After:**
```javascript
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Resolve UUID to numeric ID if needed
  const recordId = await resolveIdFromUuid('table_name', id);
  if (!recordId) {
    return res.status(404).json({ error: 'Record not found' });
  }
  
  await db.query('DELETE FROM table_name WHERE id = ?', [recordId]);
});
```

## Routes That Need Updates

### ✅ Completed
- `server/routes/users.js` - GET, PUT, DELETE routes updated
- `server/routes/projects.js` - Already supports UUIDs
- `server/routes/tasks.js` - Already supports UUIDs (needs verification)

### ⏳ Pending Updates

#### 1. Employees Routes (`server/routes/employees.js`)
- GET `/:id` - Get employee by ID
- PUT `/:id` - Update employee
- DELETE `/:id` - Delete employee
- Any nested routes like `/:id/documents`, `/:id/attendance`, etc.

#### 2. Bugs Routes (`server/routes/bugs.js`)
- GET `/:id` - Get bug by ID
- PUT `/:id` - Update bug
- DELETE `/:id` - Delete bug
- POST `/:id/attachments` - Upload attachments
- GET `/:id/comments` - Get comments
- POST `/:id/comments` - Add comment

#### 3. Reimbursements Routes (`server/routes/reimbursements.js`)
- GET `/:id` - Get reimbursement by ID
- PUT `/:id` - Update reimbursement
- DELETE `/:id` - Delete reimbursement
- Any approval routes

#### 4. Supports Routes (`server/routes/supports.js` or similar)
- If supports table exists, update all routes

#### 5. Tasks Routes (`server/routes/tasks.js`)
- Verify all routes support UUIDs
- Update any routes that still use numeric IDs only

## Important Notes

1. **Always use `recordId` variable** after resolving UUID - don't use the original `id` param in queries
2. **Return UUIDs in responses** - Make sure API responses include the `uuid` field
3. **Update nested routes** - If you have routes like `/:id/comments`, resolve the parent ID first
4. **Test backward compatibility** - Old numeric IDs should still work
5. **Update frontend** - After backend is updated, update frontend to use UUIDs in URLs

## Testing Checklist

For each updated route:
- [ ] Test with UUID format
- [ ] Test with numeric ID (backward compatibility)
- [ ] Test with invalid UUID (should return 404)
- [ ] Test with non-existent UUID (should return 404)
- [ ] Verify response includes UUID field
- [ ] Test nested routes (e.g., `/users/:id/activate`)

## Example: Complete Route Update

```javascript
// Before
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [id]);
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });
  res.json({ data: users[0] });
});

// After
import { resolveIdFromUuid } from '../utils/uuidResolver.js';

router.get('/:id', async (req, res) => {
  const { id } = req.params;
  
  // Resolve UUID to numeric ID if needed
  const userId = await resolveIdFromUuid('users', id);
  if (!userId) {
    return res.status(404).json({ error: 'User not found' });
  }
  
  const [users] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);
  if (users.length === 0) return res.status(404).json({ error: 'User not found' });
  
  // Response will include uuid field from database
  res.json({ data: users[0] });
});
```


# Troubleshooting Guide

## Common Issues and Solutions

### Issue: "Something went wrong" Error

This generic error can occur for several reasons. Here are the most common causes and solutions:

---

## 1. Database Migration Not Run

**Symptom**: Error occurs when trying to create/edit employees or access positions.

**Solution**: Run the database migrations in order:

```sql
-- Step 1: Add hierarchy columns
SOURCE database/migrations/add_position_hierarchy.sql;

-- Step 2: Seed initial positions
SOURCE database/migrations/seed_hierarchical_positions.sql;
```

**Note**: The code has been made backward-compatible. If migrations haven't been run, the system will use role-based fallbacks, but you should run the migrations for full functionality.

---

## 2. Users Without Positions Assigned

**Symptom**: Error when trying to create users/employees.

**Solution**: 
1. Assign positions to existing users, OR
2. The system will use role-based fallback levels:
   - Super Admin → Level 0
   - Team Lead/Admin → Level 1
   - Others → Level 2

---

## 3. Missing Position Column in Database

**Symptom**: SQL errors about missing columns.

**Solution**: 
- Check if `positions` table has `level` and `parent_id` columns
- If not, run the migration: `add_position_hierarchy.sql`

---

## 4. Frontend API Errors

**Symptom**: Frontend shows error when loading employee create/edit page.

**Check**:
1. Open browser console (F12) to see the actual error
2. Check Network tab for failed API requests
3. Verify backend server is running
4. Check if `/employees/available-positions` endpoint is accessible

**Common Frontend Errors**:
- `404 Not Found` → Backend route not registered
- `401 Unauthorized` → Authentication issue
- `500 Internal Server Error` → Backend error (check server logs)

---

## 5. Position Validation Errors

**Symptom**: "You can only create..." error messages.

**This is expected behavior** - the system is working correctly:
- Level 0 (Super Admin) can only create Level 1 users
- Level 1 users can only create Level 2 users under their position
- Level 2 users cannot create anyone

**Solution**: 
- Ensure you're selecting positions appropriate for your level
- Check that positions are correctly assigned in the database

---

## 6. Circular Reference Errors

**Symptom**: Error when updating position hierarchy.

**Solution**: 
- Ensure parent-child relationships don't create loops
- Level 0 → Level 1 → Level 2 (no cycles allowed)

---

## Debugging Steps

### 1. Check Database Schema

```sql
-- Check if columns exist
DESCRIBE positions;

-- Should show: level, parent_id columns
```

### 2. Check Server Logs

Look for errors in:
- `server/logs/` directory
- Console output when running the server
- Look for "ER_BAD_FIELD_ERROR" or similar SQL errors

### 3. Test API Endpoints

```bash
# Test available positions endpoint
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:YOUR_PORT/api/employees/available-positions

# Should return JSON array of positions
```

### 4. Check Frontend Console

1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for JavaScript errors
4. Go to Network tab
5. Check failed requests and their error messages

---

## Quick Fixes

### If Migration Not Run Yet:

The code will work with fallbacks, but for best results:

1. **Run migrations** (see above)
2. **Assign positions to existing users**:
   ```sql
   -- Example: Assign Super Admin position to Super Admin user
   UPDATE users u
   JOIN roles r ON u.role_id = r.id
   SET u.position_id = (SELECT id FROM positions WHERE name = 'Super Admin' LIMIT 1)
   WHERE r.name = 'Super Admin';
   ```

### If Positions Not Showing in Frontend:

1. Check if user is authenticated
2. Verify `/employees/available-positions` endpoint works
3. Check browser console for API errors
4. Ensure user has proper permissions

---

## Getting More Information

### Enable Debug Logging

In `server/utils/logger.js`, ensure debug level is enabled:

```javascript
logger.level = 'debug';
```

### Check Database State

```sql
-- Check positions with hierarchy
SELECT 
  p.id,
  p.name,
  p.level,
  p.parent_id,
  parent.name as parent_name
FROM positions p
LEFT JOIN positions parent ON p.parent_id = parent.id
ORDER BY p.level, p.name;

-- Check users and their positions
SELECT 
  u.id,
  u.name,
  u.email,
  r.name as role,
  p.name as position,
  p.level
FROM users u
LEFT JOIN roles r ON u.role_id = r.id
LEFT JOIN positions p ON u.position_id = p.id
ORDER BY p.level, u.name;
```

---

## Still Having Issues?

1. **Check the actual error message** in:
   - Browser console (F12)
   - Server logs
   - Network tab in DevTools

2. **Verify migrations ran successfully**:
   ```sql
   SHOW COLUMNS FROM positions LIKE 'level';
   SHOW COLUMNS FROM positions LIKE 'parent_id';
   ```

3. **Test with a simple API call**:
   ```bash
   curl http://localhost:YOUR_PORT/api/positions
   ```

4. **Check if it's a specific user/action**:
   - Try with different user roles
   - Try creating vs editing
   - Check if it's position-specific

---

**Last Updated**: After implementation
**Status**: Code is backward-compatible and handles missing migrations gracefully

# UUID Migration Guide

## Overview
This migration adds UUID columns to all main tables and updates the application to use UUIDs in URLs instead of numeric IDs for better security and URL masking.

## Migration Steps

### Step 1: Run Database Migration
```bash
mysql -u your_username -p prasowla_ntpl_admin < database/add_uuid_columns_migration.sql
```

This will:
- Add `uuid` columns to: users, employees, bugs, reimbursements, supports
- Generate UUIDs for all existing records
- Add indexes for performance
- Projects and tasks already have UUIDs from previous migration

### Step 2: Verify Migration
Run these queries to verify:
```sql
SELECT COUNT(*) as total_users, COUNT(uuid) as users_with_uuid FROM users;
SELECT COUNT(*) as total_employees, COUNT(uuid) as employees_with_uuid FROM employees;
SELECT COUNT(*) as total_bugs, COUNT(uuid) as bugs_with_uuid FROM bugs;
SELECT COUNT(*) as total_reimbursements, COUNT(uuid) as reimbursements_with_uuid FROM reimbursements;
```

All counts should match (every record should have a UUID).

### Step 3: Backend Updates
The backend routes have been updated to:
- Accept both UUID and numeric ID (backward compatible)
- Use `uuidResolver.js` utility to resolve UUIDs to numeric IDs
- Return UUIDs in API responses

### Step 4: Frontend Updates
The frontend has been updated to:
- Use UUIDs in all navigation URLs
- Display UUIDs instead of numeric IDs
- Handle both UUID and numeric ID formats (backward compatible)

## Tables Updated

| Table | UUID Column | Status |
|-------|-------------|--------|
| users | uuid | ✅ Added |
| employees | uuid | ✅ Added |
| projects | uuid | ✅ Already exists |
| tasks | uuid | ✅ Already exists |
| bugs | uuid | ✅ Added |
| reimbursements | uuid | ✅ Added |
| supports | uuid | ✅ Added (if table exists) |

## Backward Compatibility

The implementation maintains backward compatibility:
- Routes accept both UUID and numeric ID
- Old URLs with numeric IDs still work
- New records automatically get UUIDs
- Frontend prefers UUIDs but falls back to numeric IDs

## Testing Checklist

- [ ] Run migration script
- [ ] Verify all records have UUIDs
- [ ] Test user routes with UUID
- [ ] Test employee routes with UUID
- [ ] Test project routes with UUID (already working)
- [ ] Test task routes with UUID (already working)
- [ ] Test bug routes with UUID
- [ ] Test reimbursement routes with UUID
- [ ] Test support routes with UUID (if applicable)
- [ ] Verify old numeric IDs still work
- [ ] Test frontend navigation with UUIDs
- [ ] Test creating new records (should get UUIDs)

## Rollback Plan

If issues occur:
1. The migration is safe - it only adds columns
2. Backend still accepts numeric IDs
3. Frontend can be reverted to use numeric IDs
4. UUID columns can be dropped if needed (not recommended)

## Notes

- UUIDs are generated using MySQL's UUID() function
- UUIDs are stored as VARCHAR(36) with UNIQUE constraint
- Indexes are added for performance
- All existing records get UUIDs automatically
- New records get UUIDs on INSERT (via trigger or application logic)


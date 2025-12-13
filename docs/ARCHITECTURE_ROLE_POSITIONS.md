# Role-Position Mapping Architecture

## Overview
This document explains how role-position mapping works without adding columns to the `positions` table.

## Database Design

### Tables Structure

1. **`roles` table** - Stores all roles (Super Admin, Admin, Team Lead, Developer, Designer, Tester, Viewer)
2. **`positions` table** - Stores all positions (Developer, iOS Developer, Android Developer, Senior Developer, etc.)
3. **`role_positions` junction table** - Maps roles to positions (many-to-many relationship)

### Why Junction Table Instead of Column?

**Traditional approach (NOT used):**
```sql
-- BAD: Adding role_id to positions table
ALTER TABLE positions ADD COLUMN role_id INT;
```
**Problems:**
- A position can only belong to ONE role
- Cannot map multiple roles to one position
- Cannot map multiple positions to one role
- Requires schema changes for each new mapping

**Our approach (USED):**
```sql
-- GOOD: Junction table for many-to-many
CREATE TABLE role_positions (
  role_id INT,
  position_id INT,
  UNIQUE KEY (role_id, position_id)
);
```
**Benefits:**
- One position can belong to multiple roles
- One role can have multiple positions
- No schema changes needed for new mappings
- Scalable and flexible
- Industry standard approach

## How It Works

### 1. Data Storage
- Mappings are stored in `role_positions` table
- Each row represents one role-position relationship
- Example:
  ```
  role_id | position_id
  --------|-------------
  3       | 1          (Developer role → Developer position)
  3       | 2          (Developer role → iOS Developer position)
  3       | 3          (Developer role → Android Developer position)
  4       | 1          (Designer role → Developer position)
  ```

### 2. Data Retrieval
When fetching positions for a role:
```sql
SELECT 
  p.*,
  CASE WHEN rp.id IS NOT NULL THEN 1 ELSE 0 END as is_mapped
FROM positions p
LEFT JOIN role_positions rp ON p.id = rp.position_id AND rp.role_id = ?
```

This query:
- Returns ALL positions
- Adds `is_mapped` flag (computed column, not stored)
- `is_mapped = 1` means position is mapped to the role
- `is_mapped = 0` means position is NOT mapped to the role

### 3. Frontend Filtering
- Frontend filters positions where `is_mapped === 1`
- Only mapped positions appear in dropdown
- Works globally - same logic everywhere

## Resilience & Error Handling

### Server Restart
- ✅ Data persists in database (not in memory)
- ✅ Junction table survives restarts
- ✅ Queries work immediately after restart
- ✅ No data loss

### Missing Table Handling
If `role_positions` table doesn't exist:
1. API detects missing table
2. Returns all positions with `is_mapped: 0`
3. System continues to work (shows all positions)
4. Admin can run migration script to create table

### Worldwide Access
- ✅ Same database schema everywhere
- ✅ Same API endpoints globally
- ✅ No region-specific code needed
- ✅ Consistent behavior across locations

## Migration & Deployment

### Initial Setup
1. Run `database/add_role_positions_mapping.sql` to create junction table
2. Map roles to positions via Roles & Positions page
3. System automatically uses mappings

### Adding New Mappings
- No code changes needed
- Just add rows to `role_positions` table
- Works immediately

### Backward Compatibility
- If table doesn't exist: shows all positions
- If no mappings: shows all positions
- System degrades gracefully

## Performance Considerations

### Indexes
```sql
INDEX idx_role_position (role_id, position_id)
```
- Fast lookups by role
- Fast lookups by position
- Optimized for JOIN queries

### Query Optimization
- Uses LEFT JOIN (efficient)
- Indexed columns for fast filtering
- Single query gets all data

## Best Practices

1. **Always use junction table** for many-to-many relationships
2. **Never add foreign key columns** to child tables for many-to-many
3. **Use computed columns** (`is_mapped`) for filtering, not storage
4. **Handle missing tables gracefully** with fallbacks
5. **Validate data** before inserting mappings

## Example Usage

### Mapping Developer Role to Multiple Positions
```sql
INSERT INTO role_positions (role_id, position_id) VALUES
(3, 1),  -- Developer → Developer
(3, 2),  -- Developer → iOS Developer
(3, 3),  -- Developer → Android Developer
(3, 4);  -- Developer → Senior Developer
```

### Querying Positions for Developer Role
```sql
SELECT p.name 
FROM positions p
INNER JOIN role_positions rp ON p.id = rp.position_id
WHERE rp.role_id = 3;
-- Returns: Developer, iOS Developer, Android Developer, Senior Developer
```

## Troubleshooting

### Positions not showing in dropdown?
1. Check if `role_positions` table exists
2. Check if mappings exist: `SELECT * FROM role_positions WHERE role_id = ?`
3. Check browser console for API errors
4. Verify role ID is correct

### Table doesn't exist?
Run migration: `database/add_role_positions_mapping.sql`

### Mappings not persisting?
- Check database connection
- Check transaction commits
- Verify foreign key constraints

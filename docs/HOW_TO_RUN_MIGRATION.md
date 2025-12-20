# How to Run Inventory Migration

## The Problem
You're getting this error:
```
#1109 - Unknown table 'inventory_items' in information_schema
```

This means the database tables haven't been created yet.

## Solution: Run the Migration

### Method 1: Using MySQL Command Line (Recommended)

1. **Open Terminal/Command Prompt**

2. **Navigate to your project directory**
   ```bash
   cd /Users/naethra/Desktop/Projects/ntpl/project-mgmt-new/prompt-hub
   ```

3. **Run the migration**
   ```bash
   mysql -u root -p prasowla_ntpl_admin < database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql
   ```
   
   Enter your MySQL password when prompted.

4. **Verify it worked**
   ```bash
   mysql -u root -p prasowla_ntpl_admin -e "SELECT COUNT(*) FROM inventory_items;"
   ```

### Method 2: Using phpMyAdmin

1. **Open phpMyAdmin** in your browser
2. **Select the `prasowla_ntpl_admin` database** from the left sidebar
3. **Click on the "SQL" tab** at the top
4. **Open the file** `database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql` in a text editor
5. **Copy the entire contents** and paste into the SQL textarea
6. **Click "Go"** to execute
7. **Check for errors** - if you see any, read the error message

### Method 3: Using MySQL Workbench

1. **Open MySQL Workbench**
2. **Connect to your database**
3. **Open File → Open SQL Script**
4. **Navigate to** `database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql`
5. **Click the Execute button** (lightning bolt icon) or press `Ctrl+Shift+Enter`

### Method 4: Run Step by Step (If you get errors)

If you get foreign key errors, run each section separately:

1. **First, check dependencies:**
   ```sql
   USE prasowla_ntpl_admin;
   SELECT * FROM asset_categories LIMIT 1;
   SELECT * FROM users LIMIT 1;
   ```
   
   If either of these fails, you need to run the asset management migration first:
   ```bash
   mysql -u root -p prasowla_ntpl_admin < database/migrations/add_it_asset_management.sql
   ```

2. **Then run the inventory migration:**
   ```bash
   mysql -u root -p prasowla_ntpl_admin < database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql
   ```

## Verification

After running the migration, verify it worked:

```sql
USE prasowla_ntpl_admin;

-- Check tables exist
SHOW TABLES LIKE 'inventory%';

-- Should show:
-- inventory_items
-- inventory_transactions
-- inventory_attachments

-- Test query
SELECT COUNT(*) FROM inventory_items;
-- Should return: 0 (no rows yet, but table exists)

-- Check table structure
DESCRIBE inventory_items;
-- Should show all columns
```

## Common Errors and Fixes

### Error: "Table 'prasowla_ntpl_admin.asset_categories' doesn't exist"
**Fix:** Run the asset management migration first:
```bash
mysql -u root -p prasowla_ntpl_admin < database/migrations/add_it_asset_management.sql
```

### Error: "Access denied for user"
**Fix:** Make sure you're using the correct MySQL username and password. Try:
```bash
mysql -u root -p
```
Then manually:
```sql
USE prasowla_ntpl_admin;
SOURCE database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql;
```

### Error: "Cannot add foreign key constraint"
**Fix:** Make sure `asset_categories` and `users` tables exist and have data. Check:
```sql
SELECT COUNT(*) FROM asset_categories;
SELECT COUNT(*) FROM users;
```

### Error: "Table already exists"
**Fix:** The tables might already exist. Try:
```sql
DROP TABLE IF EXISTS inventory_attachments;
DROP TABLE IF EXISTS inventory_transactions;
DROP TABLE IF EXISTS inventory_items;
```
Then run the migration again.

## Still Having Issues?

1. **Check MySQL is running:**
   ```bash
   mysql -u root -p -e "SELECT 1;"
   ```

2. **Check database exists:**
   ```bash
   mysql -u root -p -e "SHOW DATABASES LIKE 'prasowla_ntpl_admin';"
   ```

3. **Check file path:**
   Make sure you're in the project root directory when running the command.

4. **Try running SQL directly:**
   ```bash
   mysql -u root -p prasowla_ntpl_admin
   ```
   Then:
   ```sql
   SOURCE database/migrations/STEP_BY_STEP_INVENTORY_SETUP.sql;
   ```

## Success Indicators

After successful migration, you should be able to:
- ✅ Run `SELECT COUNT(*) FROM inventory_items;` without errors
- ✅ See 3 tables when running `SHOW TABLES LIKE 'inventory%';`
- ✅ See 2 views when checking views
- ✅ Access `/it-assets/inventory` route in your app

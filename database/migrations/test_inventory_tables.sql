-- Quick test to verify inventory tables exist
USE `admin_dashboard`;

-- Test 1: Check if tables exist
SELECT 
  'inventory_items' AS table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'admin_dashboard' 
  AND table_name = 'inventory_items'

UNION ALL

SELECT 
  'inventory_transactions' AS table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'admin_dashboard' 
  AND table_name = 'inventory_transactions'

UNION ALL

SELECT 
  'inventory_attachments' AS table_name,
  CASE 
    WHEN COUNT(*) > 0 THEN 'EXISTS'
    ELSE 'NOT FOUND'
  END AS status
FROM information_schema.tables 
WHERE table_schema = 'admin_dashboard' 
  AND table_name = 'inventory_attachments';

-- Test 2: Try to query the table (will fail if table doesn't exist)
SELECT 'Testing inventory_items table...' AS test;
SELECT COUNT(*) AS row_count FROM inventory_items;

-- Test 3: Check table structure
DESCRIBE inventory_items;

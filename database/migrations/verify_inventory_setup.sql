-- ============================================
-- INVENTORY SETUP VERIFICATION SCRIPT
-- ============================================
-- Run this script to verify inventory tables are set up correctly
-- ============================================

USE `admin_dashboard`;

-- Check if tables exist
SELECT 
  'Tables Check' AS CheckType,
  CASE 
    WHEN COUNT(*) = 3 THEN '✓ All inventory tables exist'
    ELSE CONCAT('✗ Missing tables. Found: ', COUNT(*), '/3')
  END AS Status
FROM information_schema.tables 
WHERE table_schema = 'admin_dashboard' 
  AND table_name IN ('inventory_items', 'inventory_transactions', 'inventory_attachments');

-- Check table structures
SELECT 'inventory_items' AS TableName, COUNT(*) AS ColumnCount
FROM information_schema.columns 
WHERE table_schema = 'admin_dashboard' AND table_name = 'inventory_items'

UNION ALL

SELECT 'inventory_transactions' AS TableName, COUNT(*) AS ColumnCount
FROM information_schema.columns 
WHERE table_schema = 'admin_dashboard' AND table_name = 'inventory_transactions'

UNION ALL

SELECT 'inventory_attachments' AS TableName, COUNT(*) AS ColumnCount
FROM information_schema.columns 
WHERE table_schema = 'admin_dashboard' AND table_name = 'inventory_attachments';

-- Check if views exist
SELECT 
  'Views Check' AS CheckType,
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ All inventory views exist'
    ELSE CONCAT('✗ Missing views. Found: ', COUNT(*), '/2')
  END AS Status
FROM information_schema.views 
WHERE table_schema = 'admin_dashboard' 
  AND table_name IN ('v_low_stock_items', 'v_inventory_stats');

-- Check if trigger exists
SELECT 
  'Trigger Check' AS CheckType,
  CASE 
    WHEN COUNT(*) = 1 THEN '✓ Trigger exists'
    ELSE '✗ Trigger missing'
  END AS Status
FROM information_schema.triggers 
WHERE trigger_schema = 'admin_dashboard' 
  AND trigger_name = 'update_inventory_timestamp';

-- Check foreign key constraints
SELECT 
  'Foreign Keys Check' AS CheckType,
  COUNT(*) AS ForeignKeyCount,
  CASE 
    WHEN COUNT(*) >= 4 THEN '✓ Foreign keys configured'
    ELSE CONCAT('✗ Missing foreign keys. Found: ', COUNT(*))
  END AS Status
FROM information_schema.table_constraints 
WHERE constraint_schema = 'admin_dashboard' 
  AND constraint_type = 'FOREIGN KEY'
  AND table_name IN ('inventory_items', 'inventory_transactions', 'inventory_attachments');

-- Check dependencies (required tables)
SELECT 
  'Dependencies Check' AS CheckType,
  CASE 
    WHEN COUNT(*) = 2 THEN '✓ All required tables exist'
    ELSE CONCAT('✗ Missing dependencies. Found: ', COUNT(*), '/2')
  END AS Status
FROM information_schema.tables 
WHERE table_schema = 'admin_dashboard' 
  AND table_name IN ('asset_categories', 'users');

-- Show current inventory items count
SELECT 
  'Data Check' AS CheckType,
  COUNT(*) AS ItemCount,
  CASE 
    WHEN COUNT(*) >= 0 THEN '✓ Table is accessible'
    ELSE '✗ Cannot access table'
  END AS Status
FROM inventory_items;

-- Show sample inventory items structure
SELECT 
  'Sample Data' AS Info,
  id,
  asset_name,
  asset_code,
  current_stock,
  min_stock_level
FROM inventory_items
LIMIT 5;
/**
 * Database Health Check Utility
 * Verifies required tables exist and provides helpful error messages
 */

import { db } from '../config/database.js';

/**
 * Check if a table exists in the database
 * @param {string} tableName - Name of the table to check
 * @returns {Promise<boolean>} - True if table exists, false otherwise
 */
export async function tableExists(tableName) {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = ?
    `, [tableName]);
    return result[0].count > 0;
  } catch (error) {
    console.error(`Error checking table existence for ${tableName}:`, error);
    return false;
  }
}

/**
 * Check if a column exists in a table
 * @param {string} tableName - Name of the table
 * @param {string} columnName - Name of the column
 * @returns {Promise<boolean>} - True if column exists, false otherwise
 */
export async function columnExists(tableName, columnName) {
  try {
    const [result] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.columns 
      WHERE table_schema = DATABASE() 
      AND table_name = ? 
      AND column_name = ?
    `, [tableName, columnName]);
    return result[0].count > 0;
  } catch (error) {
    console.error(`Error checking column existence for ${tableName}.${columnName}:`, error);
    return false;
  }
}

/**
 * Perform database health check on server startup
 * Checks for required tables and provides migration guidance
 */
export async function performHealthCheck() {
  console.log('\n🔍 Performing database health check...\n');
  
  const requiredTables = [
    'users',
    'roles',
    'positions',
    'employees',
    'projects',
    'tasks',
    'bugs'
  ];
  
  const optionalTables = [
    'role_positions' // Optional - system works without it (shows all positions)
  ];
  
  const missingRequired = [];
  const missingOptional = [];
  
  // Check required tables
  for (const table of requiredTables) {
    const exists = await tableExists(table);
    if (!exists) {
      missingRequired.push(table);
      console.error(`❌ Required table missing: ${table}`);
    } else {
      console.log(`✅ Table exists: ${table}`);
    }
  }
  
  // Check optional tables
  for (const table of optionalTables) {
    const exists = await tableExists(table);
    if (!exists) {
      missingOptional.push(table);
      console.warn(`⚠️  Optional table missing: ${table}`);
      console.warn(`   Impact: Role-position mapping will not work. Run migration: database/add_role_positions_mapping.sql`);
    } else {
      console.log(`✅ Optional table exists: ${table}`);
    }
  }
  
  // Summary
  console.log('\n📊 Health Check Summary:');
  if (missingRequired.length === 0 && missingOptional.length === 0) {
    console.log('✅ All tables present - Database is healthy!\n');
    return { healthy: true, missingRequired: [], missingOptional: [] };
  }
  
  if (missingRequired.length > 0) {
    console.error(`❌ Missing ${missingRequired.length} required table(s): ${missingRequired.join(', ')}`);
    console.error('   Action: Run database migration scripts immediately!\n');
    return { healthy: false, missingRequired, missingOptional };
  }
  
  if (missingOptional.length > 0) {
    console.warn(`⚠️  Missing ${missingOptional.length} optional table(s): ${missingOptional.join(', ')}`);
    console.warn('   Action: System will work but with limited functionality. Run migration when ready.\n');
    return { healthy: true, missingRequired: [], missingOptional };
  }
  
  return { healthy: true, missingRequired: [], missingOptional: [] };
}

/**
 * Verify role_positions table structure
 * Ensures the junction table has correct columns
 */
export async function verifyRolePositionsTable() {
  if (!(await tableExists('role_positions'))) {
    return { valid: false, error: 'Table does not exist' };
  }
  
  const requiredColumns = ['id', 'role_id', 'position_id', 'created_at'];
  const missingColumns = [];
  
  for (const column of requiredColumns) {
    if (!(await columnExists('role_positions', column))) {
      missingColumns.push(column);
    }
  }
  
  if (missingColumns.length > 0) {
    return { 
      valid: false, 
      error: `Missing columns: ${missingColumns.join(', ')}` 
    };
  }
  
  return { valid: true };
}

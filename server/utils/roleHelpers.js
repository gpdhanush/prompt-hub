/**
 * Role Helper Utilities
 * Fetches role information from database instead of using hardcoded values
 */

import { db } from '../config/database.js';
import { logger } from './logger.js';

// Cache for role mappings (to avoid repeated DB queries)
let roleCache = null;
let roleCacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Get all roles from database
 * @returns {Promise<Array>} Array of role objects with id, name, etc.
 */
export async function getAllRoles() {
  try {
    const [roles] = await db.query(`
      SELECT id, name, description, reporting_person_role_id
      FROM roles
      ORDER BY name ASC
    `);
    return roles;
  } catch (error) {
    logger.error('Error fetching roles:', error);
    return [];
  }
}

/**
 * Get role by name (with caching)
 * @param {string} roleName - The role name to find
 * @returns {Promise<Object|null>} Role object or null
 */
export async function getRoleByName(roleName) {
  try {
    // Check cache first
    const now = Date.now();
    if (!roleCache || !roleCacheTimestamp || (now - roleCacheTimestamp) > CACHE_TTL) {
      roleCache = await getAllRoles();
      roleCacheTimestamp = now;
    }
    
    const role = roleCache.find(r => r.name === roleName);
    return role || null;
  } catch (error) {
    logger.error('Error getting role by name:', error);
    return null;
  }
}

/**
 * Get role ID by name
 * @param {string} roleName - The role name
 * @returns {Promise<number|null>} Role ID or null
 */
export async function getRoleIdByName(roleName) {
  const role = await getRoleByName(roleName);
  return role ? role.id : null;
}

/**
 * Check if a role name exists
 * @param {string} roleName - The role name to check
 * @returns {Promise<boolean>} True if role exists
 */
export async function roleExists(roleName) {
  const role = await getRoleByName(roleName);
  return role !== null;
}

/**
 * Get roles by level (for hierarchy)
 * This fetches roles that are typically at a certain hierarchy level
 * Note: This is based on position level, not role level
 * @param {number} level - The hierarchy level (0, 1, 2)
 * @returns {Promise<Array>} Array of role names typically at this level
 */
export async function getRolesByLevel(level) {
  try {
    // Get roles that are commonly associated with positions at this level
    const [roles] = await db.query(`
      SELECT DISTINCT r.id, r.name
      FROM roles r
      INNER JOIN users u ON r.id = u.role_id
      INNER JOIN positions p ON u.position_id = p.id
      WHERE p.level = ?
    `, [level]);
    
    return roles.map(r => r.name);
  } catch (error) {
    // If level column doesn't exist, use fallback based on common role patterns
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      logger.warn('Position level column not found. Using fallback role mapping.');
      // Fallback: return common roles for each level
      if (level === 0) {
        const superAdmin = await getSuperAdminRole();
        return superAdmin ? [superAdmin.name] : [];
      } else if (level === 1) {
        // Common Level 1 roles
        const allRoles = await getAllRoles();
        const level1Names = ['Admin', 'Team Lead', 'Team Leader', 'Manager', 'Accounts Manager', 'Office Manager', 'HR Manager'];
        return allRoles.filter(r => level1Names.includes(r.name)).map(r => r.name);
      } else if (level === 2) {
        // Common Level 2 roles
        const allRoles = await getAllRoles();
        const level2Names = ['Developer', 'Designer', 'Tester', 'Employee', 'Accountant', 'Network Admin', 'System Admin', 'Office Staff'];
        return allRoles.filter(r => level2Names.includes(r.name)).map(r => r.name);
      }
      return [];
    }
    logger.error('Error getting roles by level:', error);
    return [];
  }
}

/**
 * Get Super Admin role (Level 0 equivalent)
 * @returns {Promise<Object|null>} Super Admin role object
 */
export async function getSuperAdminRole() {
  // Try common Super Admin role names
  const superAdminNames = ['Super Admin', 'SuperAdmin', 'Super Administrator'];
  
  for (const name of superAdminNames) {
    const role = await getRoleByName(name);
    if (role) return role;
  }
  
  // If not found, get the first role (fallback - not ideal but safe)
  const allRoles = await getAllRoles();
  if (allRoles.length > 0) {
    logger.warn('Super Admin role not found, using first role as fallback');
    return allRoles[0];
  }
  
  return null;
}

/**
 * Check if user has Super Admin role
 * @param {number} userId - User ID
 * @returns {Promise<boolean>} True if user is Super Admin
 */
export async function isSuperAdmin(userId) {
  try {
    const [user] = await db.query(`
      SELECT r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (user.length === 0) return false;
    
    const roleName = user[0].role_name;
    const superAdminRole = await getSuperAdminRole();
    
    return superAdminRole && roleName === superAdminRole.name;
  } catch (error) {
    logger.error('Error checking Super Admin status:', error);
    return false;
  }
}

/**
 * Get roles that can create users (typically Level 1 roles)
 * @returns {Promise<Array>} Array of role names that can create users
 */
export async function getManagerRoles() {
  try {
    // Get roles associated with Level 1 positions
    const level1Roles = await getRolesByLevel(1);
    
    // Also include Super Admin
    const superAdminRole = await getSuperAdminRole();
    if (superAdminRole && !level1Roles.includes(superAdminRole.name)) {
      level1Roles.push(superAdminRole.name);
    }
    
    return level1Roles;
  } catch (error) {
    logger.error('Error getting manager roles:', error);
    return [];
  }
}

/**
 * Clear role cache (useful after role updates)
 */
export function clearRoleCache() {
  roleCache = null;
  roleCacheTimestamp = null;
}

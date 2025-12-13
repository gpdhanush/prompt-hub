/**
 * Position Hierarchy Validation Utilities
 * Validates user creation based on hierarchical position levels
 */

import { db } from '../config/database.js';
import { logger } from './logger.js';
import { getSuperAdminRole, isSuperAdmin } from './roleHelpers.js';

/**
 * Get creator's position level
 * @param {number} creatorUserId - The ID of the user creating the new user
 * @returns {Promise<{level: number, positionId: number, positionName: string}>}
 */
export async function getCreatorLevel(creatorUserId) {
  try {
    // First check if user exists and get their role with role level
    const [userRole] = await db.query(`
      SELECT r.name as role_name, r.level as role_level, u.position_id, u.role_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [creatorUserId]);
    
    if (userRole.length === 0) {
      throw new Error('Creator user not found');
    }
    
    const roleName = userRole[0].role_name;
    const roleLevel = userRole[0].role_level;
    const positionId = userRole[0].position_id;
    
    // Check if user is Super Admin (from database, not hardcoded)
    const isUserSuperAdmin = await isSuperAdmin(creatorUserId);
    if (isUserSuperAdmin) {
      const superAdminRole = await getSuperAdminRole();
      return { 
        level: 0, 
        positionId: null, 
        positionName: superAdminRole ? superAdminRole.name : 'Super Admin' 
      };
    }
    
    // PRIORITY 1: Use role level if available (roles table has level column)
    // This is the primary source of truth since roles define the hierarchy
    if (roleLevel !== null && roleLevel !== undefined) {
      logger.debug(`Using role level for ${roleName}: ${roleLevel}`);
      
      // Get position name for return value
      let positionName = roleName || 'Unknown';
      if (positionId) {
        try {
          const [position] = await db.query('SELECT name FROM positions WHERE id = ?', [positionId]);
          if (position.length > 0) {
            positionName = position[0].name;
          }
        } catch (e) {
          // Ignore position lookup errors
        }
      }
      
      return {
        level: roleLevel,
        positionId: positionId,
        positionName: positionName
      };
    }
    
    // PRIORITY 2: Fallback to position level if role level is not available
    if (positionId) {
      try {
        const [position] = await db.query(`
          SELECT id, name, level, parent_id
          FROM positions
          WHERE id = ?
        `, [positionId]);
        
        if (position.length > 0 && position[0].level !== null && position[0].level !== undefined) {
          logger.debug(`Using position level for ${roleName}: ${position[0].level}`);
          return {
            level: position[0].level,
            positionId: positionId,
            positionName: position[0].name
          };
        }
      } catch (dbError) {
        // If column doesn't exist, continue to fallback
        if (dbError.code !== 'ER_BAD_FIELD_ERROR') {
          throw dbError;
        }
      }
    }
    
    // PRIORITY 3: Final fallback - use role name to determine level
    logger.warn(`User ${creatorUserId} (${roleName}) has no role level or position level. Using role-based fallback.`);
    const { getManagerRoles } = await import('./roleHelpers.js');
    const managerRoles = await getManagerRoles();
    const fallbackLevel = managerRoles.includes(roleName) ? 1 : 2;
    
    let positionName = roleName || 'Unknown';
    if (positionId) {
      try {
        const [position] = await db.query('SELECT name FROM positions WHERE id = ?', [positionId]);
        if (position.length > 0) {
          positionName = position[0].name;
        }
      } catch (e) {
        // Ignore position lookup errors
      }
    }
    
    return {
      level: fallbackLevel,
      positionId: positionId,
      positionName: positionName
    };
  } catch (error) {
    logger.error('Error getting creator level:', error);
    throw error;
  }
}

/**
 * Get position details including level and parent
 * @param {number} positionId - The position ID
 * @returns {Promise<{level: number, parentId: number|null, name: string}>}
 */
export async function getPositionDetails(positionId) {
  try {
    // Check if level column exists, handle gracefully if migration not run
    const [position] = await db.query(`
      SELECT id, name, level, parent_id
      FROM positions
      WHERE id = ?
    `, [positionId]);
    
    if (position.length === 0) {
      throw new Error('Position not found');
    }
    
    // If level is null/undefined, migration hasn't been run
    const level = position[0].level;
    const parentId = position[0].parent_id;
    
    // If columns don't exist, provide defaults
    if (level === null || level === undefined) {
      logger.warn('Position level column not found. Migration may not be run. Using default level 2.');
      return {
        level: 2, // Default to Level 2 (employee)
        parentId: null,
        name: position[0].name,
        id: position[0].id
      };
    }
    
    return {
      level: level,
      parentId: parentId,
      name: position[0].name,
      id: position[0].id
    };
  } catch (error) {
    // Handle case where column doesn't exist
    if (error.code === 'ER_BAD_FIELD_ERROR') {
      logger.warn('Position hierarchy columns not found. Migration may not be run.');
      // Try to get position without level/parent_id
      try {
        const [position] = await db.query(`
          SELECT id, name
          FROM positions
          WHERE id = ?
        `, [positionId]);
        
        if (position.length > 0) {
          return {
            level: 2, // Default to Level 2
            parentId: null,
            name: position[0].name,
            id: position[0].id
          };
        }
      } catch (e) {
        // Fall through to original error
      }
    }
    
    logger.error('Error getting position details:', error);
    throw error;
  }
}

/**
 * Validate if creator can create a user with the given role
 * @param {number} creatorUserId - The ID of the user creating the new user
 * @param {number} newUserRoleId - The role ID for the new user
 * @param {number} newUserPositionId - Optional position ID for the new user (for backward compatibility)
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateUserCreation(creatorUserId, newUserRoleId, newUserPositionId = null) {
  try {
    // Get creator's level
    const creatorInfo = await getCreatorLevel(creatorUserId);
    const creatorLevel = creatorInfo.level;
    
    logger.debug('=== ROLE VALIDATION ===');
    logger.debug('Creator Level:', creatorLevel);
    logger.debug('Creator Position:', creatorInfo.positionName);
    
    // Get new user's role level (primary validation - roles have level column)
    const [roleInfo] = await db.query(`
      SELECT id, name, level 
      FROM roles 
      WHERE id = ?
    `, [newUserRoleId]);
    
    if (roleInfo.length === 0) {
      return {
        valid: false,
        error: 'Role not found'
      };
    }
    
    const newUserRole = roleInfo[0];
    let newUserLevel = newUserRole.level;
    
    // If role level is null, fallback to position level (for backward compatibility)
    if (newUserLevel === null || newUserLevel === undefined) {
      logger.debug('Role level is null, falling back to position level');
      if (newUserPositionId) {
        const newPosition = await getPositionDetails(newUserPositionId);
        newUserLevel = newPosition.level;
        logger.debug('Using position level:', newUserLevel);
      } else {
        // If no position and no role level, default to level 2 (employee)
        newUserLevel = 2;
        logger.debug('No position provided, defaulting to level 2');
      }
    }
    
    logger.debug('New User Role:', newUserRole.name);
    logger.debug('New User Level:', newUserLevel);
    
    // Validation Rules
    if (creatorLevel === 0) {
      // Super Admin (Level 0) can only create Level 1 users
      if (newUserLevel !== 1) {
        const superAdminRole = await getSuperAdminRole();
        const roleName = superAdminRole ? superAdminRole.name : 'Super Admin';
        return {
          valid: false,
          error: `${roleName} can only create Level 1 users (Managers/Admins). Selected role "${newUserRole.name}" is not Level 1.`
        };
      }
      logger.debug('✅ Super Admin can create Level 1 user');
    } else if (creatorLevel === 1) {
      // Level 1 users can only create Level 2 users (their employees)
      if (newUserLevel !== 2) {
        return {
          valid: false,
          error: `You can only create your employees (Level 2 users). Selected role "${newUserRole.name}" is not Level 2.`
        };
      }
      
      logger.debug('✅ Level 1 user can create Level 2 employee');
    } else if (creatorLevel === 2) {
      // Level 2 users cannot create anyone
      return {
        valid: false,
        error: 'Employees (Level 2) cannot create users. Only managers and admins can create users.'
      };
    } else {
      // Unknown level
      return {
        valid: false,
        error: `Invalid creator level: ${creatorLevel}. Cannot determine creation permissions.`
      };
    }
    
    return { valid: true };
  } catch (error) {
    logger.error('Error validating user creation:', error);
    return {
      valid: false,
      error: error.message || 'Error validating user creation'
    };
  }
}

/**
 * Get available positions that the creator can assign
 * @param {number} creatorUserId - The ID of the user creating the new user
 * @returns {Promise<Array>} Array of position objects
 */
export async function getAvailablePositions(creatorUserId) {
  try {
    const creatorInfo = await getCreatorLevel(creatorUserId);
    const creatorLevel = creatorInfo.level;
    
    // Check if level column exists
    let query = '';
    let params = [];
    
    try {
      if (creatorLevel === 0) {
        // Super Admin can see all Level 1 positions
        query = `
          SELECT id, name, level, parent_id, description
          FROM positions
          WHERE level = 1
          ORDER BY name ASC
        `;
      } else if (creatorLevel === 1) {
        // Level 1 users can see Level 2 positions that report to them
        if (creatorInfo.positionId) {
          query = `
            SELECT id, name, level, parent_id, description
            FROM positions
            WHERE level = 2 AND parent_id = ?
            ORDER BY name ASC
          `;
          params = [creatorInfo.positionId];
        } else {
          // If no position ID, return all Level 2 positions (fallback)
          query = `
            SELECT id, name, level, parent_id, description
            FROM positions
            WHERE level = 2
            ORDER BY name ASC
          `;
        }
      } else {
        // Level 2 users cannot create anyone, return empty array
        return [];
      }
      
      const [positions] = await db.query(query, params);
      return positions;
    } catch (dbError) {
      // If level column doesn't exist, return all positions (fallback)
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        logger.warn('Position level column not found. Returning all positions as fallback.');
        const [allPositions] = await db.query(`
          SELECT id, name, description
          FROM positions
          ORDER BY name ASC
        `);
        return allPositions.map(p => ({ ...p, level: null, parent_id: null }));
      }
      throw dbError;
    }
  } catch (error) {
    logger.error('Error getting available positions:', error);
    // If error getting creator level, return empty array (safe fallback)
    return [];
  }
}

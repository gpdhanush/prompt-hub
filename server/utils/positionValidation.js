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
    // First check if user exists and get their role
    const [userRole] = await db.query(`
      SELECT r.name as role_name, u.position_id
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [creatorUserId]);
    
    if (userRole.length === 0) {
      throw new Error('Creator user not found');
    }
    
    const roleName = userRole[0].role_name;
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
    
    // If user has a position, get its level
    if (positionId) {
      // Check if level column exists (migration might not be run)
      try {
        const [position] = await db.query(`
          SELECT id, name, level, parent_id
          FROM positions
          WHERE id = ?
        `, [positionId]);
        
        if (position.length > 0) {
          // If level column doesn't exist, it will be null/undefined
          const level = position[0].level;
          
          // If level is null/undefined, migration hasn't been run - use role-based fallback
          if (level === null || level === undefined) {
            logger.warn('Position level column not found. Migration may not be run. Using role-based fallback.');
            // Fallback: Get manager roles from database to determine level
            const { getManagerRoles } = await import('./roleHelpers.js');
            const managerRoles = await getManagerRoles();
            const fallbackLevel = managerRoles.includes(roleName) ? 1 : 2;
            return {
              level: fallbackLevel,
              positionId: positionId,
              positionName: position[0].name || 'Unknown'
            };
          }
          
          return {
            level: level,
            positionId: positionId,
            positionName: position[0].name
          };
        }
      } catch (dbError) {
        // If column doesn't exist, use role-based fallback
        if (dbError.code === 'ER_BAD_FIELD_ERROR') {
          logger.warn('Position level column not found. Using role-based fallback.');
          const { getManagerRoles } = await import('./roleHelpers.js');
          const managerRoles = await getManagerRoles();
          const fallbackLevel = managerRoles.includes(roleName) ? 1 : 2;
          return {
            level: fallbackLevel,
            positionId: positionId,
            positionName: 'Unknown'
          };
        }
        throw dbError;
      }
    }
    
    // User has no position assigned - use role-based fallback
    logger.warn(`User ${creatorUserId} has no position assigned. Using role-based fallback.`);
    const { getManagerRoles } = await import('./roleHelpers.js');
    const managerRoles = await getManagerRoles();
    const fallbackLevel = managerRoles.includes(roleName) ? 1 : 2;
    return {
      level: fallbackLevel,
      positionId: null,
      positionName: roleName || 'Unknown'
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
 * Validate if creator can create a user with the given position
 * @param {number} creatorUserId - The ID of the user creating the new user
 * @param {number} newUserPositionId - The position ID for the new user
 * @returns {Promise<{valid: boolean, error?: string}>}
 */
export async function validateUserCreation(creatorUserId, newUserPositionId) {
  try {
    // Get creator's level
    const creatorInfo = await getCreatorLevel(creatorUserId);
    const creatorLevel = creatorInfo.level;
    
    logger.debug('=== POSITION VALIDATION ===');
    logger.debug('Creator Level:', creatorLevel);
    logger.debug('Creator Position:', creatorInfo.positionName);
    
    // Get new user's position details
    const newPosition = await getPositionDetails(newUserPositionId);
    const newUserLevel = newPosition.level;
    
    logger.debug('New User Position:', newPosition.name);
    logger.debug('New User Level:', newUserLevel);
    logger.debug('New User Parent ID:', newPosition.parentId);
    
    // Validation Rules
    if (creatorLevel === 0) {
      // Super Admin (Level 0) can only create Level 1 users
      if (newUserLevel !== 1) {
        const superAdminRole = await getSuperAdminRole();
        const roleName = superAdminRole ? superAdminRole.name : 'Super Admin';
        return {
          valid: false,
          error: `${roleName} can only create Level 1 users (Managers/Admins). Selected position is not Level 1.`
        };
      }
      logger.debug('✅ Super Admin can create Level 1 user');
    } else if (creatorLevel === 1) {
      // Level 1 users can only create Level 2 users (their employees)
      if (newUserLevel !== 2) {
        return {
          valid: false,
          error: 'You can only create your employees (Level 2 users). Selected position is not Level 2.'
        };
      }
      
      // Additional check: Ensure new user's position parent matches creator's position
      if (newPosition.parentId !== creatorInfo.positionId) {
        // Get parent position name for better error message
        const [parentPosition] = await db.query(`
          SELECT name FROM positions WHERE id = ?
        `, [newPosition.parentId]);
        
        const parentName = parentPosition.length > 0 ? parentPosition[0].name : 'Unknown';
        
        return {
          valid: false,
          error: `You can only create employees under your position. The selected position "${newPosition.name}" reports to "${parentName}", not to your position "${creatorInfo.positionName}".`
        };
      }
      
      logger.debug('✅ Level 1 user can create Level 2 employee under their position');
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

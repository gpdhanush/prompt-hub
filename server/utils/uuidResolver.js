/**
 * UUID Resolver Utility
 * Safely resolves UUIDs to numeric IDs for database queries
 * Supports both UUID and numeric ID inputs for backward compatibility
 */

import { db } from '../config/database.js';
import { logger } from './logger.js';

/**
 * Resolve UUID to numeric ID for a given table
 * @param {string} tableName - Name of the table
 * @param {string|number} identifier - UUID string or numeric ID
 * @returns {Promise<number|null>} - Numeric ID or null if not found
 */
export async function resolveIdFromUuid(tableName, identifier) {
  try {
    // If it's already a number, return it
    if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
      return parseInt(identifier);
    }

    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    if (!isUUID) {
      logger.warn(`Invalid identifier format for ${tableName}: ${identifier}`);
      return null;
    }

    // Query database to get numeric ID from UUID
    const [results] = await db.query(
      `SELECT id FROM ${tableName} WHERE uuid = ? LIMIT 1`,
      [identifier]
    );

    if (results.length === 0) {
      logger.warn(`No record found with UUID ${identifier} in ${tableName}`);
      return null;
    }

    return results[0].id;
  } catch (error) {
    logger.error(`Error resolving UUID for ${tableName}:`, error);
    return null;
  }
}

/**
 * Get record by UUID or numeric ID
 * @param {string} tableName - Name of the table
 * @param {string|number} identifier - UUID string or numeric ID
 * @param {string} uuidColumn - Name of UUID column (default: 'uuid')
 * @returns {Promise<Object|null>} - Record or null if not found
 */
export async function getRecordByIdentifier(tableName, identifier, uuidColumn = 'uuid') {
  try {
    // If it's a number, query by ID
    if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
      const [results] = await db.query(
        `SELECT * FROM ${tableName} WHERE id = ? LIMIT 1`,
        [parseInt(identifier)]
      );
      return results.length > 0 ? results[0] : null;
    }

    // Check if it's a UUID format
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
    
    if (!isUUID) {
      logger.warn(`Invalid identifier format for ${tableName}: ${identifier}`);
      return null;
    }

    // Query by UUID
    const [results] = await db.query(
      `SELECT * FROM ${tableName} WHERE ${uuidColumn} = ? LIMIT 1`,
      [identifier]
    );

    return results.length > 0 ? results[0] : null;
  } catch (error) {
    logger.error(`Error getting record for ${tableName}:`, error);
    return null;
  }
}

/**
 * Check if identifier is UUID format
 * @param {string|number} identifier - Identifier to check
 * @returns {boolean} - True if UUID format
 */
export function isUUID(identifier) {
  if (typeof identifier === 'number' || /^\d+$/.test(identifier)) {
    return false;
  }
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(identifier);
}


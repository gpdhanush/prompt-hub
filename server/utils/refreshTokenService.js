import { db } from '../config/database.js';
import { logger } from './logger.js';

/**
 * Store refresh token in database
 * @param {number} userId - User ID
 * @param {string} tokenId - Unique token identifier
 * @param {string} tokenHash - Hashed refresh token
 * @param {Date} expiresAt - Token expiration date
 * @param {string} ipAddress - IP address of the client
 * @param {string} userAgent - User agent string
 * @returns {Promise<number>} Insert ID
 */
export async function storeRefreshToken(userId, tokenId, tokenHash, expiresAt, ipAddress, userAgent) {
  try {
    const [result] = await db.query(`
      INSERT INTO refresh_tokens (user_id, token_id, token_hash, expires_at, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [userId, tokenId, tokenHash, expiresAt, ipAddress, userAgent]);
    
    return result.insertId;
  } catch (error) {
    logger.error('Error storing refresh token:', error);
    throw error;
  }
}

/**
 * Find refresh token by token ID
 * @param {string} tokenId - Token identifier
 * @returns {Promise<Object|null>} Refresh token record
 */
export async function findRefreshToken(tokenId) {
  try {
    const [tokens] = await db.query(`
      SELECT * FROM refresh_tokens
      WHERE token_id = ? AND revoked = FALSE AND expires_at > NOW()
    `, [tokenId]);
    
    return tokens.length > 0 ? tokens[0] : null;
  } catch (error) {
    logger.error('Error finding refresh token:', error);
    throw error;
  }
}

/**
 * Revoke refresh token
 * @param {string} tokenId - Token identifier
 * @returns {Promise<boolean>} Success status
 */
export async function revokeRefreshToken(tokenId) {
  try {
    const [result] = await db.query(`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE token_id = ? AND revoked = FALSE
    `, [tokenId]);
    
    return result.affectedRows > 0;
  } catch (error) {
    logger.error('Error revoking refresh token:', error);
    throw error;
  }
}

/**
 * Revoke all refresh tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<number>} Number of tokens revoked
 */
export async function revokeAllUserTokens(userId) {
  try {
    const [result] = await db.query(`
      UPDATE refresh_tokens
      SET revoked = TRUE, revoked_at = CURRENT_TIMESTAMP
      WHERE user_id = ? AND revoked = FALSE
    `, [userId]);
    
    return result.affectedRows;
  } catch (error) {
    logger.error('Error revoking all user tokens:', error);
    throw error;
  }
}

/**
 * Clean up expired tokens
 * @returns {Promise<number>} Number of tokens deleted
 */
export async function cleanupExpiredTokens() {
  try {
    const [result] = await db.query(`
      DELETE FROM refresh_tokens
      WHERE expires_at < NOW() OR (revoked = TRUE AND revoked_at < DATE_SUB(NOW(), INTERVAL 30 DAY))
    `);
    
    return result.affectedRows;
  } catch (error) {
    logger.error('Error cleaning up expired tokens:', error);
    throw error;
  }
}

/**
 * Get all active tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>} Array of active tokens
 */
export async function getUserTokens(userId) {
  try {
    const [tokens] = await db.query(`
      SELECT token_id, ip_address, user_agent, created_at, expires_at
      FROM refresh_tokens
      WHERE user_id = ? AND revoked = FALSE AND expires_at > NOW()
      ORDER BY created_at DESC
    `, [userId]);
    
    return tokens;
  } catch (error) {
    logger.error('Error getting user tokens:', error);
    throw error;
  }
}

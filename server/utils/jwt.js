import jwt from 'jsonwebtoken';
import { JWT_CONFIG } from '../config/config.js';
import { logger } from './logger.js';
import crypto from 'crypto';

/**
 * Generate Access Token (short-lived: 5-15 minutes)
 * @param {Object} payload - User data to encode in token
 * @param {number} expiresInMinutes - Token expiration in minutes (default: 15)
 * @returns {string} JWT access token
 */
export function generateAccessToken(payload, expiresInMinutes = 15) {
  try {
    const token = jwt.sign(
      {
        ...payload,
        type: 'access'
      },
      JWT_CONFIG.SECRET,
      {
        expiresIn: `${expiresInMinutes}m`,
        issuer: 'admin-dashboard',
        audience: 'admin-dashboard-client'
      }
    );
    return token;
  } catch (error) {
    logger.error('Error generating access token:', error);
    throw new Error('Failed to generate access token');
  }
}

/**
 * Generate Refresh Token (long-lived: 7-30 days)
 * @param {number} userId - User ID
 * @param {number} expiresInDays - Token expiration in days (default: 30)
 * @returns {string} JWT refresh token
 */
export function generateRefreshToken(userId, expiresInDays = 30) {
  try {
    // Generate a random token ID for tracking
    const tokenId = crypto.randomBytes(32).toString('hex');
    
    const token = jwt.sign(
      {
        userId,
        tokenId,
        type: 'refresh'
      },
      JWT_CONFIG.SECRET,
      {
        expiresIn: `${expiresInDays}d`,
        issuer: 'admin-dashboard',
        audience: 'admin-dashboard-client'
      }
    );
    
    return { token, tokenId };
  } catch (error) {
    logger.error('Error generating refresh token:', error);
    throw new Error('Failed to generate refresh token');
  }
}

/**
 * Verify Access Token
 * @param {string} token - JWT access token
 * @returns {Object} Decoded token payload
 */
export function verifyAccessToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET, {
      issuer: 'admin-dashboard',
      audience: 'admin-dashboard-client'
    });
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Access token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid access token');
    }
    throw error;
  }
}

/**
 * Verify Refresh Token
 * @param {string} token - JWT refresh token
 * @returns {Object} Decoded token payload
 */
export function verifyRefreshToken(token) {
  try {
    const decoded = jwt.verify(token, JWT_CONFIG.SECRET, {
      issuer: 'admin-dashboard',
      audience: 'admin-dashboard-client'
    });
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw new Error('Refresh token expired');
    } else if (error.name === 'JsonWebTokenError') {
      throw new Error('Invalid refresh token');
    }
    throw error;
  }
}

/**
 * Decode token without verification (for debugging)
 * @param {string} token - JWT token
 * @returns {Object} Decoded token payload
 */
export function decodeToken(token) {
  return jwt.decode(token);
}

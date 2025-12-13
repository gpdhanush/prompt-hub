import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

// Simple in-memory rate limiter (can be replaced with express-rate-limit if package is installed)
let rateLimitStore = new Map();

const cleanupRateLimit = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitStore.entries()) {
    if (now - value.firstAttempt > 15 * 60 * 1000) {
      rateLimitStore.delete(key);
    }
  }
};

// Cleanup every 5 minutes
setInterval(cleanupRateLimit, 5 * 60 * 1000);

// Simple rate limiter implementation
const createRateLimiter = (windowMs, max) => {
  return (req, res, next) => {
    const key = req.ip || req.connection.remoteAddress || 'unknown';
    const now = Date.now();
    
    cleanupRateLimit();
    
    const record = rateLimitStore.get(key);
    
    if (!record) {
      rateLimitStore.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return next();
    }
    
    if (now - record.firstAttempt > windowMs) {
      // Reset window
      rateLimitStore.set(key, {
        count: 1,
        firstAttempt: now,
      });
      return next();
    }
    
    if (record.count >= max) {
      logger.warn(`Rate limit exceeded for IP: ${key}`);
      return res.status(429).json({
        error: 'Too many MFA verification attempts. Please try again after 15 minutes.',
        retryAfter: 15 * 60,
      });
    }
    
    record.count++;
    next();
  };
};

/**
 * Rate limiter for MFA OTP verification
 * Limits: 5 attempts per 15 minutes per IP
 */
export const mfaVerificationLimiter = createRateLimiter(15 * 60 * 1000, 5);

/**
 * Database-backed rate limiter for MFA verification
 * Tracks attempts per user to prevent brute force
 */
export const mfaUserRateLimiter = async (req, res, next) => {
  try {
    const userId = req.user?.id || req.body?.userId;
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!userId) {
      return next();
    }
    
    // Check attempts in last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    
    const [attempts] = await db.query(`
      SELECT COUNT(*) as count
      FROM mfa_verification_attempts
      WHERE user_id = ? 
        AND attempted_at > ?
        AND success = 0
    `, [userId, fifteenMinutesAgo]);
    
    const attemptCount = attempts[0]?.count || 0;
    
    if (attemptCount >= 5) {
      logger.warn(`MFA user rate limit exceeded for user ID: ${userId}, IP: ${ipAddress}`);
      return res.status(429).json({
        error: 'Too many failed MFA verification attempts. Please try again after 15 minutes.',
        retryAfter: 15 * 60,
      });
    }
    
    // Record the attempt
    await db.query(`
      INSERT INTO mfa_verification_attempts (user_id, ip_address, success)
      VALUES (?, ?, 0)
    `, [userId, ipAddress]);
    
    // Store attempt count in request for logging
    req.mfaAttemptCount = attemptCount + 1;
    
    next();
  } catch (error) {
    logger.error('Error in MFA user rate limiter:', error);
    // Don't block on rate limiter errors, just log
    next();
  }
};

/**
 * Record successful MFA verification
 */
export const recordMfaSuccess = async (userId, ipAddress) => {
  try {
    await db.query(`
      INSERT INTO mfa_verification_attempts (user_id, ip_address, success)
      VALUES (?, ?, 1)
    `, [userId, ipAddress]);
  } catch (error) {
    logger.error('Error recording MFA success:', error);
  }
};

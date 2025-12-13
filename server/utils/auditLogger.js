import { db } from '../config/database.js';
import { logger } from './logger.js';

/**
 * Advanced Audit Logger Utility
 * Captures comprehensive audit trail with before/after data, IP, user agent, etc.
 */

/**
 * Create an audit log entry
 * @param {Object} options - Audit log options
 * @param {number} options.userId - User ID performing the action
 * @param {string} options.action - Action type (CREATE, UPDATE, DELETE, VIEW, EXPORT, etc.)
 * @param {string} options.module - Module name (Users, Projects, Tasks, etc.)
 * @param {number} options.itemId - ID of the item being acted upon
 * @param {string} options.itemType - Type of item (optional, for clarity)
 * @param {Object} options.beforeData - Data before the change (for UPDATE/DELETE)
 * @param {Object} options.afterData - Data after the change (for CREATE/UPDATE)
 * @param {string} options.ipAddress - IP address of the user
 * @param {string} options.userAgent - User agent string
 * @param {Object} options.metadata - Additional metadata (optional)
 * @returns {Promise<number>} - ID of the created audit log entry
 */
export async function createAuditLog({
  userId,
  action,
  module,
  itemId = null,
  itemType = null,
  beforeData = null,
  afterData = null,
  ipAddress = null,
  userAgent = null,
  metadata = null
}) {
  try {
    // Prepare JSON data
    const beforeDataJson = beforeData ? JSON.stringify(beforeData) : null;
    const afterDataJson = afterData ? JSON.stringify(afterData) : null;
    const metadataJson = metadata ? JSON.stringify(metadata) : null;

    const [result] = await db.query(`
      INSERT INTO audit_logs (
        user_id,
        action,
        module,
        item_id,
        item_type,
        before_data,
        after_data,
        ip_address,
        user_agent,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
    `, [
      userId,
      action,
      module,
      itemId,
      itemType,
      beforeDataJson,
      afterDataJson,
      ipAddress,
      userAgent
    ]);

    // If metadata exists, we can store it in a separate field or extend the schema
    // For now, we'll log it separately if needed
    
    return result.insertId;
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // Don't throw - audit logging should not break the main flow
    return null;
  }
}

/**
 * Helper function to extract IP address from request
 * Handles IPv6 loopback (::1) and proxy headers properly
 * @param {Object} req - Express request object
 * @returns {string} - IP address
 */
export function getClientIp(req) {
  // Priority order: X-Forwarded-For (first IP), X-Real-IP, then direct connection
  // X-Forwarded-For can contain multiple IPs (client, proxy1, proxy2), take the first one
  const forwardedFor = req.headers['x-forwarded-for'];
  if (forwardedFor) {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp && firstIp !== '::1') {
      return firstIp;
    }
  }
  
  // Check X-Real-IP header (commonly used by nginx)
  const realIp = req.headers['x-real-ip'];
  if (realIp && realIp !== '::1') {
    return realIp;
  }
  
  // Get IP from Express (requires trust proxy to be set)
  let ip = req.ip || 
           req.connection?.remoteAddress || 
           req.socket?.remoteAddress ||
           (req.connection?.socket ? req.connection.socket.remoteAddress : null);
  
  // Normalize IPv6 loopback to IPv4 for consistency
  if (ip === '::1' || ip === '::ffff:127.0.0.1') {
    return '127.0.0.1';
  }
  
  // Remove IPv6 prefix if present (::ffff:)
  if (ip && ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '');
  }
  
  return ip || 'unknown';
}

/**
 * Helper function to get user agent from request
 * @param {Object} req - Express request object
 * @returns {string} - User agent string
 */
export function getUserAgent(req) {
  return req.headers['user-agent'] || 'unknown';
}

/**
 * Middleware to automatically log audit events
 * Use this as a middleware after your route handler
 */
export function auditLogMiddleware(options = {}) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json method to capture response
    res.json = function(data) {
      // Log audit if user is authenticated and action is specified
      if (req.user && options.action) {
        const userId = req.user.id;
        const module = options.module || req.route?.path || 'Unknown';
        const itemId = options.getItemId ? options.getItemId(req, data) : req.params?.id;
        
        // Determine before/after data based on action
        let beforeData = null;
        let afterData = null;
        
        if (options.action === 'UPDATE' && req.body) {
          beforeData = options.getBeforeData ? options.getBeforeData(req) : null;
          afterData = data?.data || req.body;
        } else if (options.action === 'CREATE') {
          afterData = data?.data || req.body;
        } else if (options.action === 'DELETE') {
          beforeData = options.getBeforeData ? options.getBeforeData(req) : null;
        }
        
        // Create audit log asynchronously (don't wait)
        createAuditLog({
          userId,
          action: options.action,
          module,
          itemId: itemId ? parseInt(itemId) : null,
          itemType: options.itemType,
          beforeData,
          afterData,
          ipAddress: getClientIp(req),
          userAgent: getUserAgent(req),
          metadata: options.metadata ? options.metadata(req, data) : null
        }).catch(err => logger.error('Audit log error:', err));
      }
      
      // Call original json method
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Helper to create audit log for CREATE action
 */
export async function logCreate(req, module, itemId, itemData, itemType = null) {
  const userId = req.user?.id;
  if (!userId) return null;
  
  return await createAuditLog({
    userId,
    action: 'CREATE',
    module,
    itemId,
    itemType,
    afterData: itemData,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
}

/**
 * Helper to create audit log for UPDATE action
 */
export async function logUpdate(req, module, itemId, beforeData, afterData, itemType = null) {
  const userId = req.user?.id;
  if (!userId) return null;
  
  return await createAuditLog({
    userId,
    action: 'UPDATE',
    module,
    itemId,
    itemType,
    beforeData,
    afterData,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
}

/**
 * Helper to create audit log for DELETE action
 */
export async function logDelete(req, module, itemId, beforeData, itemType = null) {
  const userId = req.user?.id;
  if (!userId) return null;
  
  return await createAuditLog({
    userId,
    action: 'DELETE',
    module,
    itemId,
    itemType,
    beforeData,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
}

/**
 * Helper to create audit log for VIEW action
 */
export async function logView(req, module, itemId = null, itemType = null) {
  const userId = req.user?.id;
  if (!userId) return null;
  
  return await createAuditLog({
    userId,
    action: 'VIEW',
    module,
    itemId,
    itemType,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
}

/**
 * Helper to create audit log for EXPORT action
 */
export async function logExport(req, module, itemId = null, itemType = null, metadata = null) {
  const userId = req.user?.id;
  if (!userId) return null;
  
  return await createAuditLog({
    userId,
    action: 'EXPORT',
    module,
    itemId,
    itemType,
    metadata,
    ipAddress: getClientIp(req),
    userAgent: getUserAgent(req)
  });
}

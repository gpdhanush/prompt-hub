import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { verifyAccessToken } from '../utils/jwt.js';

// Authentication middleware - verifies user is logged in using JWT access token
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Authentication required. Please login.',
        code: 'NO_TOKEN'
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify JWT access token
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (error) {
      if (error.message === 'Access token expired') {
        return res.status(401).json({ 
          error: 'Access token expired. Please refresh your token.',
          code: 'TOKEN_EXPIRED'
        });
      }
      logger.warn('Invalid access token:', error.message);
      return res.status(401).json({ 
        error: 'Invalid or expired token. Please login again.',
        code: 'INVALID_TOKEN'
      });
    }
    
    // Get user from database
    const userId = decoded.userId || decoded.id;
    if (!userId) {
      return res.status(401).json({ 
        error: 'Invalid token payload. Please login again.',
        code: 'INVALID_TOKEN_PAYLOAD'
      });
    }
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.status = 'Active'
    `, [userId]);
    
    if (users.length === 0) {
      logger.warn('User not found or inactive for ID:', userId);
      return res.status(401).json({ 
        error: 'Invalid token. User not found or inactive.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = users[0];
    
    // Check if user is active (for client activation/deactivation)
    if (user.is_active === 0 || user.is_active === false) {
      logger.warn(`Access attempt for inactive user: ${userId}`);
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Check session version for single-device login
    // If token has sessionVersion, it must match the user's current session_version
    const tokenSessionVersion = decoded.sessionVersion;
    const userSessionVersion = user.session_version || 0;
    
    if (tokenSessionVersion !== undefined && tokenSessionVersion !== userSessionVersion) {
      logger.warn(`Session version mismatch for user ${userId}. Token version: ${tokenSessionVersion}, Current version: ${userSessionVersion}`);
      return res.status(401).json({ 
        error: 'Your session has been invalidated. Please login again.',
        code: 'SESSION_INVALIDATED'
      });
    }
    
    // Check token version for force logout on deactivation
    const tokenTokenVersion = decoded.tokenVersion;
    const userTokenVersion = user.token_version || 0;
    
    if (tokenTokenVersion !== undefined && tokenTokenVersion !== userTokenVersion) {
      logger.warn(`Token version mismatch for user ${userId}. Token version: ${tokenTokenVersion}, Current version: ${userTokenVersion}`);
      return res.status(401).json({ 
        error: 'Your session has been invalidated. Please login again.',
        code: 'SESSION_INVALIDATED'
      });
    }
    
    req.user = user;
    // Only log authentication in development mode to reduce log noise
    if (process.env.NODE_ENV === 'development') {
      logger.debug('Authenticated user:', req.user.name, 'Role:', req.user.role);
    }
    return next();
  } catch (error) {
    logger.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication error: ' + error.message,
      code: 'AUTH_ERROR'
    });
  }
};

// Authorization middleware - checks if user has required role
export const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    
    if (!allowedRoles.includes(userRole)) {
      return res.status(403).json({ 
        error: `Access denied. Required role: ${allowedRoles.join(' or ')}. Your role: ${userRole}` 
      });
    }
    
    next();
  };
};

// Check if user is admin or super admin
export const requireAdmin = authorize('Admin', 'Super Admin');

// Check if user can manage users (Admin, Super Admin, Team Leader, or Manager)
export const canManageUsers = authorize('Admin', 'Super Admin', 'Team Leader', 'Team Lead', 'Manager');

// Check if user is Super Admin (for creating other Super Admins)
export const requireSuperAdmin = authorize('Super Admin');

// Check if user can access user/employee management (Admin, Super Admin, Team Leader, or Manager)
export const canAccessUserManagement = authorize('Admin', 'Super Admin', 'Team Leader', 'Team Lead', 'Manager');

// Permission-based authorization middleware - checks if user has required permission
export const requirePermission = (...permissionCodes) => {
  return async (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Super Admin always has all permissions
    if (userRole === 'Super Admin') {
      return next();
    }
    
    try {
      // Get user's role_id
      const [users] = await db.query(`
        SELECT role_id FROM users WHERE id = ?
      `, [userId]);
      
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const roleId = users[0].role_id;
      
      // Check if user has any of the required permissions
      const placeholders = permissionCodes.map(() => '?').join(',');
      const [permissions] = await db.query(`
        SELECT COUNT(*) as count
        FROM permissions p
        INNER JOIN role_permissions rp ON p.id = rp.permission_id
        WHERE rp.role_id = ? 
        AND rp.allowed = TRUE
        AND p.code IN (${placeholders})
      `, [roleId, ...permissionCodes]);
      
      if (permissions[0].count === 0) {
        return res.status(403).json({ 
          error: `Access denied. Required permission: ${permissionCodes.join(' or ')}` 
        });
      }
      
      next();
    } catch (error) {
      logger.error('Error checking permissions:', error);
      return res.status(500).json({ error: 'Error checking permissions' });
    }
  };
};

/**
 * Project-level access control middleware for CLIENT users
 * Checks that:
 * - users.is_active = 1
 * - projects.is_active = 1
 * - project_users.is_active = 1
 * If any fail, returns 403 Forbidden
 */
export const requireProjectAccess = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const userRole = req.user.role;
    const userId = req.user.id;
    
    // Only apply to CLIENT users
    if (userRole !== 'CLIENT') {
      return next();
    }
    
    // Get project ID from params (could be id or uuid)
    const projectId = req.params.id || req.params.projectId;
    if (!projectId) {
      return res.status(400).json({ error: 'Project ID is required' });
    }
    
    // Check if projectId is UUID or numeric ID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(projectId);
    
    let projectQuery;
    if (isUUID) {
      projectQuery = `
        SELECT p.id, p.is_active, pu.is_active as project_user_active, u.is_active as user_active
        FROM projects p
        INNER JOIN project_users pu ON p.id = pu.project_id
        INNER JOIN users u ON pu.user_id = u.id
        WHERE p.uuid = ? AND pu.user_id = ?
      `;
    } else {
      projectQuery = `
        SELECT p.id, p.is_active, pu.is_active as project_user_active, u.is_active as user_active
        FROM projects p
        INNER JOIN project_users pu ON p.id = pu.project_id
        INNER JOIN users u ON pu.user_id = u.id
        WHERE p.id = ? AND pu.user_id = ?
      `;
    }
    
    const [projects] = await db.query(projectQuery, [projectId, userId]);
    
    if (projects.length === 0) {
      return res.status(403).json({ 
        error: 'Access denied. You do not have access to this project.',
        code: 'PROJECT_ACCESS_DENIED'
      });
    }
    
    const project = projects[0];
    
    // Check all three is_active flags
    if (project.is_active === 0 || project.is_active === false) {
      return res.status(403).json({ 
        error: 'Access denied. This project is inactive.',
        code: 'PROJECT_INACTIVE'
      });
    }
    
    if (project.project_user_active === 0 || project.project_user_active === false) {
      return res.status(403).json({ 
        error: 'Access denied. Your access to this project has been revoked.',
        code: 'PROJECT_USER_INACTIVE'
      });
    }
    
    if (project.user_active === 0 || project.user_active === false) {
      return res.status(403).json({ 
        error: 'Your account has been deactivated. Please contact administrator.',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }
    
    // Store project ID in request for use in route handlers
    req.projectId = project.id;
    
    next();
  } catch (error) {
    logger.error('Error checking project access:', error);
    return res.status(500).json({ error: 'Error checking project access' });
  }
};

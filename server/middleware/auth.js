import { db } from '../config/database.js';

// Authentication middleware - verifies user is logged in
export const authenticate = async (req, res, next) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required. Please login.' });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // For now, we'll use a simple token check
    // In production, verify JWT token here
    if (token === 'mock-jwt-token') {
      // Get user ID from header (sent by frontend)
      const userId = req.headers['user-id'];
      
      if (!userId) {
        console.log('No user-id header found in request');
        return res.status(401).json({ error: 'User ID not provided. Please login again.' });
      }
      
      console.log('Authenticating user ID:', userId);
      
      const [users] = await db.query(`
        SELECT u.*, r.name as role
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ?
      `, [userId]);
      
      if (users.length === 0) {
        console.log('User not found for ID:', userId);
        return res.status(401).json({ error: 'Invalid token. User not found.' });
      }
      
      req.user = users[0];
      console.log('Authenticated user:', req.user.name, 'Role:', req.user.role);
      return next();
    }
    
    // TODO: Verify JWT token in production
    // For now, reject if not mock token
    return res.status(401).json({ error: 'Invalid or expired token. Please login again.' });
  } catch (error) {
    return res.status(500).json({ error: 'Authentication error: ' + error.message });
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

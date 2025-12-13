import express from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.debug('Login attempt for email:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, [email]);
    
    if (users.length === 0) {
      logger.warn('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    logger.debug('User found:', user.email, 'Role:', user.role);
    
    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.default.compare(password, user.password_hash);
    
    logger.debug('Password valid:', isValid);
    
    if (!isValid) {
      logger.warn('Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Check MFA requirements
    const [mfaSettings] = await db.query(`
      SELECT mfa_required, enforced_by_admin
      FROM mfa_role_settings
      WHERE role_id = ?
    `, [user.role_id]);
    
    const mfaRequired = mfaSettings.length > 0 && mfaSettings[0].mfa_required === 1;
    const mfaEnabled = user.mfa_enabled === 1;
    
    // If MFA is required but not enabled, force setup
    if (mfaRequired && !mfaEnabled) {
      return res.status(403).json({
        error: 'MFA is required for your role. Please set up MFA first.',
        requiresMfaSetup: true,
        userId: user.id,
      });
    }
    
    // If MFA is enabled, require verification
    if (mfaEnabled) {
      // Generate temporary session token for MFA verification
      const sessionToken = `mfa-session-${user.id}-${Date.now()}`;
      
      // Store session token temporarily (in production, use Redis or similar)
      // For now, we'll return it and verify it in the MFA route
      
      return res.json({
        requiresMfa: true,
        userId: user.id,
        sessionToken,
        message: 'MFA verification required',
      });
    }
    
    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    
    // In production, generate JWT token here
    const token = 'mock-jwt-token'; // Replace with actual JWT
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // In production, verify JWT token from headers
    const userId = req.headers['user-id'] || 1; // Mock for now
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: users[0] });
  } catch (error) {
    logger.error('Error getting current user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update current user's profile
router.put('/me/profile', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    const { name, email, mobile, password, oldPassword, session_timeout } = req.body;
    
    // If password is being updated, validate old password first
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required to change password' });
      }
      
      // Get current user's password hash
      const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verify old password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.default.compare(oldPassword, users[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }
    }
    
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (mobile !== undefined) {
      updates.push('mobile = ?');
      params.push(mobile);
    }
    if (password) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }
    if (session_timeout !== undefined) {
      // Validate session timeout (1-1440 minutes)
      const timeout = parseInt(session_timeout);
      if (isNaN(timeout) || timeout < 1 || timeout > 1440) {
        return res.status(400).json({ error: 'Session timeout must be between 1 and 1440 minutes' });
      }
      updates.push('session_timeout = ?');
      params.push(timeout);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(userId);
    
    await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);
    
    const [updatedUser] = await db.query(`
      SELECT 
        u.*,
        r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    res.json({ data: updatedUser[0] });
  } catch (error) {
    logger.error('Error updating user profile:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get current user's permissions
router.get('/me/permissions', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    // Get user's role
    const [users] = await db.query(`
      SELECT u.role_id, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const roleId = user.role_id;
    
    // Super Admin has all permissions
    if (user.role === 'Super Admin') {
      const [allPermissions] = await db.query(`
        SELECT code FROM permissions
      `);
      return res.json({ 
        data: allPermissions.map((p) => p.code) 
      });
    }
    
    // Get permissions for the user's role
    const [permissions] = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND rp.allowed = TRUE
    `, [roleId]);
    
    res.json({ 
      data: permissions.map((p) => p.code) 
    });
  } catch (error) {
    logger.error('Error getting user permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { storeRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../utils/refreshTokenService.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import crypto from 'crypto';

const router = express.Router();

// Login with JWT Access + Refresh Tokens
router.post('/login', validate(schemas.login), async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.debug('Login attempt for email:', email);
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ? AND u.status = 'Active'
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
      
      return res.json({
        requiresMfa: true,
        userId: user.id,
        sessionToken,
        message: 'MFA verification required',
      });
    }
    
    // Revoke all previous refresh tokens for single-device login
    await revokeAllUserTokens(user.id);
    logger.info(`Revoked all previous tokens for user ${user.id} (single-device login)`);
    
    // Update last login and increment session version (for single-device login)
    await db.query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP,
          session_version = COALESCE(session_version, 0) + 1
      WHERE id = ?
    `, [user.id]);
    
    // Get updated session version
    const [updatedUsers] = await db.query('SELECT session_version FROM users WHERE id = ?', [user.id]);
    const sessionVersion = updatedUsers[0]?.session_version || 1;
    
    // Generate JWT tokens
    // Access token: 15 minutes (configurable via user's session_timeout or default)
    const accessTokenExpiry = user.session_timeout || 15;
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      roleId: user.role_id,
      sessionVersion // Include session version for single-device validation
    }, accessTokenExpiry);
    
    // Refresh token: 30 days
    const { token: refreshToken, tokenId } = generateRefreshToken(user.id, 30);
    
    // Hash refresh token before storing
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    
    // Calculate expiration date (30 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);
    
    // Store refresh token in database
    const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await storeRefreshToken(
      user.id,
      tokenId,
      refreshTokenHash,
      expiresAt,
      ipAddress,
      userAgent
    );
    
    logger.info(`User ${user.email} logged in successfully`);
    
    res.json({
      token: accessToken, // Backward compatibility
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      },
      expiresIn: accessTokenExpiry * 60 // seconds
    });
  } catch (error) {
    logger.error('Login error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Refresh Access Token using Refresh Token
router.post('/refresh', validate(schemas.refreshToken), async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error.message === 'Refresh token expired') {
        return res.status(401).json({ 
          error: 'Refresh token expired. Please login again.',
          code: 'REFRESH_TOKEN_EXPIRED'
        });
      }
      return res.status(401).json({ 
        error: 'Invalid refresh token.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Check if token exists in database and is not revoked
    const tokenRecord = await findRefreshToken(decoded.tokenId);
    if (!tokenRecord) {
      return res.status(401).json({ 
        error: 'Refresh token not found or revoked.',
        code: 'TOKEN_REVOKED'
      });
    }
    
    // Verify token hash matches
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    if (tokenRecord.token_hash !== tokenHash) {
      logger.warn('Token hash mismatch for token ID:', decoded.tokenId);
      return res.status(401).json({ 
        error: 'Invalid refresh token.',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
    
    // Get user from database
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.status = 'Active'
    `, [decoded.userId]);
    
    if (users.length === 0) {
      return res.status(401).json({ 
        error: 'User not found or inactive.',
        code: 'USER_NOT_FOUND'
      });
    }
    
    const user = users[0];
    
    // Check session version for single-device login
    // If refresh token was issued before a new login, the session version won't match
    const tokenSessionVersion = decoded.sessionVersion;
    const userSessionVersion = user.session_version || 0;
    
    // Note: Old refresh tokens won't have sessionVersion, so we allow them
    // But if they do have it and it doesn't match, reject
    if (tokenSessionVersion !== undefined && tokenSessionVersion !== userSessionVersion) {
      logger.warn(`Session version mismatch during token refresh for user ${user.id}. Token version: ${tokenSessionVersion}, Current version: ${userSessionVersion}`);
      return res.status(401).json({ 
        error: 'Your session has been invalidated. Please login again.',
        code: 'SESSION_INVALIDATED'
      });
    }
    
    // Generate new access token with current session version
    const accessTokenExpiry = user.session_timeout || 15;
    const accessToken = generateAccessToken({
      userId: user.id,
      email: user.email,
      role: user.role,
      roleId: user.role_id,
      sessionVersion: userSessionVersion // Include current session version
    }, accessTokenExpiry);
    
    logger.debug(`Access token refreshed for user ${user.email}`);
    
    res.json({
      accessToken,
      expiresIn: accessTokenExpiry * 60 // seconds
    });
  } catch (error) {
    logger.error('Refresh token error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout - Revoke refresh token
router.post('/logout', authenticate, async (req, res) => {
  try {
    const refreshToken = req.body.refreshToken;
    
    if (refreshToken) {
      try {
        const decoded = verifyRefreshToken(refreshToken);
        await revokeRefreshToken(decoded.tokenId);
        logger.info(`Refresh token revoked for user ${req.user.id}`);
      } catch (error) {
        // Token might be invalid, but we still want to logout
        logger.debug('Error revoking refresh token:', error.message);
      }
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    logger.error('Logout error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Logout from all devices - Revoke all refresh tokens
router.post('/logout-all', authenticate, async (req, res) => {
  try {
    const count = await revokeAllUserTokens(req.user.id);
    logger.info(`All refresh tokens revoked for user ${req.user.id} (${count} tokens)`);
    
    res.json({ 
      message: 'Logged out from all devices successfully',
      tokensRevoked: count
    });
  } catch (error) {
    logger.error('Logout all error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user (requires authentication)
router.get('/me', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [users] = await db.query(`
      SELECT 
        u.*, 
        r.name as role,
        r.level as role_level,
        e.id as employee_id,
        e.profile_photo_url,
        e.emp_code
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    // Structure response with employee data nested
    const response = {
      ...user,
      employee: user.employee_id ? {
        id: user.employee_id,
        profile_photo_url: user.profile_photo_url,
        emp_code: user.emp_code
      } : null
    };
    
    // Remove sensitive fields
    delete response.password_hash;
    delete response.mfa_secret;
    delete response.employee_id;
    delete response.profile_photo_url;
    delete response.emp_code;
    
    res.json({ data: response });
  } catch (error) {
    logger.error('Error getting current user:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update current user's profile
router.put('/me/profile', authenticate, validate(schemas.updateProfile), async (req, res) => {
  try {
    const userId = req.user.id;
    
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
router.get('/me/permissions', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
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

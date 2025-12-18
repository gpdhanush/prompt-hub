import express from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { storeRefreshToken, findRefreshToken, revokeRefreshToken, revokeAllUserTokens } from '../utils/refreshTokenService.js';
import { validate, schemas } from '../middleware/validation.js';
import { authenticate } from '../middleware/auth.js';
import { sendPasswordResetOTP } from '../utils/emailService.js';
import crypto from 'crypto';

const router = express.Router();

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: User login
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 refreshToken:
 *                   type: string
 *                 user:
 *                   type: object
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/refresh:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 accessToken:
 *                   type: string
 *                 expiresIn:
 *                   type: number
 *                   description: Expiration time in seconds
 *       401:
 *         description: Invalid or expired refresh token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
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

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (revoke refresh token)
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               refreshToken:
 *                 type: string
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 */
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

/**
 * @swagger
 * /api/auth/logout-all:
 *   post:
 *     summary: Logout from all devices
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logged out from all devices
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 tokensRevoked:
 *                   type: number
 */
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

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 */
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

/**
 * @swagger
 * /api/auth/me/profile:
 *   put:
 *     summary: Update current user profile
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               email:
 *                 type: string
 *                 format: email
 *               mobile:
 *                 type: string
 *               password:
 *                 type: string
 *                 format: password
 *               oldPassword:
 *                 type: string
 *                 format: password
 *               session_timeout:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 1440
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *       400:
 *         description: Invalid input
 */
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

/**
 * @swagger
 * /api/auth/me/permissions:
 *   get:
 *     summary: Get current user permissions
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User permissions list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: string
 */
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

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     summary: Request password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *     responses:
 *       200:
 *         description: OTP sent if email exists
 *       403:
 *         description: Account is not active
 */
// Forgot Password - Send OTP
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const [users] = await db.query(`
      SELECT id, name, email, status
      FROM users
      WHERE email = ?
    `, [email]);

    if (users.length === 0) {
      // Return emailExists flag so frontend can show appropriate message
      return res.json({ 
        message: 'If the email exists, an OTP has been sent to your email address.',
        success: true,
        emailExists: false // Email not found
      });
    }

    const user = users[0];

    // Check if user is active
    if (user.status !== 'Active') {
      return res.status(403).json({ error: 'Account is not active. Please contact administrator.' });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    
    // OTP expires in 10 minutes
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // Invalidate any existing unused OTPs for this user
    await db.query(`
      UPDATE password_reset_otps
      SET used = TRUE
      WHERE user_id = ? AND used = FALSE
    `, [user.id]);

    // Store OTP in database
    await db.query(`
      INSERT INTO password_reset_otps (user_id, email, otp, expires_at)
      VALUES (?, ?, ?, ?)
    `, [user.id, user.email, otp, expiresAt]);

    // Send OTP via email
    try {
      await sendPasswordResetOTP(user.email, otp, user.name);
      logger.info(`Password reset OTP sent to ${user.email}`);
    } catch (emailError) {
      logger.error('Failed to send password reset email:', emailError);
      // Delete the OTP if email failed
      await db.query(`
        DELETE FROM password_reset_otps
        WHERE user_id = ? AND otp = ?
      `, [user.id, otp]);
      return res.status(500).json({ 
        error: 'Failed to send email. Please try again later or contact administrator.' 
      });
    }

    res.json({ 
      message: 'If the email exists, an OTP has been sent to your email address.',
      success: true,
      emailExists: true // Email found and OTP sent
    });
  } catch (error) {
    logger.error('Forgot password error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/verify-otp:
 *   post:
 *     summary: Verify password reset OTP
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               otp:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: OTP verified successfully
 *       400:
 *         description: Invalid or expired OTP
 */
// Verify OTP
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Find valid OTP
    const [otps] = await db.query(`
      SELECT pr.*, u.id as user_id, u.name
      FROM password_reset_otps pr
      INNER JOIN users u ON pr.user_id = u.id
      WHERE pr.email = ? 
        AND pr.otp = ?
        AND pr.used = FALSE
        AND pr.expires_at > NOW()
      ORDER BY pr.created_at DESC
      LIMIT 1
    `, [email, otp]);

    if (otps.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    }

    const otpRecord = otps[0];

    // Mark OTP as used
    await db.query(`
      UPDATE password_reset_otps
      SET used = TRUE
      WHERE id = ?
    `, [otpRecord.id]);

    // Generate a temporary token for password reset (valid for 15 minutes)
    const resetToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiresAt = new Date();
    tokenExpiresAt.setMinutes(tokenExpiresAt.getMinutes() + 15);

    // Store reset token (we'll use the OTP table with a special flag or create a separate token)
    // For simplicity, we'll store it in a session-like way
    await db.query(`
      INSERT INTO password_reset_otps (user_id, email, otp, expires_at, used)
      VALUES (?, ?, ?, ?, FALSE)
    `, [otpRecord.user_id, email, resetToken, tokenExpiresAt]);

    res.json({ 
      success: true,
      resetToken,
      message: 'OTP verified successfully. You can now reset your password.'
    });
  } catch (error) {
    logger.error('Verify OTP error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     summary: Reset password with reset token
 *     tags: [Authentication]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - resetToken
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *               resetToken:
 *                 type: string
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 8
 *     responses:
 *       200:
 *         description: Password reset successfully
 *       400:
 *         description: Invalid token or password requirements not met
 */
// Reset Password
router.post('/reset-password', async (req, res) => {
  try {
    const { email, resetToken, newPassword } = req.body;

    if (!email || !resetToken || !newPassword) {
      return res.status(400).json({ error: 'Email, reset token, and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }

    // Verify reset token
    const [tokens] = await db.query(`
      SELECT pr.*, u.id as user_id
      FROM password_reset_otps pr
      INNER JOIN users u ON pr.user_id = u.id
      WHERE pr.email = ?
        AND pr.otp = ?
        AND pr.used = FALSE
        AND pr.expires_at > NOW()
      ORDER BY pr.created_at DESC
      LIMIT 1
    `, [email, resetToken]);

    if (tokens.length === 0) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    const tokenRecord = tokens[0];

    // Hash new password
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(newPassword, 10);

    // Update user password
    await db.query(`
      UPDATE users
      SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [passwordHash, tokenRecord.user_id]);

    // Mark token as used
    await db.query(`
      UPDATE password_reset_otps
      SET used = TRUE
      WHERE id = ?
    `, [tokenRecord.id]);

    // Invalidate all other unused OTPs for this user
    await db.query(`
      UPDATE password_reset_otps
      SET used = TRUE
      WHERE user_id = ? AND used = FALSE
    `, [tokenRecord.user_id]);

    logger.info(`Password reset successful for user ${tokenRecord.user_id}`);

    res.json({ 
      success: true,
      message: 'Password reset successfully. You can now login with your new password.'
    });
  } catch (error) {
    logger.error('Reset password error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

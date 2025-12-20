import express from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt.js';
import { storeRefreshToken } from '../utils/refreshTokenService.js';
import crypto from 'crypto';

// Dynamic imports for optional packages
let speakeasy, QRCode;

(async () => {
  try {
    speakeasy = (await import('speakeasy')).default;
    QRCode = (await import('qrcode')).default;
  } catch (error) {
    logger.warn('MFA packages not installed. Run: npm install speakeasy qrcode in server directory');
    // Provide fallback implementations
    speakeasy = {
      generateSecret: () => ({ base32: 'MOCK_SECRET', otpauth_url: 'otpauth://totp/Mock?secret=MOCK' }),
      totp: { verify: () => false },
    };
    QRCode = {
      toDataURL: async () => 'data:image/png;base64,mock',
    };
  }
})();

import { authenticate, authorize } from '../middleware/auth.js';
import { createAuditLog } from '../utils/auditLogger.js';

const router = express.Router();

/**
 * Check if MFA is required for a user based on their role
 */
async function isMfaRequired(userId) {
  try {
    const [users] = await db.query(`
      SELECT u.id, u.role_id, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return false;
    }
    
    const user = users[0];
    
    // Check role-based MFA requirement
    const [settings] = await db.query(`
      SELECT mfa_required, enforced_by_admin
      FROM mfa_role_settings
      WHERE role_id = ?
    `, [user.role_id]);
    
    if (settings.length > 0 && settings[0].mfa_required) {
      return true;
    }
    
    return false;
  } catch (error) {
    logger.error('Error checking MFA requirement:', error);
    return false;
  }
}

/**
 * Generate MFA secret and QR code for setup
 * POST /api/mfa/setup
 */
router.post('/setup', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if MFA is already enabled
    const [users] = await db.query(`
      SELECT mfa_enabled, mfa_secret
      FROM users
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    if (user.mfa_enabled && user.mfa_secret) {
      return res.status(400).json({ 
        error: 'MFA is already enabled. Please disable it first to set up a new secret.' 
      });
    }
    
    // Generate secret
    const secret = speakeasy.generateSecret({
      name: `${req.user.email} (Naethra EMS)`,
      issuer: 'Naethra EMS',
      length: 32,
    });
    
    // Generate QR code
    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    
    // Store temporary secret (not enabled yet)
    await db.query(`
      UPDATE users
      SET mfa_secret = ?
      WHERE id = ?
    `, [secret.base32, userId]);
    
    // Generate backup codes
    const backupCodes = Array.from({ length: 10 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    });
    
    await db.query(`
      UPDATE users
      SET mfa_backup_codes = ?
      WHERE id = ?
    `, [JSON.stringify(backupCodes), userId]);
    
    // Log audit
    await createAuditLog({
      userId,
      action: 'CREATE',
      module: 'MFA',
      itemId: userId,
      itemType: 'MFA Setup',
      afterData: { mfa_setup: true },
    });
    
    res.json({
      secret: secret.base32,
      qrCode: qrCodeUrl,
      backupCodes,
      manualEntryKey: secret.base32,
    });
  } catch (error) {
    logger.error('Error setting up MFA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify MFA setup (verify the code to enable MFA)
 * POST /api/mfa/verify-setup
 */
router.post('/verify-setup', authenticate, async (req, res) => {
  try {
    const { code, backupCode } = req.body;
    const userId = req.user.id;
    
    if (!code && !backupCode) {
      return res.status(400).json({ error: 'Verification code or backup code is required' });
    }
    
    // Get user's MFA secret
    const [users] = await db.query(`
      SELECT mfa_secret, mfa_backup_codes
      FROM users
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA secret not found. Please set up MFA first.' });
    }
    
    let isValid = false;
    
    if (backupCode) {
      // Verify backup code
      const backupCodes = user.mfa_backup_codes ? JSON.parse(user.mfa_backup_codes) : [];
      const codeIndex = backupCodes.indexOf(backupCode);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await db.query(`
          UPDATE users
          SET mfa_backup_codes = ?
          WHERE id = ?
        `, [JSON.stringify(backupCodes), userId]);
        isValid = true;
      }
    } else if (code) {
      // Verify TOTP code
      isValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: code,
        window: 2, // Allow 2 time steps (60 seconds) before/after
      });
    }
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Enable MFA
    await db.query(`
      UPDATE users
      SET mfa_enabled = 1,
          mfa_verified_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [userId]);
    
    // Log audit
    await createAuditLog({
      userId,
      action: 'UPDATE',
      module: 'MFA',
      itemId: userId,
      itemType: 'MFA Enabled',
      afterData: { mfa_enabled: true },
    });
    
    res.json({ 
      success: true,
      message: 'MFA has been enabled successfully' 
    });
  } catch (error) {
    logger.error('Error verifying MFA setup:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Verify MFA code during login
 * POST /api/mfa/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { userId, code, backupCode, sessionToken } = req.body;
    
    if (!userId || (!code && !backupCode)) {
      return res.status(400).json({ 
        error: 'User ID and verification code (or backup code) are required' 
      });
    }
    
    // Get user's MFA secret
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    if (!user.mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled for this user' });
    }
    
    if (!user.mfa_secret) {
      return res.status(400).json({ error: 'MFA secret not found' });
    }
    
    let isValid = false;
    
    if (backupCode) {
      // Verify backup code
      const backupCodes = user.mfa_backup_codes ? JSON.parse(user.mfa_backup_codes) : [];
      const codeIndex = backupCodes.indexOf(backupCode);
      
      if (codeIndex !== -1) {
        // Remove used backup code
        backupCodes.splice(codeIndex, 1);
        await db.query(`
          UPDATE users
          SET mfa_backup_codes = ?,
              mfa_verified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [JSON.stringify(backupCodes), userId]);
        isValid = true;
      }
    } else if (code) {
      // Verify TOTP code
      isValid = speakeasy.totp.verify({
        secret: user.mfa_secret,
        encoding: 'base32',
        token: code,
        window: 2,
      });
      
      if (isValid) {
        // Update verified_at timestamp
        await db.query(`
          UPDATE users
          SET mfa_verified_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId]);
      }
    }
    
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Revoke all previous refresh tokens for single-device login
    const { revokeAllUserTokens } = await import('../utils/refreshTokenService.js');
    await revokeAllUserTokens(user.id);
    logger.info(`Revoked all previous tokens for user ${user.id} after MFA verification (single-device login)`);
    
    // Update last login and increment session version (for single-device login)
    await db.query(`
      UPDATE users 
      SET last_login = CURRENT_TIMESTAMP,
          session_version = COALESCE(session_version, 0) + 1
      WHERE id = ?
    `, [userId]);
    
    // Get updated session version
    const [updatedUsers] = await db.query('SELECT session_version FROM users WHERE id = ?', [userId]);
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
    const userAgent = req.headers['user-agent'] || 'unknown';
    
    await storeRefreshToken(
      user.id,
      tokenId,
      refreshTokenHash,
      expiresAt,
      ipAddress,
      userAgent
    );
    
    logger.info(`User ${user.email} logged in successfully after MFA verification`);
    
    res.json({
      success: true,
      token: accessToken, // Backward compatibility
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
      expiresIn: accessTokenExpiry * 60 // seconds
    });
  } catch (error) {
    logger.error('Error verifying MFA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Disable MFA
 * POST /api/mfa/disable
 */
router.post('/disable', authenticate, async (req, res) => {
  try {
    const { password } = req.body;
    const userId = req.user.id;
    
    // Verify password before disabling MFA
    if (password) {
      const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.default.compare(password, users[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ error: 'Invalid password' });
      }
    }
    
    // Disable MFA
    await db.query(`
      UPDATE users
      SET mfa_enabled = 0,
          mfa_secret = NULL,
          mfa_backup_codes = NULL,
          mfa_verified_at = NULL
      WHERE id = ?
    `, [userId]);
    
    // Check if MFA is required for this role
    const mfaRequired = await isMfaRequired(userId);
    if (mfaRequired) {
      return res.status(400).json({ 
        error: 'MFA is required for your role and cannot be disabled. Please contact an administrator.' 
      });
    }
    
    // Log audit
    await createAuditLog({
      userId,
      action: 'UPDATE',
      module: 'MFA',
      itemId: userId,
      itemType: 'MFA Disabled',
      afterData: { mfa_enabled: false },
    });
    
    res.json({ 
      success: true,
      message: 'MFA has been disabled successfully' 
    });
  } catch (error) {
    logger.error('Error disabling MFA:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get MFA status
 * GET /api/mfa/status
 */
router.get('/status', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    const [users] = await db.query(`
      SELECT 
        u.mfa_enabled,
        u.mfa_verified_at,
        r.name as role_name,
        mrs.mfa_required,
        mrs.enforced_by_admin
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN mfa_role_settings mrs ON r.id = mrs.role_id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    
    res.json({
      mfaEnabled: user.mfa_enabled === 1,
      mfaRequired: user.mfa_required === 1,
      enforcedByAdmin: user.enforced_by_admin === 1,
      mfaVerifiedAt: user.mfa_verified_at,
      role: user.role_name,
    });
  } catch (error) {
    logger.error('Error getting MFA status:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Regenerate backup codes
 * POST /api/mfa/regenerate-backup-codes
 */
router.post('/regenerate-backup-codes', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check if MFA is enabled
    const [users] = await db.query(`
      SELECT mfa_enabled
      FROM users
      WHERE id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!users[0].mfa_enabled) {
      return res.status(400).json({ error: 'MFA is not enabled' });
    }
    
    // Generate new backup codes
    const backupCodes = Array.from({ length: 10 }, () => {
      return Math.random().toString(36).substring(2, 10).toUpperCase();
    });
    
    await db.query(`
      UPDATE users
      SET mfa_backup_codes = ?
      WHERE id = ?
    `, [JSON.stringify(backupCodes), userId]);
    
    // Log audit
    await createAuditLog({
      userId,
      action: 'UPDATE',
      module: 'MFA',
      itemId: userId,
      itemType: 'Backup Codes Regenerated',
    });
    
    res.json({ backupCodes });
  } catch (error) {
    logger.error('Error regenerating backup codes:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Get MFA enforcement settings
 * GET /api/mfa/enforcement
 */
router.get('/enforcement', authenticate, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const [settings] = await db.query(`
      SELECT 
        mrs.*,
        r.name as role_name
      FROM mfa_role_settings mrs
      LEFT JOIN roles r ON mrs.role_id = r.id
      ORDER BY r.name
    `);
    
    res.json({ data: settings });
  } catch (error) {
    logger.error('Error getting MFA enforcement settings:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Admin: Update MFA enforcement settings
 * PUT /api/mfa/enforcement/:roleId
 */
router.put('/enforcement/:roleId', authenticate, authorize('Super Admin', 'Admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { mfa_required, enforced_by_admin } = req.body;
    
    await db.query(`
      INSERT INTO mfa_role_settings (role_id, mfa_required, enforced_by_admin)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        mfa_required = VALUES(mfa_required),
        enforced_by_admin = VALUES(enforced_by_admin)
    `, [roleId, mfa_required ? 1 : 0, enforced_by_admin ? 1 : 0]);
    
    // Log audit
    await createAuditLog({
      userId: req.user.id,
      action: 'UPDATE',
      module: 'MFA Settings',
      itemId: parseInt(roleId),
      itemType: 'MFA Enforcement',
      afterData: { mfa_required, enforced_by_admin },
    });
    
    res.json({ 
      success: true,
      message: 'MFA enforcement settings updated successfully' 
    });
  } catch (error) {
    logger.error('Error updating MFA enforcement settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

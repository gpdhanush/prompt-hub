import express from 'express';
import { authenticate } from '../middleware/auth.js';
import {
  registerFCMToken,
  sendNotificationToUser,
  getUserFCMTokens,
  deactivateFCMToken,
} from '../utils/fcmService.js';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Register/Update FCM token
 * POST /api/fcm/register
 */
router.post('/register', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Get device info from request
    const deviceInfo = {
      deviceId: req.body.deviceId || null,
      deviceType: req.body.deviceType || 'web',
      browser: req.body.browser || req.headers['user-agent']?.split(' ')[0] || null,
      platform: req.body.platform || null,
      userAgent: req.headers['user-agent'] || null,
    };

    const result = await registerFCMToken(userId, token, deviceInfo);

    res.json({ 
      success: true, 
      message: result.message,
      data: result 
    });
  } catch (error) {
    logger.error('Error registering FCM token:', error);
    res.status(500).json({ error: error.message || 'Failed to register FCM token' });
  }
});

/**
 * Unregister/Deactivate FCM token
 * POST /api/fcm/unregister
 */
router.post('/unregister', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user.id;

    if (!token) {
      return res.status(400).json({ error: 'FCM token is required' });
    }

    // Verify token belongs to user
    const [tokens] = await db.query(
      'SELECT id FROM fcm_tokens WHERE token = ? AND user_id = ?',
      [token, userId]
    );

    if (tokens.length === 0) {
      return res.status(404).json({ error: 'Token not found' });
    }

    await deactivateFCMToken(token);

    res.json({ success: true, message: 'FCM token unregistered successfully' });
  } catch (error) {
    logger.error('Error unregistering FCM token:', error);
    res.status(500).json({ error: error.message || 'Failed to unregister FCM token' });
  }
});

/**
 * Get user's FCM tokens
 * GET /api/fcm/tokens
 */
router.get('/tokens', async (req, res) => {
  try {
    const userId = req.user.id;
    const tokens = await getUserFCMTokens(userId);
    res.json({ data: tokens });
  } catch (error) {
    logger.error('Error getting FCM tokens:', error);
    res.status(500).json({ error: error.message || 'Failed to get FCM tokens' });
  }
});

/**
 * Send test notification to current user
 * POST /api/fcm/test
 */
router.post('/test', async (req, res) => {
  try {
    const userId = req.user.id;
    const { title, body } = req.body;

    const notification = {
      title: title || 'Test Notification',
      body: body || 'This is a test push notification',
      type: 'test',
      link: '/notifications', // Add link for web push
    };

    const result = await sendNotificationToUser(userId, notification);

    res.json({ 
      success: result.success !== false,
      message: result.message || 'Test notification sent',
      data: result 
    });
  } catch (error) {
    logger.error('Error sending test notification:', error);
    res.status(500).json({ error: error.message || 'Failed to send test notification' });
  }
});

/**
 * Diagnostic endpoint - Check FCM setup
 * GET /api/fcm/diagnostic
 */
router.get('/diagnostic', async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Check Firebase initialization
    const { initializeFirebase } = await import('../utils/fcmService.js');
    let firebaseStatus = 'unknown';
    try {
      await initializeFirebase();
      firebaseStatus = 'initialized';
    } catch (error) {
      firebaseStatus = `error: ${error.message}`;
    }
    
    // Get user's FCM tokens
    const tokens = await getUserFCMTokens(userId);
    
    // Check service account
    const hasServiceAccount = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    
    res.json({
      firebase: {
        status: firebaseStatus,
        hasServiceAccount,
      },
      tokens: {
        count: tokens.length,
        active: tokens.filter(t => t.is_active).length,
        tokens: tokens.map(t => ({
          id: t.id,
          deviceType: t.device_type,
          browser: t.browser,
          isActive: t.is_active,
          createdAt: t.created_at,
        })),
      },
      user: {
        id: userId,
      },
    });
  } catch (error) {
    logger.error('Error in FCM diagnostic:', error);
    res.status(500).json({ error: error.message || 'Failed to run diagnostic' });
  }
});

export default router;

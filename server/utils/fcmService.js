import admin from 'firebase-admin';
import { db } from '../config/database.js';
import { logger } from './logger.js';

/**
 * Initialize Firebase Admin SDK
 * Make sure to set FIREBASE_SERVICE_ACCOUNT in your .env file
 * The service account should be a JSON string or path to service account file
 */
let firebaseInitialized = false;

export async function initializeFirebase() {
  if (firebaseInitialized) {
    return;
  }

  try {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (!serviceAccount) {
      logger.warn('⚠️  FIREBASE_SERVICE_ACCOUNT not found in environment variables. Push notifications will be disabled.');
      return;
    }

    // Parse service account (can be JSON string or file path)
    let serviceAccountObj;
    try {
      // Try parsing as JSON string first
      serviceAccountObj = JSON.parse(serviceAccount);
    } catch (e) {
      // If not JSON, try as file path
      const fs = await import('fs');
      const path = await import('path');
      const { fileURLToPath } = await import('url');
      
      // Resolve path (handle both relative and absolute paths)
      let serviceAccountPath;
      if (path.isAbsolute(serviceAccount)) {
        serviceAccountPath = serviceAccount;
      } else {
        // Relative to server directory
        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        serviceAccountPath = path.resolve(__dirname, '..', serviceAccount);
      }
      
      if (fs.existsSync(serviceAccountPath)) {
        serviceAccountObj = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        logger.info(`✅ Loaded Firebase service account from: ${serviceAccountPath}`);
      } else {
        throw new Error(`Firebase service account file not found at: ${serviceAccountPath}`);
      }
    }

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountObj),
    });

    firebaseInitialized = true;
    logger.info('✅ Firebase Admin SDK initialized successfully');
  } catch (error) {
    logger.error('❌ Error initializing Firebase Admin SDK:', error.message);
    logger.warn('⚠️  Push notifications will be disabled');
  }
}

/**
 * Send push notification to a single device
 * @param {string} fcmToken - FCM token of the device
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
export async function sendPushNotification(fcmToken, notification, data = {}) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  try {
    const message = {
      token: fcmToken,
      notification: {
        title: notification.title || 'Notification',
        body: notification.body || notification.message || '',
        imageUrl: notification.imageUrl,
      },
      data: {
        ...data,
        type: notification.type || 'general',
        click_action: notification.clickAction || 'FLUTTER_NOTIFICATION_CLICK',
      },
      webpush: {
        notification: {
          title: notification.title || 'Notification',
          body: notification.body || notification.message || '',
          icon: notification.icon || '/favicon.ico',
          badge: notification.badge || '/favicon.ico',
          image: notification.imageUrl,
          sound: 'default',
        },
        fcmOptions: {
          link: notification.link || '/',
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'default',
        },
      },
      apns: {
        payload: {
          aps: {
            sound: 'default',
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    logger.info('✅ Push notification sent successfully');
    return { success: true, messageId: response };
  } catch (error) {
    logger.error('❌ Error sending push notification:', error);
    
    // Handle invalid token
    if (error.code === 'messaging/invalid-registration-token' || 
        error.code === 'messaging/registration-token-not-registered') {
      // Mark token as inactive in database
      await deactivateFCMToken(fcmToken);
    }
    
    throw error;
  }
}

/**
 * Send push notification to multiple devices
 * @param {Array<string>} fcmTokens - Array of FCM tokens
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
export async function sendMulticastNotification(fcmTokens, notification, data = {}) {
  if (!firebaseInitialized) {
    throw new Error('Firebase not initialized');
  }

  if (!fcmTokens || fcmTokens.length === 0) {
    return { success: false, error: 'No tokens provided' };
  }

  try {
    const message = {
      notification: {
        title: notification.title || 'Notification',
        body: notification.body || notification.message || '',
        imageUrl: notification.imageUrl,
      },
      data: {
        ...data,
        type: notification.type || 'general',
      },
      webpush: {
        notification: {
          title: notification.title || 'Notification',
          body: notification.body || notification.message || '',
          icon: notification.icon || '/favicon.ico',
          badge: notification.badge || '/favicon.ico',
          sound: 'default',
        },
        fcmOptions: {
          link: notification.link || '/',
        },
      },
    };

    const response = await admin.messaging().sendEachForMulticast({
      tokens: fcmTokens,
      ...message,
    });

    logger.info(`✅ Sent ${response.successCount} notifications, ${response.failureCount} failed`);

    // Handle invalid tokens
    if (response.failureCount > 0) {
      const invalidTokens = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          if (resp.error?.code === 'messaging/invalid-registration-token' ||
              resp.error?.code === 'messaging/registration-token-not-registered') {
            invalidTokens.push(fcmTokens[idx]);
          }
        }
      });

      if (invalidTokens.length > 0) {
        await deactivateFCMTokens(invalidTokens);
      }
    }

    return {
      success: true,
      successCount: response.successCount,
      failureCount: response.failureCount,
      responses: response.responses,
    };
  } catch (error) {
    logger.error('❌ Error sending multicast notification:', error);
    throw error;
  }
}

/**
 * Send notification to a user (gets all active tokens for the user)
 * @param {number} userId - User ID
 * @param {Object} notification - Notification payload
 * @param {Object} data - Additional data payload
 * @returns {Promise<Object>}
 */
export async function sendNotificationToUser(userId, notification, data = {}) {
  try {
    // Check if Firebase is initialized
    if (!firebaseInitialized) {
      logger.warn('⚠️  Firebase not initialized. Cannot send push notification.');
      return { success: false, message: 'Firebase not initialized' };
    }

    // Get all active FCM tokens for the user
    const [tokens] = await db.query(
      'SELECT token FROM fcm_tokens WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );

    if (tokens.length === 0) {
      logger.warn(`⚠️  No active FCM tokens found for user ${userId}`);
      return { success: false, message: 'No active tokens found' };
    }

    logger.debug(`📤 Sending notification to user ${userId} with ${tokens.length} token(s)`);
    const fcmTokens = tokens.map(t => t.token);
    
    let result;
    if (fcmTokens.length === 1) {
      result = await sendPushNotification(fcmTokens[0], notification, data);
    } else {
      result = await sendMulticastNotification(fcmTokens, notification, data);
    }
    
    logger.info(`✅ Notification sent to user ${userId}:`, result);
    return result;
  } catch (error) {
    logger.error('❌ Error sending notification to user:', error);
    logger.error('Error details:', {
      userId,
      notificationType: notification.type,
      errorCode: error.code,
      errorMessage: error.message,
    });
    throw error;
  }
}

/**
 * Register/Update FCM token for a user
 * @param {number} userId - User ID
 * @param {string} token - FCM token
 * @param {Object} deviceInfo - Device information
 * @returns {Promise<Object>}
 */
export async function registerFCMToken(userId, token, deviceInfo = {}) {
  try {
    // Check if token already exists
    const [existing] = await db.query(
      'SELECT id FROM fcm_tokens WHERE token = ?',
      [token]
    );

    if (existing.length > 0) {
      // Update existing token
      await db.query(
        `UPDATE fcm_tokens 
         SET user_id = ?, device_id = ?, device_type = ?, browser = ?, user_agent = ?, is_active = TRUE, updated_at = CURRENT_TIMESTAMP
         WHERE token = ?`,
        [
          userId,
          deviceInfo.deviceId || null,
          deviceInfo.deviceType || 'web',
          deviceInfo.browser || null,
          deviceInfo.userAgent || null,
          token,
        ]
      );
      logger.info(`✅ FCM token updated for user ${userId}, device: ${deviceInfo.deviceId || 'N/A'}`);
      return { success: true, message: 'Token updated' };
    } else {
      // Insert new token
      await db.query(
        `INSERT INTO fcm_tokens (user_id, device_id, token, device_type, browser, user_agent, is_active)
         VALUES (?, ?, ?, ?, ?, ?, TRUE)`,
        [
          userId,
          deviceInfo.deviceId || null,
          token,
          deviceInfo.deviceType || 'web',
          deviceInfo.browser || null,
          deviceInfo.userAgent || null,
        ]
      );
      logger.info(`✅ FCM token registered for user ${userId}, device: ${deviceInfo.deviceId || 'N/A'}`);
      return { success: true, message: 'Token registered' };
    }
  } catch (error) {
    logger.error('❌ Error registering FCM token:', error);
    throw error;
  }
}

/**
 * Deactivate FCM token
 * @param {string} token - FCM token
 * @returns {Promise<void>}
 */
export async function deactivateFCMToken(token) {
  try {
    await db.query(
      'UPDATE fcm_tokens SET is_active = FALSE WHERE token = ?',
      [token]
    );
  } catch (error) {
    logger.error('❌ Error deactivating FCM token:', error);
  }
}

/**
 * Deactivate multiple FCM tokens
 * @param {Array<string>} tokens - Array of FCM tokens
 * @returns {Promise<void>}
 */
export async function deactivateFCMTokens(tokens) {
  if (tokens.length === 0) return;
  
  try {
    const placeholders = tokens.map(() => '?').join(',');
    await db.query(
      `UPDATE fcm_tokens SET is_active = FALSE WHERE token IN (${placeholders})`,
      tokens
    );
  } catch (error) {
    logger.error('❌ Error deactivating FCM tokens:', error);
  }
}

/**
 * Get all active tokens for a user
 * @param {number} userId - User ID
 * @returns {Promise<Array>}
 */
export async function getUserFCMTokens(userId) {
  try {
    const [tokens] = await db.query(
      'SELECT * FROM fcm_tokens WHERE user_id = ? AND is_active = TRUE',
      [userId]
    );
    return tokens;
  } catch (error) {
    logger.error('❌ Error getting user FCM tokens:', error);
    throw error;
  }
}

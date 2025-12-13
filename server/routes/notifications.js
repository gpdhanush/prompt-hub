import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';
import { sendNotificationToUser } from '../utils/fcmService.js';

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Get notifications for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { is_read } = req.query;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    let query = 'SELECT * FROM notifications WHERE user_id = ?';
    const params = [userId];
    
    if (is_read !== undefined) { 
      query += ' AND is_read = ?'; 
      params.push(is_read === 'true'); 
    }
    
    query += ' ORDER BY created_at DESC';
    const [notifications] = await db.query(query, params);
    
    // Parse payload JSON strings
    const parsedNotifications = notifications.map((notif) => ({
      ...notif,
      payload: notif.payload ? (typeof notif.payload === 'string' ? JSON.parse(notif.payload) : notif.payload) : null,
    }));
    
    res.json({ data: parsedNotifications });
  } catch (error) {
    logger.error('Error fetching notifications:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    // Verify notification belongs to user
    const [notifications] = await db.query('SELECT id FROM notifications WHERE id = ? AND user_id = ?', [id, userId]);
    if (notifications.length === 0) {
      return res.status(404).json({ error: 'Notification not found' });
    }
    
    await db.query('UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE id = ?', [id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    logger.error('Error marking notification as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Mark all notifications as read for current user
router.patch('/read-all', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    await db.query(
      'UPDATE notifications SET is_read = TRUE, read_at = CURRENT_TIMESTAMP WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    res.json({ message: 'All notifications marked as read' });
  } catch (error) {
    logger.error('Error marking all notifications as read:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get unread count for current user
router.get('/unread-count', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
    const [result] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = FALSE',
      [userId]
    );
    
    res.json({ count: result[0].count });
  } catch (error) {
    logger.error('Error getting unread count:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create notification and send push notification
 * POST /api/notifications
 */
router.post('/', async (req, res) => {
  try {
    const { user_id, type, title, message, payload, send_push = true } = req.body;

    if (!user_id || !type || !title || !message) {
      return res.status(400).json({ error: 'user_id, type, title, and message are required' });
    }

    // Create notification in database
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, payload, is_read)
       VALUES (?, ?, ?, ?, ?, FALSE)`,
      [user_id, type, title, message, payload ? JSON.stringify(payload) : null]
    );

    const notificationId = result.insertId;

    // Send push notification if requested
    if (send_push) {
      try {
        await sendNotificationToUser(user_id, {
          title,
          body: message,
          type,
          link: payload?.link || '/notifications',
        }, {
          notificationId: notificationId.toString(),
          type,
          ...payload,
        });
      } catch (pushError) {
        logger.error('Error sending push notification:', pushError);
        // Don't fail the request if push fails
      }
    }

    // Get created notification
    const [notifications] = await db.query('SELECT * FROM notifications WHERE id = ?', [notificationId]);

    res.status(201).json({ data: notifications[0] });
  } catch (error) {
    logger.error('Error creating notification:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

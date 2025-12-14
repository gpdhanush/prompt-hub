import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all reminders for current user
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { date, start_date, end_date } = req.query;

    let query = `
      SELECT *
      FROM calendar_reminders
      WHERE user_id = ?
    `;
    const params = [userId];

    if (date) {
      query += ' AND reminder_date = ?';
      params.push(date);
    } else if (start_date && end_date) {
      query += ' AND reminder_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    query += ' ORDER BY reminder_date ASC, reminder_time ASC';

    const [reminders] = await db.query(query, params);

    res.json({ data: reminders });
  } catch (error) {
    logger.error('Error fetching reminders:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single reminder
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const [reminders] = await db.query(
      'SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (reminders.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    res.json({ data: reminders[0] });
  } catch (error) {
    logger.error('Error fetching reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create reminder
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { title, description, reminder_date, reminder_time, reminder_type } = req.body;

    if (!title || !reminder_date || !reminder_time) {
      return res.status(400).json({ error: 'Title, reminder_date, and reminder_time are required' });
    }

    const [result] = await db.query(
      `INSERT INTO calendar_reminders 
       (user_id, title, description, reminder_date, reminder_time, reminder_type)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, title, description || null, reminder_date, reminder_time, reminder_type || 'other']
    );

    const [newReminder] = await db.query(
      'SELECT * FROM calendar_reminders WHERE id = ?',
      [result.insertId]
    );

    res.status(201).json({ data: newReminder[0] });
  } catch (error) {
    logger.error('Error creating reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update reminder
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const { title, description, reminder_date, reminder_time, reminder_type, is_completed } = req.body;

    // Check if reminder exists and belongs to user
    const [existing] = await db.query(
      'SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const updates = [];
    const params = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (reminder_date !== undefined) {
      updates.push('reminder_date = ?');
      params.push(reminder_date);
    }
    if (reminder_time !== undefined) {
      updates.push('reminder_time = ?');
      params.push(reminder_time);
    }
    if (reminder_type !== undefined) {
      updates.push('reminder_type = ?');
      params.push(reminder_type);
    }
    if (is_completed !== undefined) {
      updates.push('is_completed = ?');
      params.push(is_completed);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(id, userId);

    await db.query(
      `UPDATE calendar_reminders SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    const [updated] = await db.query(
      'SELECT * FROM calendar_reminders WHERE id = ?',
      [id]
    );

    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Error updating reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete reminder
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;

    const [existing] = await db.query(
      'SELECT * FROM calendar_reminders WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    await db.query('DELETE FROM calendar_reminders WHERE id = ? AND user_id = ?', [id, userId]);

    res.json({ message: 'Reminder deleted successfully' });
  } catch (error) {
    logger.error('Error deleting reminder:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

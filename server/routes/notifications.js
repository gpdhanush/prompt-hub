import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { user_id, is_read } = req.query;
    let query = 'SELECT * FROM notifications WHERE 1=1';
    const params = [];
    if (user_id) { query += ' AND user_id = ?'; params.push(user_id); }
    if (is_read !== undefined) { query += ' AND is_read = ?'; params.push(is_read === 'true'); }
    query += ' ORDER BY created_at DESC';
    const [notifications] = await db.query(query, params);
    res.json({ data: notifications });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/:id/read', async (req, res) => {
  try {
    await db.query('UPDATE notifications SET is_read = TRUE WHERE id = ?', [req.params.id]);
    res.json({ message: 'Notification marked as read' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

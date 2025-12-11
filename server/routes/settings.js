import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const [settings] = await db.query('SELECT * FROM settings LIMIT 1');
    res.json({ data: settings[0] || {} });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.patch('/', async (req, res) => {
  try {
    const updates = Object.keys(req.body).map(key => `${key} = ?`).join(', ');
    const values = Object.values(req.body);
    await db.query(`UPDATE settings SET ${updates} WHERE id = 1`);
    const [updated] = await db.query('SELECT * FROM settings WHERE id = 1');
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

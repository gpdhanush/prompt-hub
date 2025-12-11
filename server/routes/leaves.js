import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [leaves] = await db.query('SELECT * FROM leaves ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM leaves');
    res.json({ data: leaves, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, leave_type, start_date, end_date, reason, status } = req.body;
    const [result] = await db.query(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [employee_id, leave_type, start_date, end_date, reason, status || 'Pending']);
    const [newLeave] = await db.query('SELECT * FROM leaves WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newLeave[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { status, approved_by } = req.body;
    await db.query('UPDATE leaves SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, approved_by, req.params.id]);
    const [updated] = await db.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

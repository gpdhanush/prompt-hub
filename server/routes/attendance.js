import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, employee_id, date } = req.query;
    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM attendance WHERE 1=1';
    const params = [];
    if (employee_id) { query += ' AND employee_id = ?'; params.push(employee_id); }
    if (date) { query += ' AND DATE(check_in_time) = ?'; params.push(date); }
    query += ' ORDER BY check_in_time DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [attendance] = await db.query(query, params);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM attendance' + (employee_id || date ? ' WHERE ' + (employee_id ? 'employee_id = ?' : '') + (date ? ' DATE(check_in_time) = ?' : '') : ''), params.slice(0, -2));
    res.json({ data: attendance, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, check_in_time, check_out_time, location } = req.body;
    const [result] = await db.query(`
      INSERT INTO attendance (employee_id, check_in_time, check_out_time, location)
      VALUES (?, ?, ?, ?)
    `, [employee_id, check_in_time, check_out_time, location]);
    const [newAttendance] = await db.query('SELECT * FROM attendance WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newAttendance[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { check_out_time } = req.body;
    await db.query('UPDATE attendance SET check_out_time = ? WHERE id = ?', [check_out_time, req.params.id]);
    const [updated] = await db.query('SELECT * FROM attendance WHERE id = ?', [req.params.id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

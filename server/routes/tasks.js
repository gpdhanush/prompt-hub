import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, project_id } = req.query;
    const offset = (page - 1) * limit;
    let query = `
      SELECT 
        t.*,
        u.name as assigned_to_name,
        u.email as assigned_to_email
      FROM tasks t
      LEFT JOIN users u ON t.assigned_to = u.id
      WHERE 1=1
    `;
    const params = [];
    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [tasks] = await db.query(query, params);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM tasks' + (project_id ? ' WHERE project_id = ?' : ''), project_id ? [project_id] : []);
    res.json({ data: tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [tasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ data: tasks[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task - Team Lead, Employee, and Super Admin
router.post('/', authorize('Team Lead', 'Employee', 'Super Admin'), async (req, res) => {
  try {
    const { project_id, title, description, status, priority, stage, assigned_to, deadline } = req.body;
    const created_by = req.user.id; // Get from authenticated user
    
    // Generate task code
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM tasks');
    const taskCode = String(countResult[0].count + 1).padStart(5, '0');
    const [result] = await db.query(`
      INSERT INTO tasks (project_id, task_code, title, description, status, priority, stage, assigned_to, deadline, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [project_id, taskCode, title, description, status || 'Open', priority || 'Med', stage || 'Analysis', assigned_to, deadline || null, created_by]);
    const [newTask] = await db.query('SELECT * FROM tasks WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newTask[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update task - Team Lead, Employee, and Super Admin
router.put('/:id', authorize('Team Lead', 'Employee', 'Super Admin'), async (req, res) => {
  try {
    const { title, description, status, priority, stage, assigned_to, deadline } = req.body;
    await db.query(`
      UPDATE tasks 
      SET title = ?, description = ?, status = ?, priority = ?, stage = ?, assigned_to = ?, deadline = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [title, description, status, priority, stage, assigned_to, deadline || null, req.params.id]);
    const [updated] = await db.query('SELECT * FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete task - only Team Lead and Super Admin
router.delete('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM tasks WHERE id = ?', [req.params.id]);
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

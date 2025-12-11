import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

router.get('/dashboard', async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [employeeCount] = await db.query('SELECT COUNT(*) as count FROM employees');
    const [projectCount] = await db.query('SELECT COUNT(*) as count FROM projects');
    const [taskCount] = await db.query('SELECT COUNT(*) as count FROM tasks');
    res.json({
      data: {
        users: userCount[0].count,
        employees: employeeCount[0].count,
        projects: projectCount[0].count,
        tasks: taskCount[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

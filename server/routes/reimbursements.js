import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate } from '../utils/auditLogger.js';
import { notifyReimbursementStatusUpdated } from '../utils/notificationService.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const [reimbursements] = await db.query('SELECT * FROM reimbursements ORDER BY created_at DESC LIMIT ? OFFSET ?', [parseInt(limit), parseInt(offset)]);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM reimbursements');
    res.json({ data: reimbursements, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { employee_id, amount, category, description, receipt_url, status } = req.body;
    const [result] = await db.query(`
      INSERT INTO reimbursements (employee_id, amount, category, description, receipt_url, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [employee_id, amount, category, description, receipt_url, status || 'Pending']);
    const [newReimbursement] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [result.insertId]);
    
    // Create audit log for reimbursement creation
    await logCreate(req, 'Reimbursements', result.insertId, {
      id: result.insertId,
      employee_id: employee_id,
      amount: amount,
      category: category,
      status: status || 'Pending'
    }, 'Reimbursement');
    
    res.status(201).json({ data: newReimbursement[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, approved_by } = req.body;
    
    // Get before data for audit log
    const [existing] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    const beforeData = existing[0];
    
    await db.query('UPDATE reimbursements SET status = ?, approved_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, approved_by, id]);
    const [updated] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    
    // Create audit log for reimbursement update
    await logUpdate(req, 'Reimbursements', id, beforeData, updated[0], 'Reimbursement');
    
    // Notify user if reimbursement status is updated
    if (status && status !== beforeData.status) {
      // Get user_id from employee_id
      const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [updated[0].employee_id]);
      if (employees.length > 0) {
        const userId = employees[0].user_id;
        await notifyReimbursementStatusUpdated(
          userId,
          parseInt(id),
          beforeData.status,
          status,
          approved_by || req.user.id,
          updated[0].amount,
          updated[0].category
        );
      }
    }
    
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

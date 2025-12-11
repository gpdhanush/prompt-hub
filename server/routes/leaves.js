import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get leaves - role-based filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    // Super Admin, Admin, and Team Lead can see all leaves
    // Other users can only see their own leaves
    let query = `
      SELECT 
        l.*,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email,
        approver.name as approved_by_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE 1=1
    `;
    const params = [];
    
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Lead') {
      // Get employee_id for current user
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0) {
        return res.json({ data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      const employeeId = employeeData[0].id;
      query += ' AND l.employee_id = ?';
      params.push(employeeId);
    }
    
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [leaves] = await db.query(query, params);
    
    // Count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Lead') {
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0) {
        return res.json({ data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      const employeeId = employeeData[0].id;
      countQuery += ' AND l.employee_id = ?';
      countParams.push(employeeId);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    
    res.json({ 
      data: leaves, 
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: countResult[0].total, 
        totalPages: Math.ceil(countResult[0].total / limit) 
      } 
    });
  } catch (error) {
    console.error('Error fetching leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single leave by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    const [leaves] = await db.query(`
      SELECT 
        l.*,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email,
        approver.name as approved_by_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE l.id = ?
    `, [req.params.id]);
    
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    
    // Check if user can access this leave
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Lead') {
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ data: leave });
  } catch (error) {
    console.error('Error fetching leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create leave - all users can create their own leave
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { leave_type, start_date, end_date, reason } = req.body;
    
    // Get employee_id for current user
    const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employeeData.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' });
    }
    const employeeId = employeeData[0].id;
    
    // Calculate duration
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const [result] = await db.query(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, duration)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?)
    `, [employeeId, leave_type, start_date, end_date, reason, duration]);
    
    const [newLeave] = await db.query(`
      SELECT 
        l.*,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      WHERE l.id = ?
    `, [result.insertId]);
    
    res.status(201).json({ data: newLeave[0] });
  } catch (error) {
    console.error('Error creating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update leave - users can update their own, admins can update any
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const { leave_type, start_date, end_date, reason, status, approved_by, rejection_reason } = req.body;
    
    // Get the leave first
    const [leaves] = await db.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    
    // Check permissions
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Lead') {
      // Regular users can only update their own leaves
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Regular users cannot change status (only admins can approve/reject)
      if (status && status !== leave.status) {
        return res.status(403).json({ error: 'You cannot change leave status' });
      }
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (leave_type !== undefined) {
      updates.push('leave_type = ?');
      params.push(leave_type);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason);
    }
    if (status !== undefined && (userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Lead')) {
      updates.push('status = ?');
      params.push(status);
      
      // If rejecting, require rejection_reason
      if (status === 'Rejected' && !rejection_reason) {
        return res.status(400).json({ error: 'Rejection reason is required when rejecting a leave request' });
      }
      
      // If rejecting, set rejection_reason
      if (status === 'Rejected' && rejection_reason) {
        updates.push('rejection_reason = ?');
        params.push(rejection_reason);
      }
      
      // If approving, clear rejection_reason
      if (status === 'Approved') {
        updates.push('rejection_reason = NULL');
      }
    }
    if (approved_by !== undefined && (userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Lead')) {
      updates.push('approved_by = ?');
      params.push(approved_by);
    }
    
    // Recalculate duration if dates changed
    if (start_date !== undefined || end_date !== undefined) {
      const finalStartDate = start_date ? new Date(start_date) : new Date(leave.start_date);
      const finalEndDate = end_date ? new Date(end_date) : new Date(leave.end_date);
      const duration = Math.ceil((finalEndDate - finalStartDate) / (1000 * 60 * 60 * 24)) + 1;
      updates.push('duration = ?');
      params.push(duration);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(req.params.id);
    
    await db.query(`UPDATE leaves SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [updated] = await db.query(`
      SELECT 
        l.*,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email,
        approver.name as approved_by_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE l.id = ?
    `, [req.params.id]);
    
    res.json({ data: updated[0] });
  } catch (error) {
    console.error('Error updating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete leave - users can delete their own, admins can delete any
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    // Get the leave first
    const [leaves] = await db.query('SELECT * FROM leaves WHERE id = ?', [req.params.id]);
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    
    // Check permissions
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Lead') {
      // Regular users can only delete their own leaves
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    await db.query('DELETE FROM leaves WHERE id = ?', [req.params.id]);
    res.json({ message: 'Leave deleted successfully' });
  } catch (error) {
    console.error('Error deleting leave:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

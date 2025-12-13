import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyTaskAssigned } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, project_id, my_tasks } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    
    let query = `
      SELECT 
        t.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as created_by_name,
        u2.email as created_by_email,
        u3.name as updated_by_name,
        u3.email as updated_by_email,
        dev.name as developer_name,
        dev.email as developer_email,
        des.name as designer_name,
        des.email as designer_email,
        test.name as tester_name,
        test.email as tester_email
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN users u3 ON t.updated_by = u3.id
      LEFT JOIN users dev ON t.developer_id = dev.id
      LEFT JOIN users des ON t.designer_id = des.id
      LEFT JOIN users test ON t.tester_id = test.id
      WHERE 1=1
    `;
    const params = [];
    if (project_id) {
      query += ' AND t.project_id = ?';
      params.push(project_id);
    }
    // Filter by user's tasks (assigned_to, developer_id, designer_id, tester_id, or created_by)
    if (my_tasks && userId) {
      query += ' AND (t.assigned_to = ? OR t.developer_id = ? OR t.designer_id = ? OR t.tester_id = ? OR t.created_by = ?)';
      params.push(userId, userId, userId, userId, userId);
    }
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    const [tasks] = await db.query(query, params);
    
    // Count query
    let countQuery = 'SELECT COUNT(*) as total FROM tasks WHERE 1=1';
    const countParams = [];
    if (project_id) {
      countQuery += ' AND project_id = ?';
      countParams.push(project_id);
    }
    if (my_tasks && userId) {
      countQuery += ' AND (assigned_to = ? OR developer_id = ? OR designer_id = ? OR tester_id = ? OR created_by = ?)';
      countParams.push(userId, userId, userId, userId, userId);
    }
    const [countResult] = await db.query(countQuery, countParams);
    res.json({ data: tasks, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [tasks] = await db.query(`
      SELECT 
        t.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as created_by_name,
        u2.email as created_by_email,
        u3.name as updated_by_name,
        u3.email as updated_by_email,
        dev.name as developer_name,
        dev.email as developer_email,
        des.name as designer_name,
        des.email as designer_email,
        test.name as tester_name,
        test.email as tester_email
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN users u3 ON t.updated_by = u3.id
      LEFT JOIN users dev ON t.developer_id = dev.id
      LEFT JOIN users des ON t.designer_id = des.id
      LEFT JOIN users test ON t.tester_id = test.id
      WHERE t.id = ?
    `, [req.params.id]);
    if (tasks.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ data: tasks[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task - check for tasks.create permission
router.post('/', requirePermission('tasks.create'), async (req, res) => {
  try {
    const { project_id, title, description, status, priority, stage, assigned_to, developer_id, designer_id, tester_id, deadline } = req.body;
    const created_by = req.user.id; // Get from authenticated user
    
    // Generate task code
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM tasks');
    const taskCode = String(countResult[0].count + 1).padStart(5, '0');
    
    // Check if columns exist, if not, use assigned_to only (backward compatibility)
    let query = `
      INSERT INTO tasks (project_id, task_code, title, description, status, priority, stage, assigned_to, deadline, created_by`;
    let values = `VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?`;
    let params = [project_id, taskCode, title, description, status || 'Open', priority || 'Med', stage || 'Analysis', assigned_to || null, deadline || null, created_by];
    
    // Try to add role-specific assignments if columns exist
    try {
      // Check if columns exist by attempting to describe the table
      const [columns] = await db.query('SHOW COLUMNS FROM tasks LIKE "developer_id"');
      if (columns.length > 0) {
        query += `, developer_id, designer_id, tester_id`;
        values += `, ?, ?, ?`;
        params.push(developer_id || null, designer_id || null, tester_id || null);
      }
    } catch (err) {
      // Columns don't exist, use assigned_to only
      logger.debug('Role-specific assignment columns not found, using assigned_to only');
    }
    
    query += `) ${values})`;
    
    const [result] = await db.query(query, params);
    
    // Fetch the created task with all joins
    const [newTask] = await db.query(`
      SELECT 
        t.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as created_by_name,
        u2.email as created_by_email,
        dev.name as developer_name,
        dev.email as developer_email,
        des.name as designer_name,
        des.email as designer_email,
        test.name as tester_name,
        test.email as tester_email
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN users dev ON t.developer_id = dev.id
      LEFT JOIN users des ON t.designer_id = des.id
      LEFT JOIN users test ON t.tester_id = test.id
      WHERE t.id = ?
    `, [result.insertId]);
    
    // Create audit log for task creation
    await logCreate(req, 'Tasks', result.insertId, {
      id: result.insertId,
      task_code: taskCode,
      title: title,
      project_id: project_id,
      status: status || 'Open',
      priority: priority || 'Med',
      stage: stage || 'Analysis'
    }, 'Task');
    
    // Notify assigned users about task assignment
    const assignedUserIds = [];
    if (assigned_to) assignedUserIds.push(parseInt(assigned_to));
    if (developer_id) assignedUserIds.push(parseInt(developer_id));
    if (designer_id) assignedUserIds.push(parseInt(designer_id));
    if (tester_id) assignedUserIds.push(parseInt(tester_id));
    
    // Remove duplicates
    const uniqueUserIds = [...new Set(assignedUserIds.filter(id => id && id !== created_by))];
    
    if (uniqueUserIds.length > 0) {
      const notificationPromises = uniqueUserIds.map(userId => 
        notifyTaskAssigned(userId, result.insertId, title, created_by)
      );
      await Promise.allSettled(notificationPromises);
    }
    
    res.status(201).json({ data: newTask[0] });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update task - check for tasks.edit permission
router.put('/:id', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, status, priority, stage, assigned_to, developer_id, designer_id, tester_id, deadline } = req.body;
    const updated_by = req.user.id;
    
    // Get before data for audit log
    const [existingTasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existingTasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const beforeData = existingTasks[0];
    
    // Check if role-specific columns exist
    let updateQuery = `
      UPDATE tasks 
      SET title = ?, description = ?, status = ?, priority = ?, stage = ?, assigned_to = ?, deadline = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP`;
    let params = [title, description, status, priority, stage, assigned_to || null, deadline || null, updated_by];
    
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM tasks LIKE "developer_id"');
      if (columns.length > 0) {
        updateQuery += `, developer_id = ?, designer_id = ?, tester_id = ?`;
        params.push(developer_id || null, designer_id || null, tester_id || null);
      }
    } catch (err) {
      // Columns don't exist, skip them
      logger.debug('Role-specific assignment columns not found, updating assigned_to only');
    }
    
    updateQuery += ` WHERE id = ?`;
    params.push(id);
    
    await db.query(updateQuery, params);
    
    // Fetch updated task with all joins
    const [updated] = await db.query(`
      SELECT 
        t.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as created_by_name,
        u2.email as created_by_email,
        u3.name as updated_by_name,
        u3.email as updated_by_email,
        dev.name as developer_name,
        dev.email as developer_email,
        des.name as designer_name,
        des.email as designer_email,
        test.name as tester_name,
        test.email as tester_email
      FROM tasks t
      LEFT JOIN users u1 ON t.assigned_to = u1.id
      LEFT JOIN users u2 ON t.created_by = u2.id
      LEFT JOIN users u3 ON t.updated_by = u3.id
      LEFT JOIN users dev ON t.developer_id = dev.id
      LEFT JOIN users des ON t.designer_id = des.id
      LEFT JOIN users test ON t.tester_id = test.id
      WHERE t.id = ?
    `, [id]);
    
    // Create audit log for task update
    await logUpdate(req, 'Tasks', id, beforeData, updated[0], 'Task');
    
    // Notify newly assigned users about task assignment
    const assignedUserIds = [];
    if (assigned_to !== undefined && assigned_to && assigned_to !== beforeData.assigned_to) {
      assignedUserIds.push(parseInt(assigned_to));
    }
    if (developer_id !== undefined && developer_id && developer_id !== beforeData.developer_id) {
      assignedUserIds.push(parseInt(developer_id));
    }
    if (designer_id !== undefined && designer_id && designer_id !== beforeData.designer_id) {
      assignedUserIds.push(parseInt(designer_id));
    }
    if (tester_id !== undefined && tester_id && tester_id !== beforeData.tester_id) {
      assignedUserIds.push(parseInt(tester_id));
    }
    
    // Remove duplicates and current user
    const uniqueUserIds = [...new Set(assignedUserIds.filter(id => id && id !== updated_by))];
    
    if (uniqueUserIds.length > 0) {
      const notificationPromises = uniqueUserIds.map(userId => 
        notifyTaskAssigned(userId, parseInt(id), title || updated[0].title, updated_by)
      );
      await Promise.allSettled(notificationPromises);
    }
    
    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete task - check for tasks.delete permission
router.delete('/:id', requirePermission('tasks.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data for audit log
    const [existingTasks] = await db.query('SELECT * FROM tasks WHERE id = ?', [id]);
    if (existingTasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const beforeData = existingTasks[0];
    
    await db.query('DELETE FROM tasks WHERE id = ?', [id]);
    
    // Create audit log for task deletion
    await logDelete(req, 'Tasks', id, beforeData, 'Task');
    
    res.json({ message: 'Task deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

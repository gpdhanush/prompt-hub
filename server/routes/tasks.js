import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyTaskAssigned } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput, validateAndSanitizeObject } from '../utils/inputValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'tasks');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `task-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/csv'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

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
    
    // Fetch attachments for this task
    const [attachments] = await db.query(`
      SELECT 
        a.id,
        a.uploaded_by,
        a.path,
        a.original_filename,
        a.mime_type,
        a.size,
        a.created_at,
        u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `, [req.params.id]);
    
    const taskData = tasks[0];
    taskData.attachments = attachments;
    
    res.json({ data: taskData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create task - check for tasks.create permission
router.post('/', requirePermission('tasks.create'), upload.array('attachments', 10), async (req, res) => {
  try {
    // Validate and sanitize text inputs
    const textFields = ['title', 'description'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let { project_id, title, description, status, priority, stage, assigned_to, developer_id, designer_id, tester_id, deadline } = req.body;
    title = validation.data.title || title;
    description = validation.data.description || description;
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
    
    // Handle file uploads
    if (req.files && req.files.length > 0) {
      const uploadedFiles = [];
      for (const file of req.files) {
        const filePath = `/uploads/tasks/${file.filename}`;
        const [attachmentResult] = await db.query(`
          INSERT INTO attachments (
            task_id, uploaded_by, path, original_filename, mime_type, size
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `, [result.insertId, created_by, filePath, file.originalname, file.mimetype, file.size]);
        
        uploadedFiles.push({
          id: attachmentResult.insertId,
          path: filePath,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          size: file.size
        });
      }
      newTask[0].attachments = uploadedFiles;
    }
    
    res.status(201).json({ data: newTask[0] });
  } catch (error) {
    logger.error('Error creating task:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update task - check for tasks.edit permission
router.put('/:id', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Validate and sanitize text inputs
    const textFields = ['title', 'description'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let { title, description, status, priority, stage, assigned_to, developer_id, designer_id, tester_id, deadline } = req.body;
    title = validation.data.title || title;
    description = validation.data.description || description;
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
    
    // Record task history if status changed
    if (status !== undefined && status !== beforeData.status) {
      try {
        await db.query(`
          INSERT INTO task_history (task_id, from_status, to_status, changed_by, note)
          VALUES (?, ?, ?, ?, ?)
        `, [id, beforeData.status || 'N/A', status, updated_by, `Status changed from ${beforeData.status || 'N/A'} to ${status}`]);
      } catch (historyError) {
        logger.error('Error recording task history:', historyError);
        // Don't fail the update if history recording fails
      }
    }
    
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

// ============================================
// TASK COMMENTS ROUTES
// ============================================

// Get task comments
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [comments] = await db.query(`
      SELECT 
        tc.*,
        u.name as user_name,
        u.email as user_email,
        r.name as user_role
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE tc.task_id = ?
      ORDER BY tc.created_at ASC
    `, [id]);
    
    res.json({ data: comments });
  } catch (error) {
    logger.error('Error fetching task comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create task comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, parent_comment_id, role } = req.body;
    const userId = req.user?.id;
    
    if (!comment || comment.trim() === '') {
      return res.status(400).json({ error: 'Comment is required' });
    }
    
    const [result] = await db.query(`
      INSERT INTO task_comments (task_id, user_id, comment, parent_comment_id, role)
      VALUES (?, ?, ?, ?, ?)
    `, [id, userId, comment.trim(), parent_comment_id || null, role || null]);
    
    const [newComment] = await db.query(`
      SELECT 
        tc.*,
        u.name as user_name,
        u.email as user_email,
        r.name as user_role
      FROM task_comments tc
      LEFT JOIN users u ON tc.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE tc.id = ?
    `, [result.insertId]);
    
    res.status(201).json({ data: newComment[0] });
  } catch (error) {
    logger.error('Error creating task comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TASK HISTORY ROUTES
// ============================================

// Get task history
router.get('/:id/history', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [history] = await db.query(`
      SELECT 
        th.*,
        u.name as changed_by_name,
        u.email as changed_by_email
      FROM task_history th
      LEFT JOIN users u ON th.changed_by = u.id
      WHERE th.task_id = ?
      ORDER BY th.timestamp DESC
    `, [id]);
    
    res.json({ data: history });
  } catch (error) {
    logger.error('Error fetching task history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TIMESHEETS ROUTES
// ============================================

// Get timesheets grouped by project with month filter
router.get('/timesheets/by-project', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    const { month, year } = req.query;
    
    // Get employee ID for non-Super Admin users
    let employeeId = null;
    if (!isSuperAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        employeeId = employee[0].id;
      } else {
        return res.json({ data: [] });
      }
    }
    
    // Build date filter
    let dateFilter = '';
    const params = [];
    
    if (month && year) {
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
      const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
      dateFilter = ' AND ts.date >= ? AND ts.date <= ?';
      params.push(startDate, endDate);
    } else if (year) {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      dateFilter = ' AND ts.date >= ? AND ts.date <= ?';
      params.push(startDate, endDate);
    }
    
    // Build employee filter
    if (employeeId) {
      dateFilter += ' AND ts.employee_id = ?';
      params.push(employeeId);
    }
    
    const query = `
      SELECT 
        p.id as project_id,
        p.name as project_name,
        p.project_code as project_code,
        SUM(ts.hours) as total_hours,
        COUNT(ts.id) as entry_count,
        GROUP_CONCAT(DISTINCT t.title ORDER BY t.title SEPARATOR ', ') as task_titles
      FROM timesheets ts
      INNER JOIN tasks t ON ts.task_id = t.id
      INNER JOIN projects p ON t.project_id = p.id
      WHERE ts.task_id IS NOT NULL
        ${dateFilter}
      GROUP BY p.id, p.name, p.project_code
      ORDER BY total_hours DESC, p.name ASC
    `;
    
    const [results] = await db.query(query, params);
    
    // Get detailed timesheet entries for each project with daily breakdown
    const detailedResults = await Promise.all(
      results.map(async (project) => {
        // Get daily summary (hours per day)
        let dailySummaryQuery = `
          SELECT 
            ts.date,
            SUM(ts.hours) as daily_hours,
            COUNT(ts.id) as daily_entries
          FROM timesheets ts
          INNER JOIN tasks t ON ts.task_id = t.id
          WHERE t.project_id = ?
        `;
        const dailyParams = [project.project_id];
        
        if (month && year) {
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
          dailySummaryQuery += ' AND ts.date >= ? AND ts.date <= ?';
          dailyParams.push(startDate, endDate);
        } else if (year) {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          dailySummaryQuery += ' AND ts.date >= ? AND ts.date <= ?';
          dailyParams.push(startDate, endDate);
        }
        
        if (employeeId) {
          dailySummaryQuery += ' AND ts.employee_id = ?';
          dailyParams.push(employeeId);
        }
        
        dailySummaryQuery += ' GROUP BY ts.date ORDER BY ts.date DESC';
        
        const [dailySummary] = await db.query(dailySummaryQuery, dailyParams);
        
        // Get detailed entries
        let detailQuery = `
          SELECT 
            ts.id,
            ts.date,
            ts.hours,
            ts.notes,
            t.id as task_id,
            t.title as task_title,
            t.task_code,
            u.name as employee_name,
            e.emp_code
          FROM timesheets ts
          INNER JOIN tasks t ON ts.task_id = t.id
          INNER JOIN employees e ON ts.employee_id = e.id
          INNER JOIN users u ON e.user_id = u.id
          WHERE t.project_id = ?
        `;
        const detailParams = [project.project_id];
        
        if (month && year) {
          const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
          const endDate = `${year}-${String(month).padStart(2, '0')}-31`;
          detailQuery += ' AND ts.date >= ? AND ts.date <= ?';
          detailParams.push(startDate, endDate);
        } else if (year) {
          const startDate = `${year}-01-01`;
          const endDate = `${year}-12-31`;
          detailQuery += ' AND ts.date >= ? AND ts.date <= ?';
          detailParams.push(startDate, endDate);
        }
        
        if (employeeId) {
          detailQuery += ' AND ts.employee_id = ?';
          detailParams.push(employeeId);
        }
        
        detailQuery += ' ORDER BY ts.date DESC, ts.created_at DESC';
        
        const [entries] = await db.query(detailQuery, detailParams);
        
        return {
          ...project,
          dailySummary: dailySummary || [],
          entries: entries || []
        };
      })
    );
    
    res.json({ data: detailedResults });
  } catch (error) {
    logger.error('Error fetching timesheets by project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get timesheets for a task
router.get('/:id/timesheets', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    
    let query = `
      SELECT 
        ts.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as approved_by_name
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON ts.approved_by = u2.id
      WHERE ts.task_id = ?
    `;
    const params = [id];
    
    // If not Super Admin, only show their own timesheets
    if (!isSuperAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ' AND ts.employee_id = ?';
        params.push(employee[0].id);
      } else {
        return res.json({ data: [] });
      }
    }
    
    query += ' ORDER BY ts.date DESC, ts.created_at DESC';
    
    const [timesheets] = await db.query(query, params);
    
    res.json({ data: timesheets });
  } catch (error) {
    logger.error('Error fetching timesheets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create timesheet entry
router.post('/:id/timesheets', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, hours, notes } = req.body;
    const userId = req.user?.id;
    
    if (!date || !hours) {
      return res.status(400).json({ error: 'Date and hours are required' });
    }
    
    // Get employee ID
    const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employee.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' });
    }
    
    const [result] = await db.query(`
      INSERT INTO timesheets (employee_id, task_id, date, hours, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [employee[0].id, id, date, hours, notes || null]);
    
    const [newTimesheet] = await db.query(`
      SELECT 
        ts.*,
        e.emp_code,
        u.name as employee_name
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE ts.id = ?
    `, [result.insertId]);
    
    res.status(201).json({ data: newTimesheet[0] });
  } catch (error) {
    logger.error('Error creating timesheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update timesheet entry
router.put('/timesheets/:timesheetId', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const { date, hours, notes } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    
    // Check if timesheet exists and belongs to user (unless Super Admin)
    const [timesheets] = await db.query(`
      SELECT ts.*, e.user_id as employee_user_id
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      WHERE ts.id = ?
    `, [timesheetId]);
    
    if (timesheets.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    
    if (!isSuperAdmin && timesheets[0].employee_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const updates = [];
    const params = [];
    
    if (date !== undefined) {
      updates.push('date = ?');
      params.push(date);
    }
    if (hours !== undefined) {
      updates.push('hours = ?');
      params.push(hours);
    }
    if (notes !== undefined) {
      updates.push('notes = ?');
      params.push(notes);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(timesheetId);
    
    await db.query(
      `UPDATE timesheets SET ${updates.join(', ')} WHERE id = ?`,
      params
    );
    
    const [updated] = await db.query(`
      SELECT 
        ts.*,
        e.emp_code,
        u.name as employee_name
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE ts.id = ?
    `, [timesheetId]);
    
    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Error updating timesheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete timesheet entry
router.delete('/timesheets/:timesheetId', async (req, res) => {
  try {
    const { timesheetId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    
    // Check if timesheet exists and belongs to user (unless Super Admin)
    const [timesheets] = await db.query(`
      SELECT ts.*, e.user_id as employee_user_id
      FROM timesheets ts
      LEFT JOIN employees e ON ts.employee_id = e.id
      WHERE ts.id = ?
    `, [timesheetId]);
    
    if (timesheets.length === 0) {
      return res.status(404).json({ error: 'Timesheet not found' });
    }
    
    if (!isSuperAdmin && timesheets[0].employee_user_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    await db.query('DELETE FROM timesheets WHERE id = ?', [timesheetId]);
    
    res.json({ message: 'Timesheet deleted successfully' });
  } catch (error) {
    logger.error('Error deleting timesheet:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// TASK ATTACHMENTS ROUTES
// ============================================

// Get task attachments
router.get('/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [attachments] = await db.query(`
      SELECT 
        a.*,
        u.name as uploaded_by_name
      FROM attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.task_id = ?
      ORDER BY a.created_at DESC
    `, [id]);
    
    res.json({ data: attachments });
  } catch (error) {
    logger.error('Error fetching task attachments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload task attachments
router.post('/:id/attachments', requirePermission('tasks.edit'), upload.array('attachments', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Check if task exists
    const [tasks] = await db.query('SELECT id FROM tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      // Clean up uploaded files
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const uploadedFiles = [];
    for (const file of req.files) {
      const filePath = `/uploads/tasks/${file.filename}`;
      const [attachmentResult] = await db.query(`
        INSERT INTO attachments (
          task_id, uploaded_by, path, original_filename, mime_type, size
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, userId, filePath, file.originalname, file.mimetype, file.size]);
      
      uploadedFiles.push({
        id: attachmentResult.insertId,
        path: filePath,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size
      });
    }
    
    res.json({ data: uploadedFiles, message: 'Files uploaded successfully' });
  } catch (error) {
    logger.error('Error uploading task attachments:', error);
    // Clean up uploaded files on error
    if (req.files) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete task attachment
router.delete('/:id/attachments/:attachmentId', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    
    // Get attachment info
    const [attachments] = await db.query(`
      SELECT a.*, t.created_by as task_created_by
      FROM attachments a
      LEFT JOIN tasks t ON a.task_id = t.id
      WHERE a.id = ? AND a.task_id = ?
    `, [attachmentId, id]);
    
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachments[0];
    
    // Check permission: user must be the uploader, task creator, or Super Admin
    if (!isSuperAdmin && attachment.uploaded_by !== userId && attachment.task_created_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete file from filesystem
    if (attachment.path && fs.existsSync(attachment.path)) {
      try {
        fs.unlinkSync(attachment.path);
      } catch (fileError) {
        logger.warn('Error deleting file from filesystem:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete from database
    await db.query('DELETE FROM attachments WHERE id = ?', [attachmentId]);
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting task attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

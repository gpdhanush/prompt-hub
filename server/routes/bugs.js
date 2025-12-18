import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyBugAssigned, notifyBugStatusUpdated, notifyBugComment } from '../utils/notificationService.js';
import { emitToRoom } from '../utils/socketService.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput, validateAndSanitizeObject } from '../utils/inputValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'bugs');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `bug-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/rtf',
    'text/rtf'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images and documents (PDF, Word, PPT, RTF) are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: fileFilter
});

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, my_bugs } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    logger.debug('=== GET BUGS REQUEST ===');
    logger.debug('User Role:', userRole);
    logger.debug('User ID:', userId);
    logger.debug('My Bugs filter:', my_bugs, 'Type:', typeof my_bugs);
    
    // Check if tasks table has role-specific columns
    let hasRoleColumns = false;
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM tasks LIKE "developer_id"');
      hasRoleColumns = columns.length > 0;
    } catch (err) {
      // Columns don't exist, use old schema
    }
    
    let query = `
      SELECT 
        b.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as reported_by_name,
        u2.email as reported_by_email,
        u3.name as updated_by_name,
        u3.email as updated_by_email,
        u4.name as team_lead_name,
        u4.email as team_lead_email,
        p.name as project_name,
        t.title as task_title`;
    
    if (hasRoleColumns) {
      query += `,
        t_dev.name as task_developer_name,
        t_test.name as task_tester_name`;
    }
    
    query += `
      FROM bugs b
      LEFT JOIN users u1 ON b.assigned_to = u1.id
      LEFT JOIN users u2 ON b.reported_by = u2.id
      LEFT JOIN users u3 ON b.updated_by = u3.id
      LEFT JOIN users u4 ON b.team_lead_id = u4.id
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN tasks t ON b.task_id = t.id`;
    
    if (hasRoleColumns) {
      query += `
      LEFT JOIN users t_dev ON t.developer_id = t_dev.id
      LEFT JOIN users t_test ON t.tester_id = t_test.id`;
    }
    
    query += ` WHERE 1=1`;
    const params = [];
    
    // All users can see all bugs and their statuses
    // Only apply "My Bugs" filter if specifically requested (and not the string "undefined")
    const shouldFilterMyBugs = my_bugs && 
                                my_bugs !== 'undefined' && 
                                my_bugs !== 'false' && 
                                my_bugs !== '' && 
                                userId;
    
    if (shouldFilterMyBugs) {
      query += ' AND (b.assigned_to = ? OR b.reported_by = ?)';
      params.push(userId, userId);
      logger.debug('Applying "My Bugs" filter for user:', userId);
    } else {
      logger.debug('Showing ALL bugs to user:', userRole);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    logger.debug('Final query:', query);
    logger.debug('Query params:', params);
    
    const [bugs] = await db.query(query, params);
    
    logger.debug(`Found ${bugs.length} bugs`);
    logger.debug('Bug IDs:', bugs.map(b => `${b.bug_code} (reported_by: ${b.reported_by}, assigned_to: ${b.assigned_to})`).join(', '));
    
    // Count query with same filters
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM bugs b
      WHERE 1=1
    `;
    const countParams = [];
    
    // All users can see all bugs - only apply "My Bugs" filter if requested (and not the string "undefined")
    const shouldFilterMyBugsCount = my_bugs && 
                                     my_bugs !== 'undefined' && 
                                     my_bugs !== 'false' && 
                                     my_bugs !== '' && 
                                     userId;
    
    if (shouldFilterMyBugsCount) {
      countQuery += ' AND (b.assigned_to = ? OR b.reported_by = ?)';
      countParams.push(userId, userId);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    logger.debug('Total bugs count:', countResult[0].total);
    
    res.json({ data: bugs, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    logger.error('Error fetching bugs:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    // Check if tasks table has role-specific columns
    let hasRoleColumns = false;
    try {
      const [columns] = await db.query('SHOW COLUMNS FROM tasks LIKE "developer_id"');
      hasRoleColumns = columns.length > 0;
    } catch (err) {
      // Columns don't exist, use old schema
    }
    
    let query = `
      SELECT 
        b.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as reported_by_name,
        u2.email as reported_by_email,
        u3.name as updated_by_name,
        u3.email as updated_by_email,
        u4.name as team_lead_name,
        u4.email as team_lead_email,
        p.name as project_name,
        t.title as task_title`;
    
    if (hasRoleColumns) {
      query += `,
        t_dev.name as task_developer_name,
        t_test.name as task_tester_name`;
    }
    
    query += `
      FROM bugs b
      LEFT JOIN users u1 ON b.assigned_to = u1.id
      LEFT JOIN users u2 ON b.reported_by = u2.id
      LEFT JOIN users u3 ON b.updated_by = u3.id
      LEFT JOIN users u4 ON b.team_lead_id = u4.id
      LEFT JOIN projects p ON b.project_id = p.id
      LEFT JOIN tasks t ON b.task_id = t.id`;
    
    if (hasRoleColumns) {
      query += `
      LEFT JOIN users t_dev ON t.developer_id = t_dev.id
      LEFT JOIN users t_test ON t.tester_id = t_test.id`;
    }
    
    query += ` WHERE b.id = ?`;
    
    const [bugs] = await db.query(query, [req.params.id]);
    if (bugs.length === 0) return res.status(404).json({ error: 'Bug not found' });
    
    // Fetch attachments for this bug
    const [attachments] = await db.query(
      'SELECT id, uploaded_by, original_filename, mime_type, size, created_at FROM attachments WHERE bug_id = ? ORDER BY created_at DESC',
      [req.params.id]
    );
    
    const bugData = bugs[0];
    bugData.attachments = attachments;
    
    res.json({ data: bugData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create bug - Tester, Admin, Team Leader, Developer, Designer, and Super Admin
router.post('/', authorize('Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), upload.array('attachments', 10), async (req, res) => {
  try {
    logger.debug('=== CREATE BUG REQUEST ===');
    logger.debug('Request body:', req.body);
    logger.debug('Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files');
    logger.debug('User:', req.user);
    
    // Validate and sanitize text inputs
    const textFields = ['title', 'description', 'steps_to_reproduce', 'expected_behavior', 'actual_behavior', 
      'browser', 'device', 'os', 'app_version', 'api_endpoint', 'tags'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let { 
      task_id, project_id, title, description, bug_type, severity, priority, status, resolution_type,
      steps_to_reproduce, expected_behavior, actual_behavior, 
      assigned_to: provided_assigned_to, team_lead_id,
      browser, device, os, app_version, api_endpoint,
      target_fix_date, tags
    } = req.body;
    
    // Use sanitized values
    title = validation.data.title || title;
    description = validation.data.description || description;
    steps_to_reproduce = validation.data.steps_to_reproduce || steps_to_reproduce;
    expected_behavior = validation.data.expected_behavior || expected_behavior;
    actual_behavior = validation.data.actual_behavior || actual_behavior;
    browser = validation.data.browser || browser;
    device = validation.data.device || device;
    os = validation.data.os || os;
    app_version = validation.data.app_version || app_version;
    api_endpoint = validation.data.api_endpoint || api_endpoint;
    tags = validation.data.tags || tags;
    
    const reported_by = req.user.id; // Get from authenticated user
    
    logger.debug('=== CREATE BUG REQUEST ===');
    logger.debug('Request body:', req.body);
    logger.debug('Provided assigned_to:', provided_assigned_to, 'Type:', typeof provided_assigned_to);
    
    if (!title && !description) {
      return res.status(400).json({ error: 'Title or description is required' });
    }
    
    // Generate bug code - find the maximum numeric part from existing bug codes
    const [maxBugCodeResult] = await db.query(`
      SELECT MAX(CAST(SUBSTRING(bug_code, 4) AS UNSIGNED)) as max_num 
      FROM bugs 
      WHERE bug_code REGEXP '^BG-[0-9]+$'
    `);
    const nextBugNum = (maxBugCodeResult[0].max_num || 0) + 1;
    const bugCode = `BG-${String(nextBugNum).padStart(4, '0')}`;
    
    // Use description as-is (title is now a separate field)
    const bugDescription = description || '';
    
    // Handle assigned_to: Use provided value if available, otherwise use auto-assignment logic
    let assigned_to = null;
    
    // If assigned_to was explicitly provided in the request, use it
    if (provided_assigned_to !== undefined && provided_assigned_to !== null && provided_assigned_to !== '') {
      assigned_to = parseInt(provided_assigned_to) || null;
      logger.debug(`Using provided assigned_to: ${assigned_to}`);
    } else {
      // Auto-assign bug based on creator's role and task assignments
      // - If Tester creates bug → assign to task's Developer
      // - If Developer creates bug → assign to task's Tester
      const creatorRole = req.user?.role || '';
      
      if (task_id) {
        // Check if task has developer_id, designer_id, tester_id columns (new schema)
        let taskQuery = 'SELECT assigned_to';
        try {
          const [columns] = await db.query('SHOW COLUMNS FROM tasks LIKE "developer_id"');
          if (columns.length > 0) {
            taskQuery += ', developer_id, designer_id, tester_id';
          }
        } catch (err) {
          // Columns don't exist, use old schema
          logger.debug('Using old task schema (no role-specific assignments)');
        }
        taskQuery += ' FROM tasks WHERE id = ?';
        
        const [taskResult] = await db.query(taskQuery, [task_id]);
        if (taskResult.length > 0) {
          const task = taskResult[0];
          
          // Role-based assignment logic
          if (creatorRole === 'Tester') {
            // Tester creates bug → assign to Developer
            assigned_to = task.developer_id || task.assigned_to || null;
            logger.debug(`Tester created bug - auto-assigning to Developer: ${assigned_to}`);
          } else if (creatorRole === 'Developer') {
            // Developer creates bug → assign to Tester
            assigned_to = task.tester_id || task.assigned_to || null;
            logger.debug(`Developer created bug - auto-assigning to Tester: ${assigned_to}`);
          } else if (creatorRole === 'Designer') {
            // Designer creates bug → assign to Developer (for code fixes) or Tester (for testing)
            assigned_to = task.developer_id || task.tester_id || task.assigned_to || null;
            logger.debug(`Designer created bug - auto-assigning to Developer/Tester: ${assigned_to}`);
          } else {
            // For other roles (Admin, Team Lead, Super Admin), use task's assigned_to
            assigned_to = task.assigned_to || null;
            logger.debug(`Auto-assigning bug to task's assigned user: ${assigned_to}`);
          }
        }
      }
    }
    
    logger.debug('Inserting bug with:', { bugCode, project_id, task_id, title, bugDescription, bug_type, severity, priority, status, reported_by, assigned_to });
    
    // Build dynamic INSERT query based on available columns
    const insertFields = ['bug_code', 'description', 'severity', 'status', 'reported_by', 'assigned_to'];
    const insertValues = [bugCode, bugDescription, severity || 'Low', status || 'Open', reported_by, assigned_to];
    
    // Add optional fields if they exist in the request
    if (title) {
      insertFields.push('title');
      insertValues.push(title);
    }
    if (project_id) {
      insertFields.push('project_id');
      insertValues.push(parseInt(project_id) || null);
    }
    if (task_id) {
      insertFields.push('task_id');
      insertValues.push(parseInt(task_id) || null);
    }
    if (bug_type) {
      insertFields.push('bug_type');
      insertValues.push(bug_type);
    }
    if (priority) {
      insertFields.push('priority');
      insertValues.push(priority);
    }
    if (resolution_type) {
      insertFields.push('resolution_type');
      insertValues.push(resolution_type);
    }
    if (team_lead_id) {
      insertFields.push('team_lead_id');
      insertValues.push(parseInt(team_lead_id) || null);
    }
    // Always include Steps & Reproduction fields (can be empty)
    insertFields.push('steps_to_reproduce');
    insertValues.push(steps_to_reproduce || null);
    insertFields.push('expected_behavior');
    insertValues.push(expected_behavior || null);
    insertFields.push('actual_behavior');
    insertValues.push(actual_behavior || null);
    if (browser) {
      insertFields.push('browser');
      insertValues.push(browser);
    }
    if (device) {
      insertFields.push('device');
      insertValues.push(device);
    }
    if (os) {
      insertFields.push('os');
      insertValues.push(os);
    }
    if (app_version) {
      insertFields.push('app_version');
      insertValues.push(app_version);
    }
    if (api_endpoint) {
      insertFields.push('api_endpoint');
      insertValues.push(api_endpoint);
    }
    if (target_fix_date) {
      insertFields.push('target_fix_date');
      insertValues.push(target_fix_date);
    }
    if (tags) {
      insertFields.push('tags');
      insertValues.push(tags);
    }
    
    const placeholders = insertFields.map(() => '?').join(', ');
    const query = `INSERT INTO bugs (${insertFields.join(', ')}) VALUES (${placeholders})`;
    
    const [result] = await db.query(query, insertValues);
    
    logger.debug('Bug inserted with ID:', result.insertId);
    
    // Handle file attachments
    if (req.files && req.files.length > 0) {
      logger.debug(`Inserting ${req.files.length} attachments`);
      const attachmentPromises = req.files.map((file) => {
        return db.query(`
          INSERT INTO attachments (bug_id, uploaded_by, path, original_filename, mime_type, size)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [result.insertId, reported_by, file.path, file.originalname, file.mimetype, file.size]);
      });
      await Promise.all(attachmentPromises);
      logger.debug('Attachments inserted successfully');
    }
    
    const [newBug] = await db.query('SELECT * FROM bugs WHERE id = ?', [result.insertId]);
    logger.debug('Bug created successfully:', newBug[0]);
    
    // Create audit log for bug creation
    await logCreate(req, 'Bugs', result.insertId, {
      id: result.insertId,
      bug_code: bugCode,
      title: title,
      project_id: project_id,
      task_id: task_id,
      status: status || 'Open',
      severity: severity || 'Low',
      priority: priority || 'P4'
    }, 'Bug');
    
    // Notify assigned user about bug assignment
    if (assigned_to && assigned_to !== reported_by) {
      await notifyBugAssigned(assigned_to, result.insertId, title || bugDescription, reported_by);
    }
    
    res.status(201).json({ data: newBug[0] });
  } catch (error) {
    logger.error('Error creating bug:', error);
    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update bug - Tester, Admin, Team Leader, Developer, Designer, and Super Admin
router.put('/:id', authorize('Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const userRole = req.user?.role || '';
    
    // Validate and sanitize text inputs
    const textFields = ['title', 'description', 'steps_to_reproduce', 'expected_behavior', 'actual_behavior', 
      'browser', 'device', 'os', 'app_version', 'api_endpoint', 'tags'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let { 
      title, description, project_id, task_id, bug_type, severity, priority, status, resolution_type,
      assigned_to, team_lead_id,
      steps_to_reproduce, expected_behavior, actual_behavior,
      browser, device, os, app_version, api_endpoint,
      target_fix_date, actual_fix_date, tags
    } = req.body;
    
    // Use sanitized values
    title = validation.data.title || title;
    description = validation.data.description || description;
    steps_to_reproduce = validation.data.steps_to_reproduce || steps_to_reproduce;
    expected_behavior = validation.data.expected_behavior || expected_behavior;
    actual_behavior = validation.data.actual_behavior || actual_behavior;
    browser = validation.data.browser || browser;
    device = validation.data.device || device;
    os = validation.data.os || os;
    app_version = validation.data.app_version || app_version;
    api_endpoint = validation.data.api_endpoint || api_endpoint;
    tags = validation.data.tags || tags;
    
    // Get before data for audit log
    const [existingBugs] = await db.query('SELECT * FROM bugs WHERE id = ?', [id]);
    if (existingBugs.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const beforeData = existingBugs[0];
    
    logger.debug('=== UPDATE BUG REQUEST ===');
    logger.debug('Bug ID:', id);
    logger.debug('User Role:', userRole);
    logger.debug('Request body:', req.body);
    
    // All users can now update bugs including assigned_to
    // Developer, Designer, and Tester can update status and assigned_to
    // Admin, Team Lead, Super Admin can update all fields
    
    // Valid status values matching database ENUM
    const validStatuses = ['Open', 'In Progress', 'In Review', 'Reopened', 'Blocked', 'Fixed', 'Closed', 'Fixing', 'Retesting', 'Passed', 'Rejected', 'Duplicate', 'Not a Bug'];
    
    // Normalize status - map common variations to valid values
    let normalizedStatus = status;
    if (status) {
      const statusMap = {
        'Completed': 'Closed',
        'Done': 'Closed',
        'Resolved': 'Fixed',
        'Resolve': 'Fixed',
        'Complete': 'Closed',
      };
      
      if (statusMap[status]) {
        normalizedStatus = statusMap[status];
        logger.debug(`Status mapped from "${status}" to "${normalizedStatus}"`);
      }
      
      // Validate status is in allowed values
      if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ 
          error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}` 
        });
      }
    }
    
    // Use description as-is (title is now a separate field)
    const bugDescription = description || '';
    
    const updated_by = req.user.id;
    
    // Handle assigned_to: convert empty string, null, undefined, or 0 to null, otherwise use the value
    const assignedToValue = (assigned_to === '' || assigned_to === null || assigned_to === undefined || assigned_to === 0) ? null : parseInt(assigned_to);
    const teamLeadValue = (team_lead_id === '' || team_lead_id === null || team_lead_id === undefined || team_lead_id === 0) ? null : parseInt(team_lead_id);
    const projectValue = (project_id === '' || project_id === null || project_id === undefined || project_id === 0) ? null : parseInt(project_id);
    const taskValue = (task_id === '' || task_id === null || task_id === undefined || task_id === 0) ? null : parseInt(task_id);
    
    logger.debug('Processed values:', { assignedToValue, teamLeadValue, projectValue, taskValue });
    
    // Build update fields dynamically
    const updateFields = [];
    const updateValues = [];
    
    // All users can update status and assigned_to
    // Developer, Designer, and Tester can only update status and assigned_to (not description/severity)
    if (userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester') {
      // Developer, Designer, Tester: can update status and assigned_to only
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(normalizedStatus);
      }
      if (assigned_to !== undefined) {
        updateFields.push('assigned_to = ?');
        updateValues.push(assignedToValue);
      }
    } else {
      // Admin, Team Lead, Super Admin can update all fields
      if (title !== undefined) {
        updateFields.push('title = ?');
        updateValues.push(title || null);
      }
      if (description !== undefined) {
        updateFields.push('description = ?');
        updateValues.push(bugDescription);
      }
      if (project_id !== undefined) {
        updateFields.push('project_id = ?');
        updateValues.push(projectValue);
      }
      if (task_id !== undefined) {
        updateFields.push('task_id = ?');
        updateValues.push(taskValue);
      }
      if (bug_type !== undefined) {
        updateFields.push('bug_type = ?');
        updateValues.push(bug_type);
      }
      if (severity !== undefined) {
        updateFields.push('severity = ?');
        updateValues.push(severity);
      }
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      if (status !== undefined) {
        updateFields.push('status = ?');
        updateValues.push(normalizedStatus);
      }
      if (resolution_type !== undefined) {
        updateFields.push('resolution_type = ?');
        updateValues.push(resolution_type || null);
      }
      if (assigned_to !== undefined) {
        updateFields.push('assigned_to = ?');
        updateValues.push(assignedToValue);
      }
      if (team_lead_id !== undefined) {
        updateFields.push('team_lead_id = ?');
        updateValues.push(teamLeadValue);
      }
      if (steps_to_reproduce !== undefined) {
        updateFields.push('steps_to_reproduce = ?');
        updateValues.push(steps_to_reproduce || null);
      }
      if (expected_behavior !== undefined) {
        updateFields.push('expected_behavior = ?');
        updateValues.push(expected_behavior || null);
      }
      if (actual_behavior !== undefined) {
        updateFields.push('actual_behavior = ?');
        updateValues.push(actual_behavior || null);
      }
      if (browser !== undefined) {
        updateFields.push('browser = ?');
        updateValues.push(browser || null);
      }
      if (device !== undefined) {
        updateFields.push('device = ?');
        updateValues.push(device || null);
      }
      if (os !== undefined) {
        updateFields.push('os = ?');
        updateValues.push(os || null);
      }
      if (app_version !== undefined) {
        updateFields.push('app_version = ?');
        updateValues.push(app_version || null);
      }
      if (api_endpoint !== undefined) {
        updateFields.push('api_endpoint = ?');
        updateValues.push(api_endpoint || null);
      }
      if (target_fix_date !== undefined) {
        updateFields.push('target_fix_date = ?');
        updateValues.push(target_fix_date || null);
      }
      if (actual_fix_date !== undefined) {
        updateFields.push('actual_fix_date = ?');
        updateValues.push(actual_fix_date || null);
      }
      if (tags !== undefined) {
        updateFields.push('tags = ?');
        updateValues.push(tags || null);
      }
    }
    
    // Always update updated_by and updated_at
    updateFields.push('updated_by = ?');
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(updated_by);
    updateValues.push(id);
    
    if (updateFields.length > 2) { // More than just updated_by and updated_at
      const query = `UPDATE bugs SET ${updateFields.join(', ')} WHERE id = ?`;
      await db.query(query, updateValues);
      logger.debug('Bug updated successfully');
    }
    
    const [updated] = await db.query('SELECT * FROM bugs WHERE id = ?', [id]);
    logger.debug('Updated bug:', updated[0]);
    
    // Create audit log for bug update
    await logUpdate(req, 'Bugs', id, beforeData, updated[0], 'Bug');
    
    // Notify assigned user if bug status is updated
    if (status && normalizedStatus && normalizedStatus !== beforeData.status) {
      const assignedUserId = assignedToValue || updated[0].assigned_to;
      if (assignedUserId) {
        await notifyBugStatusUpdated(
          assignedUserId,
          parseInt(id),
          title || updated[0].title || 'Bug',
          beforeData.status,
          normalizedStatus,
          updated_by
        );
      }
    }
    
    // Notify user if bug is newly assigned
    if (assigned_to !== undefined && assignedToValue && assignedToValue !== beforeData.assigned_to && assignedToValue !== updated_by) {
      await notifyBugAssigned(
        assignedToValue,
        parseInt(id),
        title || updated[0].title || 'Bug',
        updated_by
      );
    }
    
    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Error updating bug:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload attachments to existing bug
router.post('/:id/attachments', authorize('Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), upload.array('attachments', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    // Check if bug exists
    const [bugs] = await db.query('SELECT id FROM bugs WHERE id = ?', [id]);
    if (bugs.length === 0) {
      // Clean up uploaded files
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
      return res.status(404).json({ error: 'Bug not found' });
    }
    
    const uploadedFiles = [];
    for (const file of req.files) {
      const [attachmentResult] = await db.query(`
        INSERT INTO attachments (
          bug_id, uploaded_by, path, original_filename, mime_type, size
        )
        VALUES (?, ?, ?, ?, ?, ?)
      `, [id, userId, file.path, file.originalname, file.mimetype, file.size]);
      
      uploadedFiles.push({
        id: attachmentResult.insertId,
        path: file.path,
        original_filename: file.originalname,
        mime_type: file.mimetype,
        size: file.size
      });
    }
    
    res.json({ data: uploadedFiles, message: 'Files uploaded successfully' });
  } catch (error) {
    logger.error('Error uploading bug attachments:', error);
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

// Download attachment
router.get('/:bugId/attachments/:attachmentId', async (req, res) => {
  try {
    const { bugId, attachmentId } = req.params;
    
    // Get attachment info
    const [attachments] = await db.query(
      'SELECT path, original_filename, mime_type FROM attachments WHERE id = ? AND bug_id = ?',
      [attachmentId, bugId]
    );
    
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachments[0];
    let filePath = attachment.path;
    
    // file.path from multer is the full absolute path
    // If it's already absolute, use it directly
    // If it's relative (starts with /uploads/), resolve it relative to process.cwd()
    if (!path.isAbsolute(filePath)) {
      if (filePath.startsWith('/uploads/')) {
        filePath = path.join(process.cwd(), filePath);
      } else {
        filePath = path.resolve(process.cwd(), filePath);
      }
    }
    
    // Normalize the path to handle any path separators
    filePath = path.normalize(filePath);
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      logger.error(`File not found at path: ${filePath}`);
      logger.error(`Original path from DB: ${attachment.path}`);
      logger.error(`Process CWD: ${process.cwd()}`);
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename || 'attachment'}"`);
    
    // Send file - use absolute path
    res.sendFile(filePath);
  } catch (error) {
    logger.error('Error downloading attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete attachment
router.delete('/:bugId/attachments/:attachmentId', authorize('Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), async (req, res) => {
  try {
    const { bugId, attachmentId } = req.params;
    const userId = req.user?.id;
    
    // Check if attachment exists and belongs to bug
    const [attachments] = await db.query(
      'SELECT * FROM attachments WHERE id = ? AND bug_id = ?',
      [attachmentId, bugId]
    );
    
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachments[0];
    
    // Delete file from disk
    if (attachment.path && fs.existsSync(attachment.path)) {
      try {
        fs.unlinkSync(attachment.path);
      } catch (fileError) {
        logger.warn('Error deleting file from disk:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete from database
    await db.query('DELETE FROM attachments WHERE id = ?', [attachmentId]);
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get comments for a bug
router.get('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Fetch all comments for this bug with user information
    const [comments] = await db.query(`
      SELECT 
        bc.*,
        u.name as user_name,
        u.email as user_email,
        r.name as user_role
      FROM bug_comments bc
      INNER JOIN users u ON bc.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE bc.bug_id = ?
      ORDER BY bc.created_at ASC
    `, [id]);
    
    // Organize comments into a tree structure
    const commentMap = new Map();
    const rootComments = [];
    
    // First pass: create map of all comments
    comments.forEach(comment => {
      commentMap.set(comment.id, {
        ...comment,
        replies: []
      });
    });
    
    // Second pass: build tree structure
    comments.forEach(comment => {
      const commentNode = commentMap.get(comment.id);
      if (comment.parent_id) {
        const parent = commentMap.get(comment.parent_id);
        if (parent) {
          parent.replies.push(commentNode);
        }
      } else {
        rootComments.push(commentNode);
      }
    });
    
    res.json({ data: rootComments });
  } catch (error) {
    logger.error('Error fetching comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a comment (or reply) for a bug
router.post('/:id/comments', authorize('Tester', 'Developer', 'Designer', 'Admin', 'Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_text, parent_id } = req.body;
    const userId = req.user.id;
    
    logger.debug('Bug comment creation request:', { bugId: id, userId, comment_text: comment_text?.substring(0, 50), parent_id });
    
    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }
    
    // Verify bug exists and get details for notification
    const [bugs] = await db.query('SELECT id, title, assigned_to, reported_by FROM bugs WHERE id = ?', [id]);
    if (bugs.length === 0) {
      logger.warn(`Bug not found: ${id}`);
      return res.status(404).json({ error: 'Bug not found' });
    }
    const bug = bugs[0];
    
    // Process parent_id - convert to number if needed
    let parentIdValue = null;
    if (parent_id !== undefined && parent_id !== null && parent_id !== '') {
      parentIdValue = typeof parent_id === 'string' ? parseInt(parent_id, 10) : parent_id;
      if (isNaN(parentIdValue) || parentIdValue <= 0) {
        logger.warn(`Invalid parent_id: ${parent_id} for bug ${id}`);
        return res.status(400).json({ error: 'Invalid parent comment ID' });
      }
      
      // Verify parent comment exists and belongs to the same bug
      const [parentComments] = await db.query(
        'SELECT id FROM bug_comments WHERE id = ? AND bug_id = ?',
        [parentIdValue, id]
      );
      if (parentComments.length === 0) {
        logger.warn(`Parent comment not found: ${parentIdValue} for bug ${id}`);
        return res.status(400).json({ error: 'Parent comment not found or does not belong to this bug' });
      }
    }
    
    logger.debug('Inserting bug comment:', { 
      bugId: id, 
      userId, 
      parentId: parentIdValue, 
      commentLength: comment_text.trim().length,
      isReply: parentIdValue !== null 
    });
    
    const [result] = await db.query(`
      INSERT INTO bug_comments (bug_id, user_id, parent_id, comment_text)
      VALUES (?, ?, ?, ?)
    `, [id, userId, parentIdValue, comment_text.trim()]);
    
    logger.info(`Bug comment created successfully: ID ${result.insertId} for bug ${id}`);
    
    // Fetch the created comment with user info
    const [newComments] = await db.query(`
      SELECT 
        bc.*,
        u.name as user_name,
        u.email as user_email,
        r.name as user_role
      FROM bug_comments bc
      INNER JOIN users u ON bc.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE bc.id = ?
    `, [result.insertId]);
    
    // Notify relevant users about the comment/reply
    await notifyBugComment(
      parseInt(id),
      result.insertId,
      userId,
      newComments[0].user_name || 'Someone',
      comment_text.trim(),
      bug.title || 'Bug',
      parentIdValue,
      bug.assigned_to,
      bug.reported_by
    );

    // Emit socket event for real-time updates
    const roomName = `bug:${id}`;
    const eventName = parentIdValue ? 'bug_comment_reply' : 'bug_comment';
    emitToRoom(roomName, eventName, {
      bugId: parseInt(id),
      comment: newComments[0],
      commentId: result.insertId,
      parentId: parentIdValue,
    });
    
    res.status(201).json({ data: newComments[0] });
  } catch (error) {
    logger.error('Error creating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete bug - only Team Leader and Super Admin
router.delete('/:id', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data for audit log
    const [existingBugs] = await db.query('SELECT * FROM bugs WHERE id = ?', [id]);
    if (existingBugs.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const beforeData = existingBugs[0];
    
    // Delete associated attachments first
    const [attachments] = await db.query('SELECT path FROM attachments WHERE bug_id = ?', [id]);
    attachments.forEach((att) => {
      if (fs.existsSync(att.path)) {
        fs.unlinkSync(att.path);
      }
    });
    await db.query('DELETE FROM attachments WHERE bug_id = ?', [id]);
    await db.query('DELETE FROM bugs WHERE id = ?', [id]);
    
    // Create audit log for bug deletion
    await logDelete(req, 'Bugs', id, beforeData, 'Bug');
    
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';

import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyBugAssigned, notifyBugStatusUpdated, notifyBugComment } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput, validateAndSanitizeObject } from '../utils/inputValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Helper middleware to check for Role OR Permission
const checkBugPermission = (permission, allowedRoles) => {
  return async (req, res, next) => {
    // Check if user has one of the allowed roles
    if (req.user && req.user.role && allowedRoles.includes(req.user.role)) {
      return next();
    }
    // Fallback to permission check
    return requirePermission(permission)(req, res, next);
  };
};


// Apply authentication to all routes
router.use(authenticate);

/**
 * @swagger
 * /api/bugs:
 *   get:
 *     summary: Get all bugs
 *     tags: [Bugs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Items per page
 *       - in: query
 *         name: my_bugs
 *         schema:
 *           type: string
 *         description: Filter to show only bugs assigned to or reported by current user
 *     responses:
 *       200:
 *         description: List of bugs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Bug'
 *                 pagination:
 *                   $ref: '#/components/schemas/PaginatedResponse/properties/pagination'
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */

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
    const { page = 1, limit = 10, my_bugs, status, priority, task_id } = req.query;
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
        p.uuid as project_uuid,
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
    
    // For CLIENT users, only show bugs from projects they have access to
    if (userRole === 'CLIENT' || userRole === 'Client') {
      query += ` AND EXISTS (
        SELECT 1 FROM project_users pu
        INNER JOIN projects p ON pu.project_id = p.id
        WHERE pu.project_id = b.project_id
          AND pu.user_id = ?
          AND pu.is_active = 1
          AND p.is_active = 1
      )`;
      params.push(userId);
      logger.debug('Filtering bugs by CLIENT project access for user:', userId);
    }
    
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

    // Add additional filters
    if (status) {
      query += ' AND b.status = ?';
      params.push(status);
      logger.debug('Filtering by status:', status);
    }

    if (priority) {
      query += ' AND b.priority = ?';
      params.push(priority);
      logger.debug('Filtering by priority:', priority);
    }

    if (task_id) {
      query += ' AND b.task_id = ?';
      params.push(task_id);
      logger.debug('Filtering by task_id:', task_id);
    }

    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    logger.debug('Final query:', query);
    logger.debug('Query params:', params);
    
    const [bugs] = await db.query(query, params);

    // Convert old priority values (P1-P4) to new values (Critical, High, Medium, Low)
    const convertPriorityValue = (priority) => {
      switch (priority) {
        case 'P1': return 'Critical';
        case 'P2': return 'High';
        case 'P3': return 'Medium';
        case 'P4': return 'Low';
        default: return priority; // Already using new values
      }
    };

    // Apply conversion to all bugs
    const convertedBugs = bugs.map(bug => ({
      ...bug,
      priority: convertPriorityValue(bug.priority)
    }));

    logger.debug(`Found ${convertedBugs.length} bugs`);
    logger.debug('Bug IDs:', convertedBugs.map(b => `${b.bug_code} (reported_by: ${b.reported_by}, assigned_to: ${b.assigned_to})`).join(', '));
    
    // Count query with same filters
    let countQuery = `
      SELECT COUNT(*) as total 
      FROM bugs b
      WHERE 1=1
    `;
    const countParams = [];
    
    // For CLIENT users, only count bugs from projects they have access to
    if (userRole === 'CLIENT' || userRole === 'Client') {
      countQuery += ` AND EXISTS (
        SELECT 1 FROM project_users pu
        INNER JOIN projects p ON pu.project_id = p.id
        WHERE pu.project_id = b.project_id
          AND pu.user_id = ?
          AND pu.is_active = 1
          AND p.is_active = 1
      )`;
      countParams.push(userId);
    }
    
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

    // Add same additional filters to count query
    if (status) {
      countQuery += ' AND b.status = ?';
      countParams.push(status);
    }

    if (priority) {
      countQuery += ' AND b.priority = ?';
      countParams.push(priority);
    }

    if (task_id) {
      countQuery += ' AND b.task_id = ?';
      countParams.push(task_id);
    }

    const [countResult] = await db.query(countQuery, countParams);
    logger.debug('Total bugs count:', countResult[0].total);
    
    res.json({ data: convertedBugs, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    logger.error('Error fetching bugs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bugs/{id}:
 *   get:
 *     summary: Get bug by ID
 *     tags: [Bugs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bug ID
 *     responses:
 *       200:
 *         description: Bug details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Bug'
 *       404:
 *         description: Bug not found
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Server error
 */
router.get('/:id', async (req, res) => {
  try {
    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', req.params.id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }
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
        p.uuid as project_uuid,
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

    const [bugs] = await db.query(query, [bugId]);
    if (bugs.length === 0) return res.status(404).json({ error: 'Bug not found' });

    // Fetch attachments for this bug
    const [attachments] = await db.query(
      'SELECT id, uploaded_by, original_filename, mime_type, size, created_at FROM attachments WHERE bug_id = ? ORDER BY created_at DESC',
      [bugId]
    );
    
    const bugData = bugs[0];

    // Convert old priority values (P1-P4) to new values (Critical, High, Medium, Low)
    const convertPriorityValue = (priority) => {
      switch (priority) {
        case 'P1': return 'Critical';
        case 'P2': return 'High';
        case 'P3': return 'Medium';
        case 'P4': return 'Low';
        default: return priority; // Already using new values
      }
    };

    bugData.priority = convertPriorityValue(bugData.priority);
    bugData.attachments = attachments;
    
    res.json({ data: bugData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bugs:
 *   post:
 *     summary: Create a new bug
 *     tags: [Bugs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *             properties:
 *               project_id:
 *                 type: integer
 *                 description: Project ID
 *               task_id:
 *                 type: integer
 *                 description: Task ID
 *               title:
 *                 type: string
 *                 description: Bug title
 *               description:
 *                 type: string
 *                 description: Bug description
 *               bug_type:
 *                 type: string
 *                 enum: [Functional, UI/UX, Performance, Security, Other]
 *                 description: Bug type/category
 *               priority:
 *                 type: string
 *                 enum: [Critical, High, Medium, Low]
 *                 description: Bug priority level
 *               status:
 *                 type: string
 *                 enum: [Open, In Progress, Fixed, Rejected, Won't Fix, Duplicate]
 *               assigned_to:
 *                 type: integer
 *                 description: User ID to assign bug to
 *               steps_to_reproduce:
 *                 type: string
 *               expected_behavior:
 *                 type: string
 *               actual_behavior:
 *                 type: string
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: Bug created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Bug'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Insufficient permissions
 *       500:
 *         description: Server error
 */
// Create bug - Tester, Admin, Team Leader, Developer, Designer, Super Admin OR bugs.create permission
const createRoles = ['Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'];
router.post('/', checkBugPermission('bugs.create', createRoles), upload.array('attachments', 10), async (req, res) => {


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
      task_id, project_id, title, description, bug_type, priority, status, resolution_type,
      steps_to_reproduce, expected_behavior, actual_behavior,
      assigned_to: provided_assigned_to, team_lead_id,
      browser, device, os, app_version, api_endpoint,
      target_fix_date, deadline, tags
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
    
    logger.debug('Inserting bug with:', { bugCode, project_id, task_id, title, bugDescription, bug_type, priority, status, reported_by, assigned_to });
    
    // Determine default status based on assignment
    const defaultStatus = assigned_to ? 'Assigned' : (status || 'Open');

    // Build dynamic INSERT query based on available columns
    const insertFields = ['bug_code', 'description', 'priority', 'status', 'reported_by', 'assigned_to'];
    const insertValues = [bugCode, bugDescription, priority || 'Low', defaultStatus, reported_by, assigned_to];
    
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
    if (team_lead_id) {
      insertFields.push('team_lead_id');
      insertValues.push(parseInt(team_lead_id) || null);
    }
    if (deadline) {
      insertFields.push('deadline');
      insertValues.push(deadline);
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
    
    // Add uuid as first field
    insertFields.unshift('uuid');
    const placeholders = insertFields.map((field, index) => field === 'uuid' ? 'UUID()' : '?').join(', ');
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
      priority: priority || 'Low'
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
/**
 * @swagger
 * /api/bugs/{id}:
 *   put:
 *     summary: Update a bug
 *     tags: [Bugs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bug ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [Open, In Progress, Fixed, Rejected, Won't Fix, Duplicate]
 *               priority:
 *                 type: string
 *                 enum: [Critical, High, Medium, Low]
 *               assigned_to:
 *                 type: integer
 *               resolution_type:
 *                 type: string
 *     responses:
 *       200:
 *         description: Bug updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   $ref: '#/components/schemas/Bug'
 *                 message:
 *                   type: string
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       404:
 *         description: Bug not found
 *       500:
 *         description: Server error
 */
const editRoles = ['Tester', 'Admin', 'Team Leader', 'Team Lead', 'Developer', 'Designer', 'Super Admin'];
router.put('/:id', checkBugPermission('bugs.edit', editRoles), async (req, res) => {


  try {
    const { id } = req.params;

    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

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
      title, description, project_id, task_id, bug_type, priority, status,
      assigned_to, team_lead_id, deadline,
      steps_to_reproduce, expected_behavior, actual_behavior,
      browser, device, os, app_version
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

    // Get before data for audit log
    const [existingBugs] = await db.query('SELECT * FROM bugs WHERE id = ?', [bugId]);
    if (existingBugs.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const beforeData = existingBugs[0];

    logger.debug('=== UPDATE BUG REQUEST ===');
    logger.debug('Bug ID (param):', id);
    logger.debug('Bug ID (resolved):', bugId);
    logger.debug('User Role:', userRole);
    logger.debug('Request body:', req.body);

    // Check if user has bugs.edit permission OR is Super Admin/Level 1 to determine what fields they can update
    let hasFullEditPermission = false;

    // Super Admin always has full access
    if (userRole === 'Super Admin') {
      hasFullEditPermission = true;
      logger.debug('Super Admin has full bug edit access');
    }
    // Level 1 users (managers) always have full access
    else {
      const [level1Roles] = await db.query('SELECT name FROM roles WHERE level = 1');
      const level1RoleNames = level1Roles.map(role => role.name);
      if (level1RoleNames.includes(userRole)) {
        hasFullEditPermission = true;
        logger.debug('Level 1 user has full bug edit access');
      }
      // Others need bugs.edit permission
      else {
        try {
          const [permissions] = await db.query(`
            SELECT p.code
            FROM role_permissions rp
            JOIN permissions p ON rp.permission_id = p.id
            JOIN users u ON u.role_id = rp.role_id
            WHERE u.id = ? AND p.code = 'bugs.edit' AND rp.allowed = TRUE
          `, [req.user.id]);

          hasFullEditPermission = permissions.length > 0;
          logger.debug('User has bugs.edit permission:', hasFullEditPermission);
        } catch (error) {
          logger.warn('Error checking bugs.edit permission:', error);
          // Default to restricted permissions if we can't check
          hasFullEditPermission = false;
        }
      }
    }

    // Allow any valid status change (no transition restrictions)

    // Valid status values for bug status dropdown
    const validStatuses = ['Open', 'Assigned', 'In Progress', 'Testing', 'Fixed', 'Retesting', 'Closed', 'Reopened'];

    // Validate status is in allowed values
    if (status && !validStatuses.includes(status)) {
      logger.error('Invalid status provided:', status);
      return res.status(400).json({
        error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}`
      });
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

    // Check if user is Level 2 (dynamic query from roles table)
    const [level2Roles] = await db.query('SELECT name FROM roles WHERE level = 2 OR name IN ("Developer", "Designer", "Tester")');
    const level2RoleNames = level2Roles.map(role => role.name);
    const isLevel2User = level2RoleNames.includes(userRole);
    const canUpdateStatusAndAssignment = hasFullEditPermission || isLevel2User;

    logger.debug('Level 2 roles from DB:', level2RoleNames);
    logger.debug('User role:', userRole);
    logger.debug('Is Level 2 user:', isLevel2User);
    logger.debug('Can update status and assignment:', canUpdateStatusAndAssignment);
    logger.debug('Status value:', status);

    // Allow Level 2 users and users with bugs.edit permission to update status and assigned_to
    if (status !== undefined && canUpdateStatusAndAssignment) {
      updateFields.push('status = ?');
      updateValues.push(status);
      logger.debug('Status field added to update:', status);
    } else {
      logger.debug('Status field NOT added to update. Status:', status, 'Can update:', canUpdateStatusAndAssignment);
    }
    if (assigned_to !== undefined && canUpdateStatusAndAssignment) {
      updateFields.push('assigned_to = ?');
      updateValues.push(assignedToValue);
    }

    // Only allow updates if user has bugs.edit permission
    if (hasFullEditPermission) {
      // Users with bugs.edit permission can update all fields
      logger.debug('User can edit all bug fields');

      // Include all updatable fields
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
      if (priority !== undefined) {
        updateFields.push('priority = ?');
        updateValues.push(priority);
      }
      if (team_lead_id !== undefined) {
        updateFields.push('team_lead_id = ?');
        updateValues.push(teamLeadValue);
      }
      if (deadline !== undefined) {
        updateFields.push('deadline = ?');
        updateValues.push(deadline || null);
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
    } else {
      // User does not have bugs.edit permission - no updates allowed
      return res.status(403).json({
        error: 'You do not have permission to update bugs'
      });
    }

    // Always update updated_by and updated_at
    updateFields.push('updated_by = ?');
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(updated_by);
    updateValues.push(bugId);

    if (updateFields.length > 2) { // More than just updated_by and updated_at
      const query = `UPDATE bugs SET ${updateFields.join(', ')} WHERE id = ?`;
      logger.debug('Update query:', query);
      logger.debug('Update values:', updateValues);
      await db.query(query, updateValues);
    } else {
      logger.debug('No fields to update besides timestamps');
    }

    const [updated] = await db.query('SELECT * FROM bugs WHERE id = ?', [bugId]);

    // Increment reopened_count if status changed to "Reopened"
    if (status && status === 'Reopened' && beforeData.status !== 'Reopened') {
      await db.query('UPDATE bugs SET reopened_count = reopened_count + 1 WHERE id = ?', [bugId]);
      // Get updated data again
      const [updatedWithCount] = await db.query('SELECT * FROM bugs WHERE id = ?', [bugId]);
      updated[0] = updatedWithCount[0];
    }

    // Create audit log for bug update
    await logUpdate(req, 'Bugs', bugId, beforeData, updated[0], 'Bug');

    // Notify assigned user if bug status is updated
    if (status && status !== beforeData.status) {
      const assignedUserId = assignedToValue || updated[0].assigned_to;
      if (assignedUserId) {
        await notifyBugStatusUpdated(
          assignedUserId,
          bugId,
          title || updated[0].title || 'Bug',
          beforeData.status,
          status,
          updated_by
        );
      }
    }

    // Notify user if bug is newly assigned
    if (assigned_to !== undefined && assignedToValue && assignedToValue !== beforeData.assigned_to && assignedToValue !== updated_by) {
      await notifyBugAssigned(
        assignedToValue,
        bugId,
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

    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Check if bug exists
    const [bugs] = await db.query('SELECT id FROM bugs WHERE id = ?', [bugId]);
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
      `, [bugId, userId, file.path, file.originalname, file.mimetype, file.size]);
      
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

    // Resolve UUID to numeric ID if needed for bugId
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const resolvedBugId = await resolveIdFromUuid('bugs', bugId);
    if (!resolvedBugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    // Get attachment info
    const [attachments] = await db.query(
      'SELECT path, original_filename, mime_type FROM attachments WHERE id = ? AND bug_id = ?',
      [attachmentId, resolvedBugId]
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

    // Resolve UUID to numeric ID if needed for bugId
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const resolvedBugId = await resolveIdFromUuid('bugs', bugId);
    if (!resolvedBugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    // Check if attachment exists and belongs to bug
    const [attachments] = await db.query(
      'SELECT * FROM attachments WHERE id = ? AND bug_id = ?',
      [attachmentId, resolvedBugId]
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

    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

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
    `, [bugId]);
    
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

    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    if (!comment_text || comment_text.trim() === '') {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    // Verify bug exists and get details for notification
    const [bugs] = await db.query('SELECT id, title, assigned_to, reported_by FROM bugs WHERE id = ?', [bugId]);
    if (bugs.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const bug = bugs[0];
    
    // If parent_id is provided, verify it exists and belongs to the same bug
    if (parent_id) {
      const [parentComments] = await db.query(
        'SELECT id FROM bug_comments WHERE id = ? AND bug_id = ?',
        [parent_id, bugId]
      );
      if (parentComments.length === 0) {
        return res.status(400).json({ error: 'Parent comment not found or does not belong to this bug' });
      }
    }

    // Insert comment
    const [result] = await db.query(`
      INSERT INTO bug_comments (bug_id, user_id, parent_id, comment_text)
      VALUES (?, ?, ?, ?)
    `, [bugId, userId, parent_id || null, comment_text.trim()]);
    
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
      parent_id || null,
      bug.assigned_to,
      bug.reported_by
    );
    
    res.status(201).json({ data: newComments[0] });
  } catch (error) {
    logger.error('Error creating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/bugs/{id}:
 *   delete:
 *     summary: Delete a bug
 *     tags: [Bugs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Bug ID
 *     responses:
 *       200:
 *         description: Bug deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden - Only Team Leaders and Super Admins can delete bugs
 *       404:
 *         description: Bug not found
 *       500:
 *         description: Server error
 */
// Delete bug - only Team Leader and Super Admin OR bugs.delete permission
const deleteRoles = ['Team Leader', 'Team Lead', 'Super Admin'];
router.delete('/:id', checkBugPermission('bugs.delete', deleteRoles), async (req, res) => {


  try {
    const { id } = req.params;

    // Resolve UUID to numeric ID if needed
    const { resolveIdFromUuid } = await import('../utils/uuidResolver.js');
    const bugId = await resolveIdFromUuid('bugs', id);
    if (!bugId) {
      return res.status(404).json({ error: 'Bug not found' });
    }

    // Get before data for audit log
    const [existingBugs] = await db.query('SELECT * FROM bugs WHERE id = ?', [bugId]);
    if (existingBugs.length === 0) {
      return res.status(404).json({ error: 'Bug not found' });
    }
    const beforeData = existingBugs[0];
    
    // Delete associated attachments first
    const [attachments] = await db.query('SELECT path FROM attachments WHERE bug_id = ?', [bugId]);
    attachments.forEach((att) => {
      if (fs.existsSync(att.path)) {
        fs.unlinkSync(att.path);
      }
    });
    await db.query('DELETE FROM attachments WHERE bug_id = ?', [bugId]);
    await db.query('DELETE FROM bugs WHERE id = ?', [bugId]);

    // Create audit log for bug deletion
    await logDelete(req, 'Bugs', bugId, beforeData, 'Bug');
    
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

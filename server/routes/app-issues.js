import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput, validateAndSanitizeObject } from '../utils/inputValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { createNotification } from '../utils/notificationService.js';

const router = express.Router();

// Debug routes - no authentication required
router.get('/debug/test', (req, res) => {
  res.json({
    message: 'Debug route is working',
    timestamp: new Date().toISOString(),
    route: '/api/admin/app-issues/debug/test'
  });
});

router.get('/debug/uuid/:uuid', async (req, res) => {
  try {
    const { uuid } = req.params;

    logger.debug('=== DEBUG UUID CHECK START ===');
    logger.debug('Checking UUID:', uuid);

    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.user_id, ai.assigned_to,
        ai.status, ai.is_anonymous, ai.created_at,
        u.name as creator_name,
        au.name as assigned_to_name
      FROM app_issues ai
      LEFT JOIN users u ON ai.user_id = u.id AND ai.is_anonymous = 0
      LEFT JOIN users au ON ai.assigned_to = au.id
      WHERE ai.uuid = ?
    `, [uuid]);

    logger.debug('UUID check result count:', issues.length);

    if (issues.length === 0) {
      return res.json({
        found: false,
        message: 'UUID not found in database',
        uuid: uuid
      });
    }

    const issue = issues[0];
    res.json({
      found: true,
      uuid: uuid,
      issue: {
        id: issue.id,
        title: issue.title,
        user_id: issue.user_id,
        assigned_to: issue.assigned_to,
        status: issue.status,
        is_anonymous: issue.is_anonymous,
        creator_name: issue.creator_name,
        assigned_to_name: issue.assigned_to_name,
        created_at: issue.created_at
      }
    });

  } catch (error) {
    logger.error('Error checking UUID:', error);
    res.status(500).json({
      error: 'Failed to check UUID',
      details: error.message
    });
  }
});

// Apply authentication to all routes
router.use(authenticate);

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'server', 'uploads', 'app-issues');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * @swagger
 * /api/app-issues:
 *   post:
 *     summary: Create a new app issue
 *     tags: [App Issues]
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
 *               - description
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               issue_type:
 *                 type: string
 *                 enum: [bug, feedback]
 *               is_anonymous:
 *                 type: boolean
 *               attachments:
 *                 type: array
 *                 items:
 *                   type: string
 *                   format: binary
 *     responses:
 *       201:
 *         description: App issue created successfully
 *       400:
 *         description: Invalid input
 *       401:
 *         description: Unauthorized
 */
router.post('/', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    logger.debug('=== CREATE APP ISSUE REQUEST ===');
    logger.debug('Request body:', req.body);
    logger.debug('Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files');
    logger.debug('User:', req.user);

    // Validate and sanitize text inputs
    const textFields = ['title', 'description'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({
        error: 'Invalid input detected',
        details: validation.errors.join('; ')
      });
    }

    const { title, description, issue_type = 'bug', is_anonymous = 'false' } = req.body;
    const isAnonymous = is_anonymous === 'true';
    const userId = req.user.id;

    if (!title || !description) {
      return res.status(400).json({ error: 'Title and description are required' });
    }

    // Generate UUID
    const uuid = uuidv4();

    // Start transaction
    const connection = await db.getConnection();
    await connection.beginTransaction();

    try {
      // Insert app issue
      const [result] = await connection.query(`
        INSERT INTO app_issues (
          uuid, user_id, title, description, issue_type, status, is_anonymous
        ) VALUES (?, ?, ?, ?, ?, 'open', ?)
      `, [uuid, userId, title, description, issue_type, isAnonymous ? 1 : 0]);

      const issueId = result.insertId;

      // Handle attachments if any
      if (req.files && req.files.length > 0) {
        for (const file of req.files) {
          const fileUrl = `/uploads/app-issues/${file.filename}`;
          await connection.query(`
            INSERT INTO app_issue_attachments (issue_id, file_url) VALUES (?, ?)
          `, [issueId, fileUrl]);
        }
      }

      // Log the creation
      await logCreate(req.user.id, 'app_issues', issueId, {
        title, description, issue_type, is_anonymous
      });

      // Notify admins about new app issue
      const [admins] = await connection.query(`
        SELECT id FROM users WHERE role_id IN (
          SELECT id FROM roles WHERE name IN ('Super Admin', 'Admin')
        )
      `);

      for (const admin of admins) {
        await createNotification(
          admin.id,
          'app_issue_created',
          'New App Issue Reported',
          `A new ${issue_type} has been reported: ${title}`,
          { issue_uuid: uuid, issue_id: issueId },
          true
        );
      }

      await connection.commit();

      res.status(201).json({
        message: 'App issue created successfully',
        data: {
          id: issueId,
          uuid,
          title,
          description,
          issue_type,
          status: 'open',
          is_anonymous: isAnonymous,
          created_at: new Date()
        }
      });

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }

  } catch (error) {
    logger.error('Error creating app issue:', error);
    res.status(500).json({ error: 'Failed to create app issue' });
  }
});

/**
 * @swagger
 * /api/app-issues/my:
 *   get:
 *     summary: Get user's own app issues
 *     tags: [App Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of user's app issues
 */
router.get('/my', authenticate, async (req, res) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.description, ai.issue_type,
        ai.status, ai.is_anonymous, ai.assigned_to,
        ai.created_at, ai.updated_at,
        COUNT(aia.id) as attachment_count,
        COUNT(air.id) as reply_count
      FROM app_issues ai
      LEFT JOIN app_issue_attachments aia ON ai.id = aia.issue_id
      LEFT JOIN app_issue_replies air ON ai.id = air.issue_id
      WHERE ai.user_id = ? OR ai.assigned_to = ?
      GROUP BY ai.id
      ORDER BY ai.created_at DESC
      LIMIT ? OFFSET ?
    `, [userId, userId, limit, offset]);

    const [totalResult] = await db.query(`
      SELECT COUNT(*) as total FROM app_issues WHERE user_id = ? OR assigned_to = ?
    `, [userId, userId]);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: issues,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching user app issues:', error);
    res.status(500).json({ error: 'Failed to fetch app issues' });
  }
});

/**
 * @swagger
 * /api/app-issues/{uuid}:
 *   get:
 *     summary: Get app issue by UUID
 *     tags: [App Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: uuid
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App issue details
 *       404:
 *         description: App issue not found
 */

/**
 * @swagger
 * /api/app-issues/all:
 *   get:
 *     summary: Get all app issues (for duplicate prevention)
 *     tags: [App Issues]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: List of all app issues
 */
router.get('/all', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.description, ai.issue_type,
        ai.status, ai.is_anonymous,
        ai.created_at, ai.updated_at,
        CASE WHEN ai.is_anonymous = 1 THEN 'Anonymous User' ELSE u.name END as submitted_by,
        COUNT(DISTINCT aia.id) as attachment_count,
        COUNT(DISTINCT air.id) as reply_count
      FROM app_issues ai
      LEFT JOIN users u ON ai.user_id = u.id AND ai.is_anonymous = 0
      LEFT JOIN app_issue_attachments aia ON ai.id = aia.issue_id
      LEFT JOIN app_issue_replies air ON ai.id = air.issue_id
      GROUP BY ai.id
      ORDER BY ai.created_at DESC
      LIMIT ? OFFSET ?
    `, [limit, offset]);

    const [totalResult] = await db.query(`
      SELECT COUNT(*) as total FROM app_issues
    `);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: issues,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching all app issues:', error);
    res.status(500).json({ error: 'Failed to fetch app issues' });
  }
});


// Debug route to check all app issues
router.get('/debug/all', authenticate, async (req, res) => {
  try {
    logger.debug('=== DEBUG APP ISSUES REQUEST ===');
    logger.debug('User:', req.user.name, 'Role:', req.user.role, 'ID:', req.user.id);

    // First check if table exists
    const [tables] = await db.query(`
      SHOW TABLES LIKE 'app_issues'
    `);

    if (tables.length === 0) {
      return res.json({
        message: 'App issues table does not exist',
        table_exists: false,
        recommendation: 'Run database schema migration for app_issues tables',
        schema_file: 'database/schema/05_schema_app_issues.sql'
      });
    }

    const [issues] = await db.query(`
      SELECT id, uuid, title, user_id, issue_type, status, created_at
      FROM app_issues
      ORDER BY created_at DESC
      LIMIT 20
    `);

    res.json({
      message: 'App issues table exists',
      table_exists: true,
      count: issues.length,
      issues: issues,
      recommendation: issues.length === 0
        ? 'No app issues created yet. Users need to submit issues first via the Report App Issue page.'
        : null,
      sample_urls: issues.length > 0
        ? issues.slice(0, 3).map(issue => `/admin/app-issues/${issue.uuid}`)
        : null
    });
  } catch (error) {
    logger.error('Error fetching debug app issues:', error);
    res.status(500).json({
      error: 'Failed to fetch app issues',
      details: error.message,
      recommendation: 'Check database connection and schema. Make sure app_issues table exists.'
    });
  }
});

/**
 * @swagger
 * /api/admin/app-issues/{uuid}:
 *   get:
 *     summary: Get app issue details (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:uuid', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;

    logger.debug('=== ADMIN GET APP ISSUE START ===');
    logger.debug('UUID:', uuid);
    logger.debug('User:', req.user?.name, 'Role:', req.user?.role);

    logger.debug('Executing admin query for UUID:', uuid);

    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.description, ai.issue_type,
        ai.status, ai.is_anonymous,
        ai.assigned_to, ai.created_at, ai.updated_at,
        CASE WHEN ai.is_anonymous = 1 THEN 'Anonymous User' ELSE u.name END as submitted_by,
        au.name as assigned_to_name
      FROM app_issues ai
      LEFT JOIN users u ON ai.user_id = u.id AND ai.is_anonymous = 0
      LEFT JOIN users au ON ai.assigned_to = au.id
      WHERE ai.uuid = ?
    `, [uuid]);

    logger.debug('Admin query result count:', issues.length);
    if (issues.length === 0) {
      logger.debug('No issues found for UUID:', uuid);
      // Let's check if the table exists and has any data
      const [tableCheck] = await db.query(`SHOW TABLES LIKE 'app_issues'`);
      logger.debug('Table exists:', tableCheck.length > 0);

      if (tableCheck.length > 0) {
        const [countCheck] = await db.query(`SELECT COUNT(*) as total FROM app_issues`);
        logger.debug('Total issues in table:', countCheck[0].total);

        // Show first few UUIDs for debugging
        const [sampleIssues] = await db.query(`SELECT uuid, user_id FROM app_issues LIMIT 5`);
        logger.debug('Sample UUIDs in database:', sampleIssues.map(issue => ({ uuid: issue.uuid, user_id: issue.user_id })));
      }
    }

    if (issues.length === 0) {
      logger.debug('No app issue found with UUID:', uuid);
      return res.status(404).json({ error: 'App issue not found' });
    }

    const issue = issues[0];

    // Get attachments
    const [attachments] = await db.query(`
      SELECT id, file_url, created_at
      FROM app_issue_attachments
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `, [issue.id]);

    // Get replies with user info (hide identity for anonymous issues)
    const [replies] = await db.query(`
      SELECT
        air.id, air.message, air.created_at,
        CASE WHEN ai.is_anonymous = 1 THEN 'Anonymous User' ELSE u.name END as user_name,
        u.id as user_id
      FROM app_issue_replies air
      JOIN users u ON air.user_id = u.id
      JOIN app_issues ai ON air.issue_id = ai.id
      WHERE air.issue_id = ?
      ORDER BY air.created_at ASC
    `, [issue.id]);

    res.json({
      data: {
        ...issue,
        attachments,
        replies
      }
    });

  } catch (error) {
    logger.error('Error fetching admin app issue:', error);
    res.status(500).json({ error: 'Failed to fetch app issue' });
  }
});

router.get('/:uuid', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    logger.debug('Executing user query for UUID:', uuid, 'User ID:', userId);

    // First check if the UUID exists at all
    const [uuidCheck] = await db.query(`
      SELECT id, user_id, assigned_to, title
      FROM app_issues
      WHERE uuid = ?
    `, [uuid]);

    logger.debug('UUID exists check:', uuidCheck.length > 0 ? 'YES' : 'NO');
    if (uuidCheck.length > 0) {
      logger.debug('Issue details:', {
        id: uuidCheck[0].id,
        user_id: uuidCheck[0].user_id,
        assigned_to: uuidCheck[0].assigned_to,
        title: uuidCheck[0].title
      });
      logger.debug('User can access?', uuidCheck[0].user_id === userId || uuidCheck[0].assigned_to === userId);
    }

    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.description, ai.issue_type,
        ai.status, ai.is_anonymous,
        ai.assigned_to, ai.created_at, ai.updated_at,
        u.name as assigned_to_name,
        COUNT(DISTINCT aia.id) as attachment_count
      FROM app_issues ai
      LEFT JOIN users u ON ai.assigned_to = u.id
      LEFT JOIN app_issue_attachments aia ON ai.id = aia.issue_id
      WHERE ai.uuid = ? AND (ai.user_id = ? OR ai.assigned_to = ?)
      GROUP BY ai.id
      LIMIT 1
    `, [uuid, userId, userId]);

    logger.debug('User query result count:', issues.length);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found' });
    }

    const issue = issues[0];

    // Get attachments
    const [attachments] = await db.query(`
      SELECT id, file_url, created_at
      FROM app_issue_attachments
      WHERE issue_id = ?
      ORDER BY created_at ASC
    `, [issue.id]);

    // Get replies
    const [replies] = await db.query(`
      SELECT
        air.id, air.message, air.created_at,
        u.name as user_name, u.id as user_id
      FROM app_issue_replies air
      JOIN users u ON air.user_id = u.id
      WHERE air.issue_id = ?
      ORDER BY air.created_at ASC
    `, [issue.id]);

    res.json({
      data: {
        ...issue,
        attachments,
        replies
      }
    });

  } catch (error) {
    logger.error('Error fetching app issue:', error);
    res.status(500).json({ error: 'Failed to fetch app issue' });
  }
});

/**
 * @swagger
 * /api/app-issues/{uuid}/attachments:
 *   post:
 *     summary: Upload attachment to app issue
 *     tags: [App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:uuid/attachments', authenticate, upload.array('attachments', 5), async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    // Verify ownership
    const [issues] = await db.query(`
      SELECT id FROM app_issues WHERE uuid = ? AND user_id = ?
    `, [uuid, userId]);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found or access denied' });
    }

    const issueId = issues[0].id;

    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = [];
    for (const file of req.files) {
      const fileUrl = `/uploads/app-issues/${file.filename}`;
      const [result] = await db.query(`
        INSERT INTO app_issue_attachments (issue_id, file_url) VALUES (?, ?)
      `, [issueId, fileUrl]);

      attachments.push({
        id: result.insertId,
        file_url: fileUrl,
        created_at: new Date()
      });
    }

    res.json({
      message: 'Attachments uploaded successfully',
      data: attachments
    });

  } catch (error) {
    logger.error('Error uploading attachments:', error);
    res.status(500).json({ error: 'Failed to upload attachments' });
  }
});

/**
 * @swagger
 * /api/app-issues/{uuid}/replies:
 *   get:
 *     summary: Get replies for app issue
 *     tags: [App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.get('/:uuid/replies', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const userId = req.user.id;

    // Verify access
    const [issues] = await db.query(`
      SELECT id FROM app_issues WHERE uuid = ? AND (user_id = ? OR assigned_to = ?)
    `, [uuid, userId, userId]);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found or access denied' });
    }

    const [replies] = await db.query(`
      SELECT
        air.id, air.message, air.created_at,
        u.name as user_name, u.id as user_id
      FROM app_issue_replies air
      JOIN users u ON air.user_id = u.id
      WHERE air.issue_id = ?
      ORDER BY air.created_at ASC
    `, [issues[0].id]);

    res.json({ data: replies });

  } catch (error) {
    logger.error('Error fetching replies:', error);
    res.status(500).json({ error: 'Failed to fetch replies' });
  }
});

// ================================
// ADMIN ROUTES
// ================================


/**
 * @swagger
 * /api/admin/app-issues:
 *   get:
 *     summary: Get all app issues (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.get('/', authenticate, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    const { status, issue_type, is_anonymous, converted } = req.query;

    let whereClause = '';
    let params = [];

    if (status) {
      whereClause += ' AND ai.status = ?';
      params.push(status);
    }

    if (issue_type) {
      whereClause += ' AND ai.issue_type = ?';
      params.push(issue_type);
    }

    if (is_anonymous !== undefined) {
      whereClause += ' AND ai.is_anonymous = ?';
      params.push(is_anonymous === 'true' ? 1 : 0);
    }


    const [issues] = await db.query(`
      SELECT
        ai.id, ai.uuid, ai.title, ai.issue_type, ai.status,
        ai.is_anonymous, ai.auto_bug_created, ai.linked_bug_id,
        ai.assigned_to, ai.created_at, ai.updated_at,
        CASE WHEN ai.is_anonymous = 1 THEN 'Anonymous User' ELSE u.name END as submitted_by,
        au.name as assigned_to_name,
        COUNT(DISTINCT aia.id) as attachment_count,
        COUNT(DISTINCT air.id) as reply_count
      FROM app_issues ai
      LEFT JOIN users u ON ai.user_id = u.id AND ai.is_anonymous = 0
      LEFT JOIN users au ON ai.assigned_to = au.id
      LEFT JOIN app_issue_attachments aia ON ai.id = aia.issue_id
      LEFT JOIN app_issue_replies air ON ai.id = air.issue_id
      WHERE 1=1 ${whereClause}
      GROUP BY ai.id
      ORDER BY ai.created_at DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset]);

    const [totalResult] = await db.query(`
      SELECT COUNT(*) as total FROM app_issues ai WHERE 1=1 ${whereClause}
    `, params);

    const total = totalResult[0].total;
    const totalPages = Math.ceil(total / limit);

    res.json({
      data: issues,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });

  } catch (error) {
    logger.error('Error fetching admin app issues:', error);
    res.status(500).json({ error: 'Failed to fetch app issues' });
  }
});


/**
 * @swagger
 * /api/admin/app-issues/{uuid}/reply:
 *   post:
 *     summary: Add reply to app issue (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.post('/:uuid/reply', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { message } = req.body;
    const adminId = req.user.id;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get issue details
    const [issues] = await db.query(`
      SELECT id, user_id, is_anonymous FROM app_issues WHERE uuid = ?
    `, [uuid]);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found' });
    }

    const issue = issues[0];

    // Add reply
    const [result] = await db.query(`
      INSERT INTO app_issue_replies (issue_id, user_id, message) VALUES (?, ?, ?)
    `, [issue.id, adminId, message]);

    // Notify the original user (even if anonymous)
    if (issue.user_id !== adminId) { // Don't notify if admin is replying to themselves
      await createNotification(
        issue.user_id,
        'app_issue_reply',
        'Admin Reply to Your App Issue',
        `An admin has replied to your ${issue.issue_type}: ${issues[0].title}`,
        { issue_uuid: uuid, reply_id: result.insertId },
        true
      );
    }

    // Log the reply
    await logCreate(adminId, 'app_issue_replies', result.insertId, { message });

    res.json({
      message: 'Reply added successfully',
      data: {
        id: result.insertId,
        message,
        created_at: new Date()
      }
    });

  } catch (error) {
    logger.error('Error adding reply:', error);
    res.status(500).json({ error: 'Failed to add reply' });
  }
});

/**
 * @swagger
 * /api/admin/app-issues/{uuid}/status:
 *   put:
 *     summary: Update app issue status (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:uuid/status', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { status } = req.body;
    const adminId = req.user.id;

    const validStatuses = ['open', 'in_review', 'assigned', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    // Get issue details
    const [issues] = await db.query(`
      SELECT id, user_id, status as old_status, title FROM app_issues WHERE uuid = ?
    `, [uuid]);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found' });
    }

    const issue = issues[0];

    // Update status
    await db.query(`
      UPDATE app_issues SET status = ?, updated_at = NOW() WHERE id = ?
    `, [status, issue.id]);

    // Log the update
    await logUpdate(adminId, 'app_issues', issue.id, { status: issue.old_status }, { status });

    // Notify the user about status change
    await createNotification(
      issue.user_id,
      'app_issue_status_update',
      'App Issue Status Updated',
      `Your ${issue.title} status has been updated to ${status}`,
      { issue_uuid: uuid, old_status: issue.old_status, new_status: status },
      true
    );

    res.json({ message: 'Status updated successfully' });

  } catch (error) {
    logger.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
});

/**
 * @swagger
 * /api/admin/app-issues/{uuid}/assign:
 *   put:
 *     summary: Assign app issue to user (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */
router.put('/:uuid/assign', authenticate, async (req, res) => {
  try {
    const { uuid } = req.params;
    const { assigned_to } = req.body;
    const adminId = req.user.id;

    // Get issue details
    const [issues] = await db.query(`
      SELECT id, user_id, assigned_to as old_assigned_to, title FROM app_issues WHERE uuid = ?
    `, [uuid]);

    if (issues.length === 0) {
      return res.status(404).json({ error: 'App issue not found' });
    }

    const issue = issues[0];

    // Update assignment
    await db.query(`
      UPDATE app_issues SET assigned_to = ?, updated_at = NOW() WHERE id = ?
    `, [assigned_to || null, issue.id]);

    // Log the update
    await logUpdate(adminId, 'app_issues', issue.id, { assigned_to: issue.old_assigned_to }, { assigned_to });

    // Notify the assigned user
    if (assigned_to && assigned_to !== adminId) {
      await createNotification(
        assigned_to,
        'app_issue_assigned',
        'App Issue Assigned',
        `You have been assigned to handle: ${issue.title}`,
        { issue_uuid: uuid },
        true
      );
    }

    res.json({ message: 'Assignment updated successfully' });

  } catch (error) {
    logger.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Failed to update assignment' });
  }
});

/**
 * @swagger
 * /api/admin/app-issues/{uuid}/convert-to-bug:
 *   post:
 *     summary: Convert app issue to bug (Admin)
 *     tags: [Admin - App Issues]
 *     security:
 *       - bearerAuth: []
 */

export default router;

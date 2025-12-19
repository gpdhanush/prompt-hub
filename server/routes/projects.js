import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyProjectAssigned, notifyProjectComment } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';
import { sanitizeInput, validateAndSanitizeObject } from '../utils/inputValidation.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(process.cwd(), 'uploads', 'projects');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `project-${uniqueSuffix}${path.extname(file.originalname)}`);
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
    'application/zip',
    'application/x-zip-compressed',
    'text/plain',
    'text/csv'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: fileFilter
});

// Apply authentication to all routes
router.use(authenticate);

// Get all projects - check for projects.view permission
router.get('/', requirePermission('projects.view'), async (req, res) => {
  try {
    const { page = 1, limit = 10, my_projects } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    logger.debug('=== PROJECTS LIST REQUEST ===');
    logger.debug('Full query params:', req.query);
    logger.debug('my_projects query param:', my_projects);
    logger.debug('my_projects type:', typeof my_projects);
    logger.debug('userId:', userId);
    logger.debug('userRole:', userRole);
    
    // Check database connection
    if (!db || !db.query) {
      logger.error('Database connection not available');
      return res.status(503).json({ 
        error: 'Database service unavailable',
        message: 'Unable to connect to database. Please try again later.',
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    let query = `
      SELECT DISTINCT
        p.*,
        u1.name as created_by_name,
        u1.email as created_by_email,
        u2.name as updated_by_name,
        u2.email as updated_by_email,
        tl.name as team_lead_name,
        tl.email as team_lead_email,
        (SELECT COUNT(*) FROM project_users WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN users tl ON p.team_lead_id = tl.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by user's projects only if my_projects filter is explicitly set and truthy
    // Check for string values like 'true', '1', or actual truthy values
    // Convert to string for consistent comparison
    const myProjectsStr = String(my_projects || '');
    const shouldFilterMyProjects = my_projects !== undefined && 
      my_projects !== null &&
      myProjectsStr !== 'false' && 
      myProjectsStr !== '0' && 
      myProjectsStr !== '' &&
      myProjectsStr !== 'undefined' &&
      (myProjectsStr === 'true' || myProjectsStr === '1' || Number(myProjectsStr) === 1) &&
      userId;
    
    logger.debug('shouldFilterMyProjects:', shouldFilterMyProjects);
    logger.debug('my_projects value:', my_projects, 'type:', typeof my_projects);
    
    if (shouldFilterMyProjects) {
      logger.debug('Applying "My Projects" filter');
      // Show projects where user is team lead, project admin, creator, or assigned member
      query += ` AND (
        p.team_lead_id = ? OR 
        p.project_admin_id = ? OR 
        p.created_by = ? OR
        pu.user_id = ?
      )`;
      params.push(userId, userId, userId, userId);
    } else {
      logger.debug('Showing ALL projects (no filter applied)');
    }
    // For "all" view, all authenticated users see all projects - no role-based filtering
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    let projects, countResult, total;
    
    try {
      [projects] = await db.query(query, params);
    } catch (dbError) {
      logger.error('Database query error (projects):', dbError);
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'PROTOCOL_CONNECTION_LOST') {
        return res.status(503).json({ 
          error: 'Database connection lost',
          message: 'Unable to connect to database. Please try again later.',
          code: 'DB_CONNECTION_LOST'
        });
      }
      throw dbError;
    }
    
    // Count query
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total 
      FROM projects p
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE 1=1
    `;
    const countParams = [];
    
    // Use same filter logic for count query
    const myProjectsStrCount = String(my_projects || '');
    const shouldFilterMyProjectsCount = my_projects !== undefined && 
      my_projects !== null &&
      myProjectsStrCount !== 'false' && 
      myProjectsStrCount !== '0' && 
      myProjectsStrCount !== '' &&
      myProjectsStrCount !== 'undefined' &&
      (myProjectsStrCount === 'true' || myProjectsStrCount === '1' || Number(myProjectsStrCount) === 1) &&
      userId;
    
    if (shouldFilterMyProjectsCount) {
      countQuery += ` AND (
        p.team_lead_id = ? OR 
        p.project_admin_id = ? OR 
        p.created_by = ? OR
        pu.user_id = ?
      )`;
      countParams.push(userId, userId, userId, userId);
    }
    // For "all" view, all authenticated users see all projects - no role-based filtering
    
    try {
      [countResult] = await db.query(countQuery, countParams);
      total = countResult[0]?.total || 0;
    } catch (dbError) {
      logger.error('Database query error (count):', dbError);
      if (dbError.code === 'ECONNREFUSED' || dbError.code === 'PROTOCOL_CONNECTION_LOST') {
        return res.status(503).json({ 
          error: 'Database connection lost',
          message: 'Unable to connect to database. Please try again later.',
          code: 'DB_CONNECTION_LOST'
        });
      }
      throw dbError;
    }
    
    logger.debug('Total projects found:', total);
    logger.debug('Projects returned:', projects.length);
    
    res.json({
      data: projects || [],
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    logger.error('Error in GET /projects:', error);
    
    // Handle specific database errors
    if (error.code === 'ECONNREFUSED' || error.code === 'PROTOCOL_CONNECTION_LOST') {
      return res.status(503).json({ 
        error: 'Database service unavailable',
        message: 'Unable to connect to database. Please try again later.',
        code: 'DB_CONNECTION_ERROR'
      });
    }
    
    // Handle SQL errors
    if (error.code && error.code.startsWith('ER_')) {
      logger.error('SQL Error:', error);
      return res.status(500).json({ 
        error: 'Database query error',
        message: 'An error occurred while fetching projects. Please contact support.',
        code: 'SQL_ERROR'
      });
    }
    
    // Generic error
    res.status(500).json({ 
      error: error.message || 'Internal server error',
      message: 'An unexpected error occurred. Please try again later.',
      code: 'INTERNAL_ERROR'
    });
  }
});

// Get project by ID - check for projects.view permission
router.get('/:id', requirePermission('projects.view'), async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT 
        p.*,
        u1.name as created_by_name,
        u1.email as created_by_email,
        u2.name as updated_by_name,
        u2.email as updated_by_email,
        tl.name as team_lead_name,
        tl.email as team_lead_email,
        tl_emp.profile_photo_url as team_lead_photo_url
      FROM projects p
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN users tl ON p.team_lead_id = tl.id
      LEFT JOIN employees tl_emp ON tl.id = tl_emp.user_id
      WHERE p.id = ?
    `, [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
    
    // Fetch project members with roles
    const [members] = await db.query(
      'SELECT user_id, role_in_project FROM project_users WHERE project_id = ?',
      [req.params.id]
    );
    
    // Fetch milestones
    const [milestones] = await db.query(
      'SELECT * FROM project_milestones WHERE project_id = ? ORDER BY start_date ASC',
      [req.params.id]
    );
    
    // Fetch project files
    const [files] = await db.query(
      'SELECT * FROM project_files WHERE project_id = ?',
      [req.params.id]
    );
    
    const projectData = projects[0];
    projectData.member_ids = members.map((m) => m.user_id.toString());
    projectData.member_roles = members.reduce((acc, m) => {
      // Store with both number and string keys for compatibility
      acc[m.user_id] = m.role_in_project;
      acc[m.user_id.toString()] = m.role_in_project;
      return acc;
    }, {});
    projectData.milestones = milestones;
    projectData.files = files;
    
    res.json({ data: projectData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project - check for projects.create permission
router.post('/', requirePermission('projects.create'), async (req, res) => {
  try {
    // Validate and sanitize text inputs
    const textFields = ['name', 'description', 'client_name', 'client_contact_person', 'client_email', 
      'internal_notes', 'client_notes', 'admin_remarks', 'github_repo_url', 'bitbucket_repo_url', 
      'technologies_used', 'estimated_delivery_plan'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let {
      name, description, status, start_date, end_date, team_lead_id, member_ids, member_roles,
      logo_url, estimated_delivery_plan,
      client_name, client_contact_person, client_email, client_phone, is_internal,
      target_end_date, actual_end_date,
      risk_level, priority, progress,
      daily_reporting_required, report_submission_time, auto_reminder_notifications,
      internal_notes, client_notes, admin_remarks,
      github_repo_url, bitbucket_repo_url, technologies_used,
      milestones
    } = req.body;
    
    // Use sanitized values
    name = validation.data.name || name;
    description = validation.data.description || description;
    client_name = validation.data.client_name || client_name;
    client_contact_person = validation.data.client_contact_person || client_contact_person;
    client_email = validation.data.client_email || client_email;
    internal_notes = validation.data.internal_notes || internal_notes;
    client_notes = validation.data.client_notes || client_notes;
    admin_remarks = validation.data.admin_remarks || admin_remarks;
    github_repo_url = validation.data.github_repo_url || github_repo_url;
    bitbucket_repo_url = validation.data.bitbucket_repo_url || bitbucket_repo_url;
    technologies_used = validation.data.technologies_used || technologies_used;
    estimated_delivery_plan = validation.data.estimated_delivery_plan || estimated_delivery_plan;
    
    // Valid status values matching database ENUM
    const validStatuses = ['Not Started', 'Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold', 'Cancelled'];
    
    // Normalize status - map old/invalid values to valid ones
    let normalizedStatus = status || 'Not Started';
    const statusMap = {
      'Development': 'In Progress',
      'Dev': 'In Progress',
      'In-Progress': 'In Progress',
      'PreProd': 'Pre-Prod',
      'Pre Prod': 'Pre-Prod',
    };
    
    if (statusMap[normalizedStatus]) {
      normalizedStatus = statusMap[normalizedStatus];
    }
    
    // Validate status is in allowed values
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ 
        error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}` 
      });
    }
    
    // Calculate project duration if start_date and end_date are provided
    let project_duration_days = null;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      project_duration_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    // Generate project code (PRJ-001, PRJ-002, etc.)
    const [maxCodeResult] = await db.query(`
      SELECT project_code FROM projects 
      WHERE project_code LIKE 'PRJ-%' 
      ORDER BY CAST(SUBSTRING(project_code, 5) AS UNSIGNED) DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    if (maxCodeResult.length > 0 && maxCodeResult[0].project_code) {
      const lastCode = maxCodeResult[0].project_code;
      const lastNumber = parseInt(lastCode.replace('PRJ-', '')) || 0;
      nextNumber = lastNumber + 1;
    }
    
    const projectCode = `PRJ-${String(nextNumber).padStart(3, '0')}`;
    const created_by = req.user.id;
    const final_team_lead_id = team_lead_id || (req.user.role === 'Team Leader' || req.user.role === 'Team Lead' ? req.user.id : null);
    
    logger.debug('Creating project with data:', {
      projectCode,
      name,
      created_by,
      final_team_lead_id
    });
    
    const [result] = await db.query(`
      INSERT INTO projects (
        project_code, name, description, logo_url, estimated_delivery_plan,
        client_name, client_contact_person, client_email, client_phone, is_internal,
        start_date, end_date, target_end_date, actual_end_date, project_duration_days,
        status, progress, risk_level, priority,
        daily_reporting_required, report_submission_time, auto_reminder_notifications,
        internal_notes, client_notes, admin_remarks,
      github_repo_url, bitbucket_repo_url, technologies_used,
      created_by, team_lead_id
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      projectCode, name, description || null, logo_url || null, estimated_delivery_plan || null,
      client_name || null, client_contact_person || null, client_email || null, client_phone || null, is_internal || false,
      start_date || null, end_date || null, target_end_date || null, actual_end_date || null, project_duration_days,
      normalizedStatus, progress || 0, (risk_level && risk_level.trim() !== '') ? risk_level : null, (priority && priority.trim() !== '') ? priority : null,
      daily_reporting_required || false, report_submission_time || null, auto_reminder_notifications || false,
      internal_notes || null, client_notes || null, admin_remarks || null,
      github_repo_url || null, bitbucket_repo_url || null, technologies_used ? JSON.stringify(technologies_used) : null,
      created_by, final_team_lead_id || null
    ]);
    
    logger.debug('INSERT result:', result);
    logger.debug('result.insertId:', result.insertId);
    logger.debug('result.affectedRows:', result.affectedRows);
    
    // Check if INSERT was successful
    if (!result.affectedRows || result.affectedRows === 0) {
      logger.error('INSERT failed - no rows affected. Result:', result);
      return res.status(500).json({ 
        error: 'Failed to create project',
        details: 'The project could not be inserted into the database.'
      });
    }
    
    let projectId = result.insertId;
    
    // Validate that we got a valid insertId
    if (!projectId || projectId === 0) {
      logger.error('Failed to get valid insertId from INSERT. Result:', result);
      // Try to get LAST_INSERT_ID() as first fallback
      try {
        const [lastInsertResult] = await db.query('SELECT LAST_INSERT_ID() as id');
        if (lastInsertResult && lastInsertResult[0] && lastInsertResult[0].id > 0) {
          projectId = lastInsertResult[0].id;
          logger.warn('Using LAST_INSERT_ID() fallback. Project ID:', projectId);
        } else {
          // Try to get the project by project_code as second fallback
          const [fallbackProject] = await db.query('SELECT * FROM projects WHERE project_code = ? ORDER BY id DESC LIMIT 1', [projectCode]);
          if (fallbackProject.length > 0) {
            const fallbackId = fallbackProject[0].id;
            logger.warn('Using project_code fallback. Project ID:', fallbackId);
            if (fallbackId && fallbackId > 0) {
              projectId = fallbackId;
            }
          }
        }
      } catch (fallbackError) {
        logger.error('Error in fallback ID retrieval:', fallbackError);
      }
      
      if (!projectId || projectId === 0) {
        return res.status(500).json({ 
          error: 'Failed to create project - could not retrieve project ID',
          details: 'The project may have been created but the ID could not be retrieved. Please check the database and ensure the projects table has AUTO_INCREMENT enabled on the id column.'
        });
      } else {
        logger.info('Successfully retrieved project ID using fallback method:', projectId);
      }
    }
    
    // Add members to project_users table if provided
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const memberPromises = member_ids
        .filter(id => id && id !== '')
        .map((userId, index) => {
          const role = (member_roles && member_roles[userId]) || 'employee';
          return db.query(`
            INSERT INTO project_users (project_id, user_id, role_in_project)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE role_in_project = ?
          `, [projectId, userId, role, role]);
        });
      await Promise.all(memberPromises);
    }
    
    // Add milestones if provided
    if (milestones && Array.isArray(milestones) && milestones.length > 0) {
      const milestonePromises = milestones
        .filter(m => m.name)
        .map(milestone => {
          return db.query(`
            INSERT INTO project_milestones (project_id, name, start_date, end_date, status)
            VALUES (?, ?, ?, ?, ?)
          `, [
            projectId,
            milestone.name,
            milestone.start_date || null,
            milestone.end_date || null,
            milestone.status || 'Not Started'
          ]);
        });
      await Promise.all(milestonePromises);
    }
    
    const [newProject] = await db.query('SELECT * FROM projects WHERE id = ?', [projectId]);
    
    // Create audit log for project creation
    await logCreate(req, 'Projects', projectId, {
      id: projectId,
      project_code: projectCode,
      name: name,
      status: normalizedStatus,
      created_by: created_by
    }, 'Project');
    
    // Notify project members about assignment
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const notificationPromises = member_ids
        .filter(id => id && id !== '')
        .map(userId => 
          notifyProjectAssigned(parseInt(userId), projectId, name, created_by)
        );
      await Promise.allSettled(notificationPromises);
    }
    
    res.status(201).json({ data: newProject[0] });
  } catch (error) {
    logger.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project - check for projects.edit permission
router.put('/:id', requirePermission('projects.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    logger.debug('=== PROJECT UPDATE REQUEST ===');
    logger.debug('Project ID:', id);
    logger.debug('User ID:', userId);
    logger.debug('User Role:', userRole);
    logger.debug('Request body keys:', Object.keys(req.body));
    
    // Validate and sanitize text inputs
    const textFields = ['name', 'description', 'client_name', 'client_contact_person', 'client_email', 
      'internal_notes', 'client_notes', 'admin_remarks', 'github_repo_url', 'bitbucket_repo_url', 
      'technologies_used', 'estimated_delivery_plan'];
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    let {
      name, description, status, start_date, end_date, team_lead_id, member_ids, member_roles,
      logo_url, estimated_delivery_plan,
      client_name, client_contact_person, client_email, client_phone, is_internal,
      target_end_date, actual_end_date,
      risk_level, priority, progress,
      daily_reporting_required, report_submission_time, auto_reminder_notifications,
      internal_notes, client_notes, admin_remarks,
      github_repo_url, bitbucket_repo_url, technologies_used,
      milestones
    } = req.body;
    
    // Use sanitized values
    name = validation.data.name || name;
    description = validation.data.description || description;
    client_name = validation.data.client_name || client_name;
    client_contact_person = validation.data.client_contact_person || client_contact_person;
    client_email = validation.data.client_email || client_email;
    internal_notes = validation.data.internal_notes || internal_notes;
    client_notes = validation.data.client_notes || client_notes;
    admin_remarks = validation.data.admin_remarks || admin_remarks;
    github_repo_url = validation.data.github_repo_url || github_repo_url;
    bitbucket_repo_url = validation.data.bitbucket_repo_url || bitbucket_repo_url;
    technologies_used = validation.data.technologies_used || technologies_used;
    estimated_delivery_plan = validation.data.estimated_delivery_plan || estimated_delivery_plan;
    
    // Get before data for audit log
    const [existingProjects] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existingProjects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const beforeData = existingProjects[0];
    
    // Valid status values matching database ENUM
    const validStatuses = ['Not Started', 'Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold', 'Cancelled'];
    
    // Normalize status - map old/invalid values to valid ones
    let normalizedStatus = status;
    if (normalizedStatus) {
      const statusMap = {
        'Development': 'In Progress',
        'Dev': 'In Progress',
        'In-Progress': 'In Progress',
        'PreProd': 'Pre-Prod',
        'Pre Prod': 'Pre-Prod',
      };
      
      if (statusMap[normalizedStatus]) {
        normalizedStatus = statusMap[normalizedStatus];
      }
      
      // Validate status is in allowed values
      if (!validStatuses.includes(normalizedStatus)) {
        return res.status(400).json({ 
          error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}` 
        });
      }
    }
    
    // Calculate project duration if dates are provided
    let project_duration_days = null;
    if (start_date && end_date) {
      const start = new Date(start_date);
      const end = new Date(end_date);
      project_duration_days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    }
    
    const updated_by = req.user.id;
    
    // Build dynamic update query
    const updateFields = [];
    const updateValues = [];
    
    if (name !== undefined) { updateFields.push('name = ?'); updateValues.push(name); }
    if (description !== undefined) { updateFields.push('description = ?'); updateValues.push(description); }
    if (logo_url !== undefined) { updateFields.push('logo_url = ?'); updateValues.push(logo_url); }
    if (estimated_delivery_plan !== undefined) { updateFields.push('estimated_delivery_plan = ?'); updateValues.push(estimated_delivery_plan); }
    if (client_name !== undefined) { updateFields.push('client_name = ?'); updateValues.push(client_name); }
    if (client_contact_person !== undefined) { updateFields.push('client_contact_person = ?'); updateValues.push(client_contact_person); }
    if (client_email !== undefined) { updateFields.push('client_email = ?'); updateValues.push(client_email); }
    if (client_phone !== undefined) { updateFields.push('client_phone = ?'); updateValues.push(client_phone); }
    if (is_internal !== undefined) { updateFields.push('is_internal = ?'); updateValues.push(is_internal); }
    if (start_date !== undefined) { updateFields.push('start_date = ?'); updateValues.push(start_date || null); }
    if (end_date !== undefined) { updateFields.push('end_date = ?'); updateValues.push(end_date || null); }
    if (target_end_date !== undefined) { updateFields.push('target_end_date = ?'); updateValues.push(target_end_date || null); }
    if (actual_end_date !== undefined) { updateFields.push('actual_end_date = ?'); updateValues.push(actual_end_date || null); }
    if (project_duration_days !== null) { updateFields.push('project_duration_days = ?'); updateValues.push(project_duration_days); }
    if (normalizedStatus !== undefined) { updateFields.push('status = ?'); updateValues.push(normalizedStatus); }
    if (progress !== undefined) { updateFields.push('progress = ?'); updateValues.push(progress); }
    if (risk_level !== undefined) { updateFields.push('risk_level = ?'); updateValues.push(risk_level && risk_level.trim() !== '' ? risk_level : null); }
    if (priority !== undefined) { updateFields.push('priority = ?'); updateValues.push(priority && priority.trim() !== '' ? priority : null); }
    if (daily_reporting_required !== undefined) { updateFields.push('daily_reporting_required = ?'); updateValues.push(daily_reporting_required); }
    if (report_submission_time !== undefined) { updateFields.push('report_submission_time = ?'); updateValues.push(report_submission_time || null); }
    if (auto_reminder_notifications !== undefined) { updateFields.push('auto_reminder_notifications = ?'); updateValues.push(auto_reminder_notifications); }
    if (internal_notes !== undefined) { updateFields.push('internal_notes = ?'); updateValues.push(internal_notes); }
    if (client_notes !== undefined) { updateFields.push('client_notes = ?'); updateValues.push(client_notes); }
    if (admin_remarks !== undefined) { updateFields.push('admin_remarks = ?'); updateValues.push(admin_remarks); }
    if (github_repo_url !== undefined) { updateFields.push('github_repo_url = ?'); updateValues.push(github_repo_url); }
    if (bitbucket_repo_url !== undefined) { updateFields.push('bitbucket_repo_url = ?'); updateValues.push(bitbucket_repo_url); }
    if (technologies_used !== undefined) { updateFields.push('technologies_used = ?'); updateValues.push(technologies_used ? JSON.stringify(technologies_used) : null); }
    if (team_lead_id !== undefined) { updateFields.push('team_lead_id = ?'); updateValues.push(team_lead_id || null); }
    
    updateFields.push('updated_by = ?');
    updateValues.push(updated_by);
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(id);
    
    if (updateFields.length > 2) { // More than just updated_by and updated_at
      logger.debug('Updating project with fields:', updateFields);
      logger.debug('Update values count:', updateValues.length);
      const [result] = await db.query(`
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);
      
      logger.debug('Update result - affectedRows:', result.affectedRows);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
    } else {
      logger.debug('No fields to update (only updated_by and updated_at)');
    }
    
    // Update project members if provided
    // Get existing members before update for notification comparison
    let existingMemberIds = [];
    logger.debug('Processing member_ids - provided:', member_ids !== undefined, 'isArray:', Array.isArray(member_ids));
    if (member_ids !== undefined && Array.isArray(member_ids)) {
      logger.debug('member_ids array length:', member_ids.length);
      logger.debug('member_ids values:', member_ids);
      const [existingMembers] = await db.query(
        'SELECT user_id FROM project_users WHERE project_id = ?',
        [id]
      );
      existingMemberIds = existingMembers.map(m => m.user_id);
      
      // Delete existing members
      await db.query('DELETE FROM project_users WHERE project_id = ?', [id]);
      
      // Add new members with roles
      if (member_ids.length > 0) {
        logger.debug('Adding', member_ids.length, 'members to project');
        const memberPromises = member_ids
          .filter(memberId => memberId && memberId !== '')
          .map(userId => {
            const role = (member_roles && member_roles[userId]) || (member_roles && member_roles[userId.toString()]) || 'employee';
            logger.debug(`Adding member - userId: ${userId} (type: ${typeof userId}), role: ${role}`);
            return db.query(`
              INSERT INTO project_users (project_id, user_id, role_in_project)
              VALUES (?, ?, ?)
            `, [id, userId, role]);
          });
        await Promise.all(memberPromises);
        logger.debug('All members added successfully');
      } else {
        logger.debug('No members to add (empty array)');
      }
    } else {
      logger.debug('member_ids not provided or not an array - skipping member update');
    }
    
    // Update milestones if provided
    if (milestones !== undefined && Array.isArray(milestones)) {
      // Delete existing milestones
      await db.query('DELETE FROM project_milestones WHERE project_id = ?', [id]);
      
      // Add new milestones
      if (milestones.length > 0) {
        const milestonePromises = milestones
          .filter(m => m.name)
          .map(milestone => {
            return db.query(`
              INSERT INTO project_milestones (project_id, name, start_date, end_date, status)
              VALUES (?, ?, ?, ?, ?)
            `, [
              id,
              milestone.name,
              milestone.start_date || null,
              milestone.end_date || null,
              milestone.status || 'Not Started'
            ]);
          });
        await Promise.all(milestonePromises);
      }
    }
    
    const [updated] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    
    // Create audit log for project update
    await logUpdate(req, 'Projects', id, beforeData, updated[0], 'Project');
    
    // Notify newly assigned project members
    if (member_ids !== undefined && Array.isArray(member_ids) && member_ids.length > 0) {
      // Get project name
      const projectName = updated[0].name || 'Project';
      
      // Notify only new members (not in existing list)
      const newMemberIds = member_ids
        .filter(memberId => memberId && memberId !== '' && !existingMemberIds.includes(parseInt(memberId)))
        .map(memberId => parseInt(memberId));
      
      if (newMemberIds.length > 0) {
        const notificationPromises = newMemberIds.map(userId => 
          notifyProjectAssigned(userId, parseInt(id), projectName, req.user.id)
        );
        await Promise.allSettled(notificationPromises);
      }
    }
    
    logger.debug('Project updated successfully');
    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Update project error:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message });
  }
});

// Delete project - check for projects.delete permission
router.delete('/:id', requirePermission('projects.delete'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data for audit log
    const [existingProjects] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    if (existingProjects.length === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const beforeData = existingProjects[0];
    
    await db.query('DELETE FROM projects WHERE id = ?', [id]);
    
    // Create audit log for project deletion
    await logDelete(req, 'Projects', id, beforeData, 'Project');
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT FILES ROUTES
// ============================================

// Upload project file
router.post('/:id/files', authorize('Team Leader', 'Team Lead', 'Super Admin', 'Developer', 'Designer', 'Tester'), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { file_type, file_category, description } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const fileUrl = `/uploads/projects/${req.file.filename}`;
    const uploaded_by = req.user.id;
    
    const [result] = await db.query(`
      INSERT INTO project_files (project_id, file_type, file_category, file_name, file_url, file_size, description, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, file_type, file_category || null, req.file.originalname, fileUrl, req.file.size, description || null, uploaded_by]);
    
    const [newFile] = await db.query('SELECT * FROM project_files WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newFile[0] });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Get project files - check for projects.view permission
router.get('/:id/files', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const [files] = await db.query(`
      SELECT pf.*, u.name as uploaded_by_name
      FROM project_files pf
      LEFT JOIN users u ON pf.uploaded_by = u.id
      WHERE pf.project_id = ?
      ORDER BY pf.created_at DESC
    `, [id]);
    res.json({ data: files });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete project file
router.delete('/:id/files/:fileId', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { fileId } = req.params;
    const [file] = await db.query('SELECT * FROM project_files WHERE id = ?', [fileId]);
    
    if (file.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const filePath = path.join(process.cwd(), file[0].file_url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    await db.query('DELETE FROM project_files WHERE id = ?', [fileId]);
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CHANGE REQUESTS ROUTES
// ============================================

// Create change request
router.post('/:id/change-requests', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, impact, estimated_effort_hours } = req.body;
    const requested_by = req.user.id;
    
    const [result] = await db.query(`
      INSERT INTO project_change_requests (project_id, title, description, requested_by, priority, impact, estimated_effort_hours)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [id, title, description, requested_by, priority || 'Medium', impact || null, estimated_effort_hours || null]);
    
    const [newRequest] = await db.query('SELECT * FROM project_change_requests WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newRequest[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get change requests
// Get project change requests - check for projects.view permission
router.get('/:id/change-requests', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const [requests] = await db.query(`
      SELECT cr.*, 
        u1.name as requested_by_name,
        u2.name as approved_by_name
      FROM project_change_requests cr
      LEFT JOIN users u1 ON cr.requested_by = u1.id
      LEFT JOIN users u2 ON cr.approved_by = u2.id
      WHERE cr.project_id = ?
      ORDER BY cr.created_at DESC
    `, [id]);
    res.json({ data: requests });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update change request status
router.put('/:id/change-requests/:requestId', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status, rejected_reason } = req.body;
    const approved_by = req.user.id;
    
    const updateFields = [];
    const updateValues = [];
    
    if (status) {
      updateFields.push('status = ?');
      updateValues.push(status);
      
      if (status === 'Approved') {
        updateFields.push('approved_by = ?');
        updateFields.push('approved_at = CURRENT_TIMESTAMP');
        updateValues.push(approved_by);
      } else if (status === 'Rejected' && rejected_reason) {
        updateFields.push('rejected_reason = ?');
        updateValues.push(rejected_reason);
      }
    }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(requestId);
    
    await db.query(`
      UPDATE project_change_requests 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    const [updated] = await db.query('SELECT * FROM project_change_requests WHERE id = ?', [requestId]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CLIENT CALL NOTES ROUTES
// ============================================

// Create client call note
router.post('/:id/call-notes', async (req, res) => {
  try {
    const { id } = req.params;
    const { call_date, call_duration_minutes, participants, notes, action_items, follow_up_required, follow_up_date } = req.body;
    const created_by = req.user.id;
    
    const [result] = await db.query(`
      INSERT INTO project_client_call_notes (project_id, call_date, call_duration_minutes, participants, notes, action_items, follow_up_required, follow_up_date, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, call_date, call_duration_minutes || null, participants || null, notes, action_items || null, follow_up_required || false, follow_up_date || null, created_by]);
    
    const [newNote] = await db.query('SELECT * FROM project_client_call_notes WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newNote[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get client call notes
// Get project call notes - check for projects.view permission
router.get('/:id/call-notes', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const [notes] = await db.query(`
      SELECT cn.*, u.name as created_by_name
      FROM project_client_call_notes cn
      LEFT JOIN users u ON cn.created_by = u.id
      WHERE cn.project_id = ?
      ORDER BY cn.call_date DESC
    `, [id]);
    res.json({ data: notes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// CREDENTIALS ROUTES
// ============================================

// Create credential
router.post('/:id/credentials', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { credential_type, service_name, username, password, url, api_key, notes } = req.body;
    const created_by = req.user.id;
    
    // In production, encrypt password and api_key here
    const [result] = await db.query(`
      INSERT INTO project_credentials (project_id, credential_type, service_name, username, password, url, api_key, notes, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, credential_type, service_name, username || null, password || null, url || null, api_key || null, notes || null, created_by]);
    
    const [newCred] = await db.query('SELECT * FROM project_credentials WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newCred[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get credentials
// Get project credentials - check for projects.view permission
router.get('/:id/credentials', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const [creds] = await db.query(`
      SELECT c.*, u.name as created_by_name
      FROM project_credentials c
      LEFT JOIN users u ON c.created_by = u.id
      WHERE c.project_id = ?
      ORDER BY c.created_at DESC
    `, [id]);
    res.json({ data: creds });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update credential
router.put('/:id/credentials/:credId', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { credId } = req.params;
    const { service_name, username, password, url, api_key, notes, is_active } = req.body;
    
    const updateFields = [];
    const updateValues = [];
    
    if (service_name !== undefined) { updateFields.push('service_name = ?'); updateValues.push(service_name); }
    if (username !== undefined) { updateFields.push('username = ?'); updateValues.push(username); }
    if (password !== undefined) { updateFields.push('password = ?'); updateValues.push(password); }
    if (url !== undefined) { updateFields.push('url = ?'); updateValues.push(url); }
    if (api_key !== undefined) { updateFields.push('api_key = ?'); updateValues.push(api_key); }
    if (notes !== undefined) { updateFields.push('notes = ?'); updateValues.push(notes); }
    if (is_active !== undefined) { updateFields.push('is_active = ?'); updateValues.push(is_active); }
    
    updateFields.push('updated_at = CURRENT_TIMESTAMP');
    updateValues.push(credId);
    
    await db.query(`
      UPDATE project_credentials 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `, updateValues);
    
    const [updated] = await db.query('SELECT * FROM project_credentials WHERE id = ?', [credId]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DAILY STATUS ROUTES
// ============================================

// Create/Update daily status
router.post('/:id/daily-status', async (req, res) => {
  try {
    const { id } = req.params;
    const { work_date, hours_worked, minutes_worked, work_description, tasks_completed, blockers } = req.body;
    const user_id = req.user.id;
    
    // Validate hours and minutes
    const hours = parseFloat(hours_worked) || 0;
    const minutes = parseInt(minutes_worked) || 0;
    
    if (hours < 0 || minutes < 0 || minutes >= 60) {
      return res.status(400).json({ error: 'Invalid hours or minutes' });
    }
    
    const [existing] = await db.query(`
      SELECT id FROM project_daily_status 
      WHERE project_id = ? AND user_id = ? AND work_date = ?
    `, [id, user_id, work_date]);
    
    if (existing.length > 0) {
      // Update existing entry
      await db.query(`
        UPDATE project_daily_status 
        SET hours_worked = ?, minutes_worked = ?, work_description = ?, tasks_completed = ?, blockers = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `, [hours, minutes, work_description || null, tasks_completed || null, blockers || null, existing[0].id]);
      
      const [updated] = await db.query('SELECT * FROM project_daily_status WHERE id = ?', [existing[0].id]);
      res.json({ data: updated[0] });
    } else {
      // Create new entry
      const [result] = await db.query(`
        INSERT INTO project_daily_status (project_id, user_id, work_date, hours_worked, minutes_worked, work_description, tasks_completed, blockers)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `, [id, user_id, work_date, hours, minutes, work_description || null, tasks_completed || null, blockers || null]);
      
      const [newStatus] = await db.query('SELECT * FROM project_daily_status WHERE id = ?', [result.insertId]);
      res.status(201).json({ data: newStatus[0] });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily status entries
// Get project daily status - check for projects.view permission
router.get('/:id/daily-status', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id, start_date, end_date } = req.query;
    
    let query = `
      SELECT ds.*, u.name as user_name, u.email as user_email
      FROM project_daily_status ds
      LEFT JOIN users u ON ds.user_id = u.id
      WHERE ds.project_id = ?
    `;
    const params = [id];
    
    if (user_id) {
      query += ' AND ds.user_id = ?';
      params.push(user_id);
    }
    if (start_date) {
      query += ' AND ds.work_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND ds.work_date <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY ds.work_date DESC, ds.created_at DESC';
    
    const [entries] = await db.query(query, params);
    res.json({ data: entries });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get project total worked time
// Get project total worked time - check for projects.view permission
router.get('/:id/total-worked-time', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await db.query(`
      SELECT 
        SUM(total_minutes) as total_minutes,
        ROUND(SUM(total_minutes) / 60, 2) as total_hours,
        COUNT(DISTINCT user_id) as unique_contributors,
        COUNT(*) as total_entries
      FROM project_daily_status
      WHERE project_id = ?
    `, [id]);
    
    res.json({ 
      data: {
        total_minutes: result[0].total_minutes || 0,
        total_hours: result[0].total_hours || 0,
        unique_contributors: result[0].unique_contributors || 0,
        total_entries: result[0].total_entries || 0
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT COMMENTS ROUTES
// ============================================

// Create comment
router.post('/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, comment_type, is_internal } = req.body;
    const user_id = req.user.id;
    
    const [result] = await db.query(`
      INSERT INTO project_comments (project_id, user_id, comment, comment_type, is_internal)
      VALUES (?, ?, ?, ?, ?)
    `, [id, user_id, comment, comment_type || 'General', is_internal !== undefined ? is_internal : true]);
    
    const [newComment] = await db.query(`
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM project_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    // Get project name for notification
    const [projects] = await db.query('SELECT name FROM projects WHERE id = ?', [id]);
    const projectName = projects[0]?.name || 'Project';
    
    // Notify project members about the comment
    await notifyProjectComment(
      parseInt(id),
      result.insertId,
      user_id,
      newComment[0].user_name || 'Someone',
      comment,
      projectName
    );
    
    res.status(201).json({ data: newComment[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments
// Get project activities (commits, PRs, issues from GitHub/Bitbucket)
// Get project activities - check for projects.view permission
router.get('/:id/activities', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { activity_type, limit = 50 } = req.query;
    
    let query = `
      SELECT * FROM project_activities 
      WHERE project_id = ?
    `;
    const params = [id];
    
    if (activity_type) {
      query += ' AND activity_type = ?';
      params.push(activity_type);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [activities] = await db.query(query, params);
    
    res.json({ data: activities || [] });
  } catch (error) {
    logger.error('Error fetching project activities:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project comments - check for projects.view permission
router.get('/:id/comments', requirePermission('projects.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const { comment_type } = req.query;
    
    let query = `
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM project_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.project_id = ?
    `;
    const params = [id];
    
    if (comment_type) {
      query += ' AND c.comment_type = ?';
      params.push(comment_type);
    }
    
    query += ' ORDER BY c.created_at DESC';
    
    const [comments] = await db.query(query, params);
    res.json({ data: comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update comment
router.put('/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const { comment, comment_type } = req.body;
    const user_id = req.user.id;
    
    // Check if comment exists and user owns it or is admin/team lead
    const [existing] = await db.query(`
      SELECT user_id FROM project_comments WHERE id = ? AND project_id = ?
    `, [commentId, id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const [user] = await db.query(`
      SELECT r.name as role 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [user_id]);
    const userRole = user[0]?.role || '';
    const isOwner = existing[0].user_id === user_id;
    const isAdmin = ['Admin', 'Super Admin', 'Team Lead'].includes(userRole);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only edit your own comments' });
    }
    
    await db.query(`
      UPDATE project_comments 
      SET comment = ?, comment_type = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND project_id = ?
    `, [comment, comment_type || 'General', commentId, id]);
    
    const [updated] = await db.query(`
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM project_comments c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id = ?
    `, [commentId]);
    
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete comment
router.delete('/:id/comments/:commentId', async (req, res) => {
  try {
    const { id, commentId } = req.params;
    const user_id = req.user.id;
    
    // Check if comment exists and user owns it or is admin/team lead
    const [existing] = await db.query(`
      SELECT user_id FROM project_comments WHERE id = ? AND project_id = ?
    `, [commentId, id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const [user] = await db.query(`
      SELECT r.name as role 
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [user_id]);
    const userRole = user[0]?.role || '';
    const isOwner = existing[0].user_id === user_id;
    const isAdmin = ['Admin', 'Super Admin', 'Team Lead'].includes(userRole);
    
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ error: 'You can only delete your own comments' });
    }
    
    await db.query('DELETE FROM project_comments WHERE id = ? AND project_id = ?', [commentId, id]);
    
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update technologies used
router.put('/:id/technologies', authorize('Team Leader', 'Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { technologies_used } = req.body;
    
    await db.query(`
      UPDATE projects 
      SET technologies_used = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [JSON.stringify(technologies_used || []), id]);
    
    const [updated] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
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

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, my_projects } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    console.log('=== PROJECTS LIST REQUEST ===');
    console.log('my_projects query param:', my_projects);
    console.log('my_projects type:', typeof my_projects);
    console.log('userId:', userId);
    console.log('userRole:', userRole);
    
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
    const shouldFilterMyProjects = my_projects && 
      my_projects !== 'false' && 
      my_projects !== '0' && 
      my_projects !== '' &&
      my_projects !== 'undefined' &&
      userId;
    
    console.log('shouldFilterMyProjects:', shouldFilterMyProjects);
    
    if (shouldFilterMyProjects) {
      console.log('Applying "My Projects" filter');
      // Show projects where user is team lead, project admin, creator, or assigned member
      query += ` AND (
        p.team_lead_id = ? OR 
        p.project_admin_id = ? OR 
        p.created_by = ? OR
        pu.user_id = ?
      )`;
      params.push(userId, userId, userId, userId);
    } else {
      console.log('Showing ALL projects (no filter applied)');
    }
    // For "all" view, all authenticated users see all projects - no role-based filtering
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [projects] = await db.query(query, params);
    
    // Count query
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total 
      FROM projects p
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE 1=1
    `;
    const countParams = [];
    
    // Use same filter logic for count query
    const shouldFilterMyProjectsCount = my_projects && 
      my_projects !== 'false' && 
      my_projects !== '0' && 
      my_projects !== '' &&
      my_projects !== 'undefined' &&
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
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    console.log('Total projects found:', total);
    console.log('Projects returned:', projects.length);
    
    res.json({
      data: projects,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [projects] = await db.query(`
      SELECT 
        p.*,
        u1.name as created_by_name,
        u1.email as created_by_email,
        u2.name as updated_by_name,
        u2.email as updated_by_email,
        tl.name as team_lead_name,
        tl.email as team_lead_email
      FROM projects p
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN users tl ON p.team_lead_id = tl.id
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

// Create project - only Team Lead and Super Admin
router.post('/', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const {
      name, description, status, start_date, end_date, team_lead_id, member_ids, member_roles,
      logo_url, estimated_delivery_plan,
      client_name, client_contact_person, client_email, client_phone, is_internal,
      target_end_date, actual_end_date,
      risk_level, priority, progress,
      daily_reporting_required, report_submission_time, auto_reminder_notifications,
      internal_notes, client_notes, admin_remarks,
      github_repo_url, bitbucket_repo_url,
      milestones
    } = req.body;
    
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
    const final_team_lead_id = team_lead_id || (req.user.role === 'Team Lead' ? req.user.id : null);
    
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
      normalizedStatus, progress || 0, risk_level || null, priority || null,
      daily_reporting_required || false, report_submission_time || null, auto_reminder_notifications || false,
      internal_notes || null, client_notes || null, admin_remarks || null,
      github_repo_url || null, bitbucket_repo_url || null, technologies_used ? JSON.stringify(technologies_used) : null,
      created_by, final_team_lead_id || null
    ]);
    
    const projectId = result.insertId;
    
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
    res.status(201).json({ data: newProject[0] });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update project - only Team Lead and Super Admin
router.put('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, description, status, start_date, end_date, team_lead_id, member_ids, member_roles,
      logo_url, estimated_delivery_plan,
      client_name, client_contact_person, client_email, client_phone, is_internal,
      target_end_date, actual_end_date,
      risk_level, priority, progress,
      daily_reporting_required, report_submission_time, auto_reminder_notifications,
      internal_notes, client_notes, admin_remarks,
      github_repo_url, bitbucket_repo_url,
      milestones
    } = req.body;
    
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
    if (risk_level !== undefined) { updateFields.push('risk_level = ?'); updateValues.push(risk_level); }
    if (priority !== undefined) { updateFields.push('priority = ?'); updateValues.push(priority); }
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
      const [result] = await db.query(`
        UPDATE projects 
        SET ${updateFields.join(', ')}
        WHERE id = ?
      `, updateValues);
      
      if (result.affectedRows === 0) {
        return res.status(404).json({ error: 'Project not found' });
      }
    }
    
    // Update project members if provided
    if (member_ids !== undefined && Array.isArray(member_ids)) {
      // Delete existing members
      await db.query('DELETE FROM project_users WHERE project_id = ?', [id]);
      
      // Add new members with roles
      if (member_ids.length > 0) {
        const memberPromises = member_ids
          .filter(memberId => memberId && memberId !== '')
          .map(userId => {
            const role = (member_roles && member_roles[userId]) || 'employee';
            return db.query(`
              INSERT INTO project_users (project_id, user_id, role_in_project)
              VALUES (?, ?, ?)
            `, [id, userId, role]);
          });
        await Promise.all(memberPromises);
      }
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
    res.json({ data: updated[0] });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete project - only Team Lead and Super Admin
router.delete('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PROJECT FILES ROUTES
// ============================================

// Upload project file
router.post('/:id/files', authorize('Team Lead', 'Super Admin', 'Developer', 'Designer', 'Tester'), upload.single('file'), async (req, res) => {
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

// Get project files
router.get('/:id/files', async (req, res) => {
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
router.delete('/:id/files/:fileId', authorize('Team Lead', 'Super Admin'), async (req, res) => {
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
router.get('/:id/change-requests', async (req, res) => {
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
router.put('/:id/change-requests/:requestId', authorize('Team Lead', 'Super Admin'), async (req, res) => {
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
router.get('/:id/call-notes', async (req, res) => {
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
router.post('/:id/credentials', authorize('Team Lead', 'Super Admin'), async (req, res) => {
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
router.get('/:id/credentials', async (req, res) => {
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
router.put('/:id/credentials/:credId', authorize('Team Lead', 'Super Admin'), async (req, res) => {
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
router.get('/:id/daily-status', async (req, res) => {
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
router.get('/:id/total-worked-time', async (req, res) => {
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
    
    res.status(201).json({ data: newComment[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get comments
router.get('/:id/comments', async (req, res) => {
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

// Update technologies used
router.put('/:id/technologies', authorize('Team Lead', 'Super Admin'), async (req, res) => {
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

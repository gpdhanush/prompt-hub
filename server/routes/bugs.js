import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
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
    
    console.log('=== GET BUGS REQUEST ===');
    console.log('User Role:', userRole);
    console.log('User ID:', userId);
    console.log('My Bugs filter:', my_bugs, 'Type:', typeof my_bugs);
    
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
        u3.email as updated_by_email`;
    
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
      console.log('Applying "My Bugs" filter for user:', userId);
    } else {
      console.log('Showing ALL bugs to user:', userRole);
    }
    
    query += ' ORDER BY b.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    console.log('Final query:', query);
    console.log('Query params:', params);
    
    const [bugs] = await db.query(query, params);
    
    console.log(`Found ${bugs.length} bugs`);
    console.log('Bug IDs:', bugs.map(b => `${b.bug_code} (reported_by: ${b.reported_by}, assigned_to: ${b.assigned_to})`).join(', '));
    
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
    console.log('Total bugs count:', countResult[0].total);
    
    res.json({ data: bugs, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    console.error('Error fetching bugs:', error);
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
        u3.email as updated_by_email`;
    
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

// Create bug - Tester, Admin, Team Lead, Developer, Designer, and Super Admin
router.post('/', authorize('Tester', 'Admin', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), upload.array('attachments', 10), async (req, res) => {
  try {
    console.log('=== CREATE BUG REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files');
    console.log('User:', req.user);
    
    const { task_id, title, description, severity, status, steps_to_reproduce, expected_behavior, actual_behavior, assigned_to: provided_assigned_to } = req.body;
    const reported_by = req.user.id; // Get from authenticated user
    
    console.log('=== CREATE BUG REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Provided assigned_to:', provided_assigned_to, 'Type:', typeof provided_assigned_to);
    
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
    
    // Combine title and description if title doesn't exist in schema
    // If title exists, use it; otherwise, prepend title to description
    const bugDescription = title && description 
      ? `${title}\n\n${description}` 
      : title || description;
    
    // Handle assigned_to: Use provided value if available, otherwise use auto-assignment logic
    let assigned_to = null;
    
    // If assigned_to was explicitly provided in the request, use it
    if (provided_assigned_to !== undefined && provided_assigned_to !== null && provided_assigned_to !== '') {
      assigned_to = parseInt(provided_assigned_to) || null;
      console.log(`Using provided assigned_to: ${assigned_to}`);
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
          console.log('Using old task schema (no role-specific assignments)');
        }
        taskQuery += ' FROM tasks WHERE id = ?';
        
        const [taskResult] = await db.query(taskQuery, [task_id]);
        if (taskResult.length > 0) {
          const task = taskResult[0];
          
          // Role-based assignment logic
          if (creatorRole === 'Tester') {
            // Tester creates bug → assign to Developer
            assigned_to = task.developer_id || task.assigned_to || null;
            console.log(`Tester created bug - auto-assigning to Developer: ${assigned_to}`);
          } else if (creatorRole === 'Developer') {
            // Developer creates bug → assign to Tester
            assigned_to = task.tester_id || task.assigned_to || null;
            console.log(`Developer created bug - auto-assigning to Tester: ${assigned_to}`);
          } else if (creatorRole === 'Designer') {
            // Designer creates bug → assign to Developer (for code fixes) or Tester (for testing)
            assigned_to = task.developer_id || task.tester_id || task.assigned_to || null;
            console.log(`Designer created bug - auto-assigning to Developer/Tester: ${assigned_to}`);
          } else {
            // For other roles (Admin, Team Lead, Super Admin), use task's assigned_to
            assigned_to = task.assigned_to || null;
            console.log(`Auto-assigning bug to task's assigned user: ${assigned_to}`);
          }
        }
      }
    }
    
    console.log('Inserting bug with:', { bugCode, task_id, bugDescription, severity, status, reported_by, assigned_to });
    
    const [result] = await db.query(`
      INSERT INTO bugs (bug_code, task_id, description, severity, status, reported_by, assigned_to, steps_to_reproduce, expected_behavior, actual_behavior)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [bugCode, task_id || null, bugDescription, severity || 'Minor', status || 'Open', reported_by, assigned_to, steps_to_reproduce || null, expected_behavior || null, actual_behavior || null]);
    
    console.log('Bug inserted with ID:', result.insertId);
    
    // Handle file attachments
    if (req.files && req.files.length > 0) {
      console.log(`Inserting ${req.files.length} attachments`);
      const attachmentPromises = req.files.map((file) => {
        return db.query(`
          INSERT INTO attachments (bug_id, uploaded_by, path, original_filename, mime_type, size)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [result.insertId, reported_by, file.path, file.originalname, file.mimetype, file.size]);
      });
      await Promise.all(attachmentPromises);
      console.log('Attachments inserted successfully');
    }
    
    const [newBug] = await db.query('SELECT * FROM bugs WHERE id = ?', [result.insertId]);
    console.log('Bug created successfully:', newBug[0]);
    res.status(201).json({ data: newBug[0] });
  } catch (error) {
    console.error('Error creating bug:', error);
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

// Update bug - Tester, Admin, Team Lead, Developer, Designer, and Super Admin
router.put('/:id', authorize('Tester', 'Admin', 'Team Lead', 'Developer', 'Designer', 'Super Admin'), async (req, res) => {
  try {
    const userRole = req.user?.role || '';
    const { title, description, severity, status, assigned_to } = req.body;
    
    console.log('=== UPDATE BUG REQUEST ===');
    console.log('Bug ID:', req.params.id);
    console.log('User Role:', userRole);
    console.log('Request body:', req.body);
    console.log('assigned_to value:', assigned_to, 'Type:', typeof assigned_to);
    
    // All users can now update bugs including assigned_to
    // Developer, Designer, and Tester can update status and assigned_to
    // Admin, Team Lead, Super Admin can update all fields
    
    // Combine title and description if both provided
    const bugDescription = title && description 
      ? `${title}\n\n${description}` 
      : title || description;
    
    const updated_by = req.user.id;
    
    // Handle assigned_to: convert empty string, null, undefined, or 0 to null, otherwise use the value
    const assignedToValue = (assigned_to === '' || assigned_to === null || assigned_to === undefined || assigned_to === 0) ? null : parseInt(assigned_to);
    console.log('Processed assigned_to value:', assignedToValue);
    
    // All users can update status and assigned_to
    // Developer, Designer, and Tester can only update status and assigned_to (not description/severity)
    if (userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester') {
      // Developer, Designer, Tester: can update status and assigned_to only
      await db.query('UPDATE bugs SET status = ?, assigned_to = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, assignedToValue, updated_by, req.params.id]);
      console.log('Bug updated by Developer/Designer/Tester - status and assigned_to:', { status, assigned_to: assignedToValue });
    } else {
      // Admin, Team Lead, Super Admin can update all fields including assigned_to
      await db.query('UPDATE bugs SET description = ?, severity = ?, status = ?, assigned_to = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [bugDescription, severity, status, assignedToValue, updated_by, req.params.id]);
      console.log('Bug updated successfully with assigned_to:', assignedToValue);
    }
    
    const [updated] = await db.query('SELECT * FROM bugs WHERE id = ?', [req.params.id]);
    console.log('Updated bug:', updated[0]);
    res.json({ data: updated[0] });
  } catch (error) {
    console.error('Error updating bug:', error);
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
    const filePath = attachment.path;
    
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found on server' });
    }
    
    // Set headers for file download
    res.setHeader('Content-Type', attachment.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${attachment.original_filename || 'attachment'}"`);
    
    // Send file
    res.sendFile(path.resolve(filePath));
  } catch (error) {
    console.error('Error downloading attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete bug - only Team Lead and Super Admin
router.delete('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    // Delete associated attachments first
    const [attachments] = await db.query('SELECT path FROM attachments WHERE bug_id = ?', [req.params.id]);
    attachments.forEach((att) => {
      if (fs.existsSync(att.path)) {
        fs.unlinkSync(att.path);
      }
    });
    await db.query('DELETE FROM attachments WHERE bug_id = ?', [req.params.id]);
    await db.query('DELETE FROM bugs WHERE id = ?', [req.params.id]);
    res.json({ message: 'Bug deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

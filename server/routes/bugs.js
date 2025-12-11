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
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const query = `
      SELECT 
        b.*,
        u1.name as assigned_to_name,
        u1.email as assigned_to_email,
        u2.name as reported_by_name
      FROM bugs b
      LEFT JOIN users u1 ON b.assigned_to = u1.id
      LEFT JOIN users u2 ON b.reported_by = u2.id
      ORDER BY b.created_at DESC 
      LIMIT ? OFFSET ?
    `;
    const [bugs] = await db.query(query, [parseInt(limit), parseInt(offset)]);
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM bugs');
    res.json({ data: bugs, pagination: { page: parseInt(page), limit: parseInt(limit), total: countResult[0].total, totalPages: Math.ceil(countResult[0].total / limit) } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [bugs] = await db.query('SELECT * FROM bugs WHERE id = ?', [req.params.id]);
    if (bugs.length === 0) return res.status(404).json({ error: 'Bug not found' });
    res.json({ data: bugs[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create bug - Tester, Admin, Team Lead, Employee, and Super Admin
router.post('/', authorize('Tester', 'Admin', 'Team Lead', 'Employee', 'Super Admin'), upload.array('attachments', 10), async (req, res) => {
  try {
    console.log('=== CREATE BUG REQUEST ===');
    console.log('Request body:', req.body);
    console.log('Files:', req.files ? req.files.map(f => ({ name: f.originalname, size: f.size })) : 'No files');
    console.log('User:', req.user);
    
    const { task_id, title, description, severity, status, steps_to_reproduce, expected_behavior, actual_behavior } = req.body;
    const reported_by = req.user.id; // Get from authenticated user
    
    if (!title && !description) {
      return res.status(400).json({ error: 'Title or description is required' });
    }
    
    // Generate bug code
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM bugs');
    const bugCode = `BG-${String(countResult[0].count + 1).padStart(4, '0')}`;
    
    // Combine title and description if title doesn't exist in schema
    // If title exists, use it; otherwise, prepend title to description
    const bugDescription = title && description 
      ? `${title}\n\n${description}` 
      : title || description;
    
    // Auto-assign bug to the task's assigned user if task_id is provided
    let assigned_to = null;
    if (task_id) {
      const [taskResult] = await db.query('SELECT assigned_to FROM tasks WHERE id = ?', [task_id]);
      if (taskResult.length > 0 && taskResult[0].assigned_to) {
        assigned_to = taskResult[0].assigned_to;
        console.log(`Auto-assigning bug to task's assigned user: ${assigned_to}`);
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

// Update bug - Tester, Admin, Team Lead, Employee, and Super Admin
router.put('/:id', authorize('Tester', 'Admin', 'Team Lead', 'Employee', 'Super Admin'), async (req, res) => {
  try {
    const userRole = req.user?.role || '';
    const { title, description, severity, status } = req.body;
    
    // Employee and Tester can only update status
    if ((userRole === 'Employee' || userRole === 'Tester') && (title || description || severity)) {
      return res.status(403).json({ error: 'You can only update the bug status' });
    }
    
    // Combine title and description if both provided
    const bugDescription = title && description 
      ? `${title}\n\n${description}` 
      : title || description;
    
    // If Employee or Tester, only update status
    if (userRole === 'Employee' || userRole === 'Tester') {
      await db.query('UPDATE bugs SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [status, req.params.id]);
    } else {
      // Admin, Team Lead, Super Admin can update all fields
      await db.query('UPDATE bugs SET description = ?, severity = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [bugDescription, severity, status, req.params.id]);
    }
    
    const [updated] = await db.query('SELECT * FROM bugs WHERE id = ?', [req.params.id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete bug - only Team Lead and Super Admin
router.delete('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    // Delete associated attachments first
    const [attachments] = await db.query('SELECT file_path FROM attachments WHERE bug_id = ?', [req.params.id]);
    attachments.forEach((att) => {
      if (fs.existsSync(att.file_path)) {
        fs.unlinkSync(att.file_path);
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

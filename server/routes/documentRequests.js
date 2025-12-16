import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/document-requests');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx|xls|xlsx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Apply authentication to all routes
router.use(authenticate);

// Get all document requests
router.get('/', async (req, res) => {
  try {
    const { employee_id, request_type, status } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let query = `
      SELECT 
        dr.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as requested_by_name,
        u3.name as reviewed_by_name
      FROM document_requests dr
      LEFT JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON dr.requested_by = u2.id
      LEFT JOIN users u3 ON dr.reviewed_by = u3.id
      WHERE 1=1
    `;
    const params = [];
    
    if (!isAdmin) {
      // Non-admins can only see their own requests
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ' AND dr.employee_id = ?';
        params.push(employee[0].id);
      } else {
        return res.json({ data: [] });
      }
    } else if (employee_id) {
      query += ' AND dr.employee_id = ?';
      params.push(employee_id);
    }
    
    if (request_type) {
      query += ' AND dr.request_type = ?';
      params.push(request_type);
    }
    
    if (status) {
      query += ' AND dr.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY dr.created_at DESC';
    
    const [requests] = await db.query(query, params);
    
    // Parse JSON submission_data
    const parsedRequests = requests.map(req => ({
      ...req,
      submission_data: req.submission_data ? (typeof req.submission_data === 'string' ? JSON.parse(req.submission_data) : req.submission_data) : null
    }));
    
    res.json({ data: parsedRequests });
  } catch (error) {
    logger.error('Error fetching document requests:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single document request
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    const [requests] = await db.query(`
      SELECT 
        dr.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as requested_by_name,
        u3.name as reviewed_by_name
      FROM document_requests dr
      LEFT JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON dr.requested_by = u2.id
      LEFT JOIN users u3 ON dr.reviewed_by = u3.id
      WHERE dr.id = ?
    `, [id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Document request not found' });
    }
    
    const request = requests[0];
    
    // Check access
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || employee[0].id !== request.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Parse JSON
    if (request.submission_data) {
      request.submission_data = typeof request.submission_data === 'string' 
        ? JSON.parse(request.submission_data) 
        : request.submission_data;
    }
    
    res.json({ data: request });
  } catch (error) {
    logger.error('Error fetching document request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create document request (Admin only)
router.post('/', authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const {
      request_type,
      employee_id,
      document_name,
      description,
      due_date
    } = req.body;
    const userId = req.user?.id;
    
    if (!request_type || !employee_id || !document_name) {
      return res.status(400).json({ error: 'Request type, employee ID, and document name are required' });
    }
    
    const [result] = await db.query(`
      INSERT INTO document_requests (
        request_type, employee_id, document_name, description,
        requested_by, due_date, status
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending')
    `, [
      request_type,
      employee_id,
      document_name,
      description || null,
      userId,
      due_date || null
    ]);
    
    const [created] = await db.query(`
      SELECT 
        dr.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as requested_by_name
      FROM document_requests dr
      LEFT JOIN employees e ON dr.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON dr.requested_by = u2.id
      WHERE dr.id = ?
    `, [result.insertId]);
    
    await logCreate(req, 'DocumentRequests', result.insertId, created[0], 'Document Request');
    
    res.status(201).json({ data: created[0], message: 'Document request created successfully' });
  } catch (error) {
    logger.error('Error creating document request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Submit document (Employee)
router.post('/:id/submit', upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { submission_data } = req.body;
    const userId = req.user?.id;
    
    const [requests] = await db.query(`
      SELECT dr.*, e.user_id as employee_user_id
      FROM document_requests dr
      LEFT JOIN employees e ON dr.employee_id = e.id
      WHERE dr.id = ?
    `, [id]);
    
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Document request not found' });
    }
    
    const request = requests[0];
    
    // Check if user is the employee
    if (request.employee_user_id !== userId) {
      return res.status(403).json({ error: 'You can only submit your own document requests' });
    }
    
    if (request.status !== 'pending') {
      return res.status(400).json({ error: 'This request has already been processed' });
    }
    
    let filePath = null;
    let fileName = null;
    
    if (req.file) {
      filePath = `/uploads/document-requests/${req.file.filename}`;
      fileName = req.file.originalname;
    }
    
    const updateData = {
      status: 'submitted',
      submitted_at: new Date(),
      file_path: filePath,
      file_name: fileName
    };
    
    if (submission_data) {
      updateData.submission_data = typeof submission_data === 'string' 
        ? submission_data 
        : JSON.stringify(submission_data);
    }
    
    await db.query(`
      UPDATE document_requests SET
        status = ?,
        submitted_at = ?,
        file_path = ?,
        file_name = ?,
        submission_data = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [
      updateData.status,
      updateData.submitted_at,
      updateData.file_path,
      updateData.file_name,
      updateData.submission_data || null,
      id
    ]);
    
    res.json({ message: 'Document submitted successfully' });
  } catch (error) {
    logger.error('Error submitting document:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Provide document to employee (Admin only)
router.post('/:id/provide', authorize('Admin', 'Super Admin'), upload.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    
    if (!req.file) {
      return res.status(400).json({ error: 'File is required' });
    }
    
    const [requests] = await db.query('SELECT * FROM document_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: 'Document request not found' });
    }
    
    const filePath = `/uploads/document-requests/${req.file.filename}`;
    
    await db.query(`
      UPDATE document_requests SET
        status = 'provided',
        file_path = ?,
        file_name = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [filePath, req.file.originalname, id]);
    
    res.json({ message: 'Document provided successfully' });
  } catch (error) {
    logger.error('Error providing document:', error);
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Review document request (Admin only)
router.put('/:id/review', authorize('Admin', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;
    const userId = req.user?.id;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
    }
    
    const [requests] = await db.query('SELECT * FROM document_requests WHERE id = ?', [id]);
    if (requests.length === 0) {
      return res.status(404).json({ error: 'Document request not found' });
    }
    
    await db.query(`
      UPDATE document_requests SET
        status = ?,
        reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP,
        review_notes = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [status, userId, review_notes || null, id]);
    
    res.json({ message: 'Document request reviewed successfully' });
  } catch (error) {
    logger.error('Error reviewing document request:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


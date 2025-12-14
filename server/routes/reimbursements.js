import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyReimbursementStatusUpdated } from '../utils/notificationService.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { logger } from '../utils/logger.js';
import { getRolesByLevel } from '../utils/roleHelpers.js';

const router = express.Router();

// Configure multer for reimbursement file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const reimbursementUploadDir = path.join(__dirname, '..', 'uploads', 'reimbursements');
if (!fs.existsSync(reimbursementUploadDir)) {
  fs.mkdirSync(reimbursementUploadDir, { recursive: true });
}

const reimbursementStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, reimbursementUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `reimbursement-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const reimbursementFileFilter = (req, file, cb) => {
  // Allow images and PDFs only
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf'
  ];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) and PDF files are allowed.'), false);
  }
};

const uploadReimbursementFiles = multer({
  storage: reimbursementStorage,
  fileFilter: reimbursementFileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Apply authentication to all routes
router.use(authenticate);

// Helper: Get user level from role
async function getUserLevel(userId) {
  try {
    const [users] = await db.query(`
      SELECT r.level, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) return null;
    
    const roleLevel = users[0].level;
    const roleName = users[0].role_name;
    
    // Super Admin is level 0 (null in DB)
    if (roleName === 'Super Admin') return 0;
    
    return roleLevel !== null ? roleLevel : 2; // Default to level 2 if null
  } catch (error) {
    logger.error('Error getting user level:', error);
    return null;
  }
}

// Helper: Generate claim code
function generateClaimCode() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000);
  return `CLM-${timestamp}-${random}`;
}

// GET /reimbursements - List all reimbursements (with filters)
router.get('/', requirePermission('reimbursements.view'), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = await getUserLevel(userId);
    const { page = 1, limit = 10, status, search, my_claims } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        r.*,
        e.emp_code,
        e.user_id as employee_user_id,
        e.team_lead_id,
        u_emp.name as employee_name,
        u_emp.email as employee_email,
        u_l1.name as level_1_approver_name,
        u_sa.name as super_admin_approver_name,
        u_manager.name as pending_level_1_manager_name,
        COUNT(DISTINCT a.id) as attachment_count
      FROM reimbursements r
      LEFT JOIN employees e ON r.employee_id = e.id
      LEFT JOIN users u_emp ON e.user_id = u_emp.id
      LEFT JOIN users u_l1 ON r.level_1_approved_by = u_l1.id
      LEFT JOIN users u_sa ON r.super_admin_approved_by = u_sa.id
      LEFT JOIN employees e_manager ON e.team_lead_id = e_manager.id
      LEFT JOIN users u_manager ON e_manager.user_id = u_manager.id
      LEFT JOIN attachments a ON a.reimbursement_id = r.id
      WHERE 1=1
    `;
    const params = [];
    
    // Get current user's employee record and role
    const [currentUserEmployee] = await db.query('SELECT id, team_lead_id FROM employees WHERE user_id = ?', [userId]);
    const currentEmployeeId = currentUserEmployee.length > 0 ? currentUserEmployee[0].id : null;
    
    // Apply role-based filtering
    if (userLevel === 0) {
      // Super Admin: See all reimbursements (no filter)
    } else if (userLevel === 1) {
      // Level 1 (Manager): Only see claims from their direct reports
      if (currentEmployeeId) {
        // Get all employees who report to this manager (where team_lead_id = current employee_id)
        query += ' AND e.team_lead_id = ?';
        params.push(currentEmployeeId);
      } else {
        // If no employee record, return empty
        return res.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      }
    } else if (userLevel === 2 || userLevel === null) {
      // Level 2 (Employee): Only see their own claims
      if (currentEmployeeId) {
        query += ' AND r.employee_id = ?';
        params.push(currentEmployeeId);
      } else {
        // If no employee record, return empty
        return res.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      }
    }
    
    // Filter by my claims only (for explicit my_claims parameter)
    if (my_claims === 'true') {
      if (currentEmployeeId) {
        query += ' AND r.employee_id = ?';
        params.push(currentEmployeeId);
      } else {
        return res.json({ data: [], pagination: { page: 1, limit: 10, total: 0, totalPages: 0 } });
      }
    }
    
    // Filter by status
    if (status) {
      query += ' AND r.status = ?';
      params.push(status);
    }
    
    // Search filter
    if (search) {
      query += ' AND (r.claim_code LIKE ? OR r.description LIKE ? OR u_emp.name LIKE ? OR r.category LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ' GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [reimbursements] = await db.query(query, params);
    const [countResult] = await db.query(
      query.replace('SELECT r.*,', 'SELECT COUNT(DISTINCT r.id) as total').replace('GROUP BY r.id ORDER BY r.created_at DESC LIMIT ? OFFSET ?', ''),
      params.slice(0, -2)
    );
    
    // Get attachments for each reimbursement
    for (const reimbursement of reimbursements) {
      const [attachments] = await db.query(`
        SELECT id, path, original_filename, mime_type, size, created_at
        FROM attachments
        WHERE reimbursement_id = ?
        ORDER BY created_at DESC
      `, [reimbursement.id]);
      reimbursement.attachments = attachments;
    }
    
    res.json({
      data: reimbursements,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: countResult[0]?.total || 0,
        totalPages: Math.ceil((countResult[0]?.total || 0) / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching reimbursements:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /reimbursements/:id - Get single reimbursement
router.get('/:id', requirePermission('reimbursements.view'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userLevel = await getUserLevel(userId);
    
    // Get current user's employee record
    const [currentUserEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    const currentEmployeeId = currentUserEmployee.length > 0 ? currentUserEmployee[0].id : null;
    
    const [reimbursements] = await db.query(`
      SELECT 
        r.*,
        e.emp_code,
        e.user_id as employee_user_id,
        e.team_lead_id,
        u_emp.name as employee_name,
        u_emp.email as employee_email,
        u_l1.name as level_1_approver_name,
        u_l1_rej.name as level_1_rejector_name,
        u_sa.name as super_admin_approver_name,
        u_sa_rej.name as super_admin_rejector_name,
        u_manager.name as pending_level_1_manager_name
      FROM reimbursements r
      LEFT JOIN employees e ON r.employee_id = e.id
      LEFT JOIN users u_emp ON e.user_id = u_emp.id
      LEFT JOIN users u_l1 ON r.level_1_approved_by = u_l1.id
      LEFT JOIN users u_l1_rej ON r.level_1_rejected_by = u_l1_rej.id
      LEFT JOIN users u_sa ON r.super_admin_approved_by = u_sa.id
      LEFT JOIN users u_sa_rej ON r.super_admin_rejected_by = u_sa_rej.id
      LEFT JOIN employees e_manager ON e.team_lead_id = e_manager.id
      LEFT JOIN users u_manager ON e_manager.user_id = u_manager.id
      WHERE r.id = ?
    `, [id]);
    
    if (reimbursements.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    const reimbursement = reimbursements[0];
    
    // Check access control
    if (userLevel === 0) {
      // Super Admin: Can access all
    } else if (userLevel === 1) {
      // Level 1 (Manager): Can only access claims from their direct reports
      if (currentEmployeeId && reimbursement.team_lead_id !== currentEmployeeId) {
        return res.status(403).json({ error: 'Access denied. You can only view claims from your direct reports.' });
      }
    } else if (userLevel === 2 || userLevel === null) {
      // Level 2 (Employee): Can only access their own claims
      if (currentEmployeeId && reimbursement.employee_id !== currentEmployeeId) {
        return res.status(403).json({ error: 'Access denied. You can only view your own claims.' });
      }
    }
    
    // Get attachments
    const [attachments] = await db.query(`
      SELECT id, path, original_filename, mime_type, size, created_at
      FROM attachments
      WHERE reimbursement_id = ?
      ORDER BY created_at DESC
    `, [id]);
    
    reimbursement.attachments = attachments;
    
    res.json({ data: reimbursement });
  } catch (error) {
    logger.error('Error fetching reimbursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /reimbursements - Create new reimbursement
router.post('/', requirePermission('reimbursements.create'), uploadReimbursementFiles.array('files', 10), async (req, res) => {
  try {
    const userId = req.user.id;
    const userLevel = await getUserLevel(userId);
    
    // Get employee_id from user_id
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) {
      return res.status(400).json({ error: 'Employee record not found for this user' });
    }
    const employeeId = employees[0].id;
    
    const { amount, category, description } = req.body;
    
    if (!amount || !category) {
      return res.status(400).json({ error: 'Amount and category are required' });
    }
    
    // Determine initial status and approval level based on user level
    let status = 'Pending';
    let currentApprovalLevel = 'Level 2';
    
    if (userLevel === 1) {
      // Level 1 user creates claim → goes directly to Super Admin
      status = 'Waiting for Approval';
      currentApprovalLevel = 'Super Admin';
    } else if (userLevel === 2) {
      // Level 2 user creates claim → goes to Level 1
      status = 'Pending';
      currentApprovalLevel = 'Level 2';
    }
    
    const claimCode = generateClaimCode();
    
    // Insert reimbursement
    const [result] = await db.query(`
      INSERT INTO reimbursements (
        employee_id, amount, category, description, 
        status, claim_code, current_approval_level
      )
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [employeeId, amount, category, description || null, status, claimCode, currentApprovalLevel]);
    
    const reimbursementId = result.insertId;
    
    // Handle file uploads
    const uploadedFiles = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filePath = `/uploads/reimbursements/${file.filename}`;
        const [attachmentResult] = await db.query(`
          INSERT INTO attachments (
            reimbursement_id, uploaded_by, path, original_filename, mime_type, size
          )
          VALUES (?, ?, ?, ?, ?, ?)
        `, [reimbursementId, userId, filePath, file.originalname, file.mimetype, file.size]);
        
        uploadedFiles.push({
          id: attachmentResult.insertId,
          path: filePath,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          size: file.size
        });
      }
    }
    
    // Get created reimbursement with full details
    const [newReimbursement] = await db.query(`
      SELECT 
        r.*,
        e.emp_code,
        e.user_id as employee_user_id,
        u_emp.name as employee_name
      FROM reimbursements r
      LEFT JOIN employees e ON r.employee_id = e.id
      LEFT JOIN users u_emp ON e.user_id = u_emp.id
      WHERE r.id = ?
    `, [reimbursementId]);
    
    newReimbursement[0].attachments = uploadedFiles;
    
    // Create audit log
    await logCreate(req, 'Reimbursements', reimbursementId, {
      id: reimbursementId,
      claim_code: claimCode,
      employee_id: employeeId,
      amount: amount,
      category: category,
      status: status,
      current_approval_level: currentApprovalLevel
    }, 'Reimbursement');
    
    res.status(201).json({ data: newReimbursement[0], message: 'Reimbursement claim created successfully' });
  } catch (error) {
    logger.error('Error creating reimbursement:', error);
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

// PUT /reimbursements/:id - Update reimbursement
router.put('/:id', requirePermission('reimbursements.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const { amount, category, description } = req.body;
    
    // Get existing reimbursement
    const [existing] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    const reimbursement = existing[0];
    
    // Check if user can edit (only employee who created it, and only if pending)
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0 || employees[0].id !== reimbursement.employee_id) {
      return res.status(403).json({ error: 'You can only edit your own reimbursement claims' });
    }
    
    if (reimbursement.status !== 'Pending' && reimbursement.status !== 'Waiting for Approval') {
      return res.status(400).json({ error: 'Cannot edit reimbursement that has been processed' });
    }
    
    const beforeData = reimbursement;
    
    // Update reimbursement
    await db.query(`
      UPDATE reimbursements 
      SET amount = ?, category = ?, description = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [amount, category, description || null, id]);
    
    const [updated] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    
    // Create audit log
    await logUpdate(req, 'Reimbursements', id, beforeData, updated[0], 'Reimbursement');
    
    res.json({ data: updated[0], message: 'Reimbursement updated successfully' });
  } catch (error) {
    logger.error('Error updating reimbursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /reimbursements/:id - Delete reimbursement
router.delete('/:id', requirePermission('reimbursements.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Get existing reimbursement
    const [existing] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    const reimbursement = existing[0];
    
    // Check if user can delete (only employee who created it, and only if pending)
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0 || employees[0].id !== reimbursement.employee_id) {
      return res.status(403).json({ error: 'You can only delete your own reimbursement claims' });
    }
    
    if (reimbursement.status !== 'Pending' && reimbursement.status !== 'Waiting for Approval') {
      return res.status(400).json({ error: 'Cannot delete reimbursement that has been processed' });
    }
    
    // Get attachments to delete files
    const [attachments] = await db.query('SELECT path FROM attachments WHERE reimbursement_id = ?', [id]);
    
    // Delete reimbursement (cascade will delete attachments from DB)
    await db.query('DELETE FROM reimbursements WHERE id = ?', [id]);
    
    // Delete attachment files
    attachments.forEach((attachment) => {
      const filePath = path.join(__dirname, '..', attachment.path);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    });
    
    // Create audit log
    await logDelete(req, 'Reimbursements', id, reimbursement, 'Reimbursement');
    
    res.json({ message: 'Reimbursement deleted successfully' });
  } catch (error) {
    logger.error('Error deleting reimbursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /reimbursements/:id/approve - Approve reimbursement (Level 1 or Super Admin)
router.post('/:id/approve', requirePermission('reimbursements.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userLevel = await getUserLevel(userId);
    const { comments } = req.body;
    
    // Get existing reimbursement
    const [existing] = await db.query(`
      SELECT r.*, e.user_id as employee_user_id
      FROM reimbursements r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ?
    `, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    const reimbursement = existing[0];
    const beforeData = { ...reimbursement };
    
    // Determine approval action based on user level and current approval level
    if (userLevel === 0) {
      // Super Admin approval
      if (reimbursement.current_approval_level === 'Super Admin' || reimbursement.current_approval_level === 'Level 1 Approved') {
        await db.query(`
          UPDATE reimbursements 
          SET 
            status = 'Super Admin Approved',
            super_admin_approved_by = ?,
            super_admin_approved_at = CURRENT_TIMESTAMP,
            current_approval_level = 'Completed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId, id]);
      } else {
        return res.status(400).json({ error: 'This claim is not ready for Super Admin approval' });
      }
    } else if (userLevel === 1) {
      // Level 1 approval
      if (reimbursement.current_approval_level === 'Level 2' && reimbursement.status === 'Pending') {
        await db.query(`
          UPDATE reimbursements 
          SET 
            status = 'Level 1 Approved',
            level_1_approved_by = ?,
            level_1_approved_at = CURRENT_TIMESTAMP,
            current_approval_level = 'Super Admin',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId, id]);
      } else {
        return res.status(400).json({ error: 'This claim is not ready for Level 1 approval' });
      }
    } else {
      return res.status(403).json({ error: 'You do not have permission to approve reimbursements' });
    }
    
    const [updated] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    
    // Create audit log
    await logUpdate(req, 'Reimbursements', id, beforeData, updated[0], 'Reimbursement');
    
    // Notify employee
    await notifyReimbursementStatusUpdated(
      reimbursement.employee_user_id,
      parseInt(id),
      beforeData.status,
      updated[0].status,
      userId,
      reimbursement.amount,
      reimbursement.category
    );
    
    res.json({ data: updated[0], message: 'Reimbursement approved successfully' });
  } catch (error) {
    logger.error('Error approving reimbursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /reimbursements/:id/reject - Reject reimbursement (Level 1 or Super Admin)
router.post('/:id/reject', requirePermission('reimbursements.approve'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userLevel = await getUserLevel(userId);
    const { rejection_reason } = req.body;
    
    if (!rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    // Get existing reimbursement
    const [existing] = await db.query(`
      SELECT r.*, e.user_id as employee_user_id
      FROM reimbursements r
      LEFT JOIN employees e ON r.employee_id = e.id
      WHERE r.id = ?
    `, [id]);
    
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    const reimbursement = existing[0];
    const beforeData = { ...reimbursement };
    
    // Determine rejection action based on user level and current approval level
    if (userLevel === 0) {
      // Super Admin rejection
      if (reimbursement.current_approval_level === 'Super Admin' || reimbursement.current_approval_level === 'Level 1 Approved') {
        await db.query(`
          UPDATE reimbursements 
          SET 
            status = 'Super Admin Rejected',
            super_admin_rejected_by = ?,
            super_admin_rejected_at = CURRENT_TIMESTAMP,
            super_admin_rejection_reason = ?,
            current_approval_level = 'Completed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId, rejection_reason, id]);
      } else {
        return res.status(400).json({ error: 'This claim is not ready for Super Admin rejection' });
      }
    } else if (userLevel === 1) {
      // Level 1 rejection
      if (reimbursement.current_approval_level === 'Level 2' && reimbursement.status === 'Pending') {
        await db.query(`
          UPDATE reimbursements 
          SET 
            status = 'Level 1 Rejected',
            level_1_rejected_by = ?,
            level_1_rejected_at = CURRENT_TIMESTAMP,
            level_1_rejection_reason = ?,
            current_approval_level = 'Completed',
            updated_at = CURRENT_TIMESTAMP
          WHERE id = ?
        `, [userId, rejection_reason, id]);
      } else {
        return res.status(400).json({ error: 'This claim is not ready for Level 1 rejection' });
      }
    } else {
      return res.status(403).json({ error: 'You do not have permission to reject reimbursements' });
    }
    
    const [updated] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    
    // Create audit log
    await logUpdate(req, 'Reimbursements', id, beforeData, updated[0], 'Reimbursement');
    
    // Notify employee
    await notifyReimbursementStatusUpdated(
      reimbursement.employee_user_id,
      parseInt(id),
      beforeData.status,
      updated[0].status,
      userId,
      reimbursement.amount,
      reimbursement.category
    );
    
    res.json({ data: updated[0], message: 'Reimbursement rejected' });
  } catch (error) {
    logger.error('Error rejecting reimbursement:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /reimbursements/:id/attachments - Upload additional files
router.post('/:id/attachments', uploadReimbursementFiles.array('files', 10), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    
    // Check if reimbursement exists
    const [existing] = await db.query('SELECT * FROM reimbursements WHERE id = ?', [id]);
    if (existing.length === 0) {
      // Clean up uploaded files
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ error: 'Reimbursement not found' });
    }
    
    // Check if user can upload (only employee who created it)
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0 || employees[0].id !== existing[0].employee_id) {
      // Clean up uploaded files
      if (req.files) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(403).json({ error: 'You can only upload files for your own reimbursement claims' });
    }
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const uploadedFiles = [];
    for (const file of req.files) {
      const filePath = `/uploads/reimbursements/${file.filename}`;
      const [attachmentResult] = await db.query(`
        INSERT INTO attachments (
          reimbursement_id, uploaded_by, path, original_filename, mime_type, size
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
    logger.error('Error uploading files:', error);
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

// DELETE /reimbursements/:id/attachments/:attachmentId - Delete attachment
router.delete('/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user.id;
    
    // Check if attachment exists and belongs to reimbursement
    const [attachments] = await db.query(`
      SELECT a.*, r.employee_id
      FROM attachments a
      LEFT JOIN reimbursements r ON a.reimbursement_id = r.id
      WHERE a.id = ? AND a.reimbursement_id = ?
    `, [attachmentId, id]);
    
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachments[0];
    
    // Check if user can delete (only employee who created it or admin)
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    const isEmployee = employees.length > 0 && employees[0].id === attachment.employee_id;
    const isAdmin = ['Admin', 'Super Admin'].includes(req.user.role);
    
    if (!isEmployee && !isAdmin) {
      return res.status(403).json({ error: 'You do not have permission to delete this attachment' });
    }
    
    // Delete file
    const filePath = path.join(__dirname, '..', attachment.path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await db.query('DELETE FROM attachments WHERE id = ?', [attachmentId]);
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { uploadDocument } from './upload-config.js';
import { decryptDocumentNumber, encryptDocumentNumber } from '../../utils/encryption.js';
import { getManagerRoles, isSuperAdmin } from '../../utils/roleHelpers.js';
import { logger } from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get employee documents (users can access their own documents)
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    
    logger.debug('=== GET EMPLOYEE DOCUMENTS REQUEST ===');
    logger.debug('Employee ID:', id);
    logger.debug('Current User ID:', currentUserId);
    logger.debug('Current User Role:', currentUserRole);
    
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager', 'Admin', 'Team Lead', 'Team Leader'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    logger.debug('Manager Roles:', managerRoles);
    logger.debug('All Manager Roles:', allManagerRoles);
    logger.debug('Is Super Admin:', isUserSuperAdmin);
    logger.debug('Can Manage:', canManage);
    
    // Check if employee exists and user has access
    const [employees] = await db.query(`
      SELECT e.user_id, r.level as role_level, p.level as position_level
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE e.id = ?
    `, [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeUserId = employees[0].user_id;
    const isOwnProfile = parseInt(currentUserId) === parseInt(employeeUserId);
    
    // Get target employee's level
    const targetRoleLevel = employees[0].role_level;
    const targetPositionLevel = employees[0].position_level;
    const targetEmployeeLevel = targetRoleLevel !== null && targetRoleLevel !== undefined
      ? targetRoleLevel
      : (targetPositionLevel !== null && targetPositionLevel !== undefined
        ? targetPositionLevel
        : 2);
    
    // Get current user's level
    const [currentUserData] = await db.query(`
      SELECT 
        r.level as role_level,
        p.level as position_level
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [currentUserId]);
    
    let currentUserLevel = 2; // default
    if (currentUserData.length > 0) {
      const roleLevel = currentUserData[0].role_level;
      const positionLevel = currentUserData[0].position_level;
      currentUserLevel = roleLevel !== null && roleLevel !== undefined
        ? roleLevel
        : (positionLevel !== null && positionLevel !== undefined
          ? positionLevel
          : 2);
    }
    
    // Level 1 employees can access documents of Level 2 employees
    const isLevel1AccessingLevel2 = currentUserLevel === 1 && targetEmployeeLevel === 2;
    
    logger.debug('Employee User ID:', employeeUserId);
    logger.debug('Is Own Profile:', isOwnProfile);
    logger.debug('Current User Level:', currentUserLevel);
    logger.debug('Target Employee Level:', targetEmployeeLevel);
    logger.debug('Is Level 1 Accessing Level 2:', isLevel1AccessingLevel2);
    
    if (!canManage && !isOwnProfile && !isLevel1AccessingLevel2) {
      logger.debug('Access denied - user cannot manage and it is not their own profile');
      return res.status(403).json({ error: 'You can only access your own documents' });
    }
    
    logger.debug('Access granted - fetching documents');
    
    const [documents] = await db.query(`
      SELECT
        d.id,
        d.employee_id,
        d.document_type,
        d.document_number,
        d.file_path,
        d.file_name,
        d.mime_type,
        d.file_size,
        d.verified,
        d.verified_by,
        d.verified_at,
        d.uploaded_at,
        u.name as verified_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.verified_by = u.id
      WHERE d.employee_id = ?
      ORDER BY d.uploaded_at DESC
    `, [id]);

    // Decrypt document_number before sending
    const decryptedDocuments = documents.map(doc => {
      if (doc.document_number) {
        doc.document_number = decryptDocumentNumber(doc.document_number);
      }
      return doc;
    });

    res.json({ data: decryptedDocuments });
  } catch (error) {
    logger.error('Error fetching employee documents:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload employee document
router.post('/:id/documents', uploadDocument.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const { document_type, document_number } = req.body;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager', 'Admin', 'Team Lead', 'Team Leader'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    // Check if employee exists and user has access
    const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeUserId = employees[0].user_id;
    const isOwnProfile = parseInt(currentUserId) === parseInt(employeeUserId);
    
    if (!canManage && !isOwnProfile) {
      return res.status(403).json({ error: 'You can only upload documents for your own profile' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    if (!document_type) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: 'Document type is required' });
    }
    
    const filePath = `/uploads/employee-documents/${req.file.filename}`;
    
    // Check for duplicate Aadhaar number if document_type is Aadhaar
    if (document_type === 'Aadhaar' && document_number && document_number.trim() !== '') {
      // Get all Aadhaar documents and check for duplicates
      const [allAadhaarDocs] = await db.query(`
        SELECT id, employee_id, document_number 
        FROM employee_documents 
        WHERE document_type = 'Aadhaar' AND document_number IS NOT NULL AND document_number != ''
      `);
      
      for (const doc of allAadhaarDocs) {
        if (doc.document_number) {
          try {
            const decryptedNumber = decryptDocumentNumber(doc.document_number);
            if (decryptedNumber && decryptedNumber.trim().toUpperCase() === document_number.trim().toUpperCase()) {
              // Clean up uploaded file
              if (fs.existsSync(req.file.path)) {
                fs.unlinkSync(req.file.path);
              }
              return res.status(400).json({ 
                error: `Aadhaar number "${document_number}" already exists. Please use a different Aadhaar number.` 
              });
            }
          } catch (decryptError) {
            // If decryption fails, skip this document (might be corrupted or old format)
            logger.warn('Failed to decrypt document number for duplicate check:', decryptError);
          }
        }
      }
    }
    
    // Check if employee already has this document type (unique constraint)
    const [existingDoc] = await db.query(`
      SELECT id FROM employee_documents 
      WHERE employee_id = ? AND document_type = ?
    `, [id, document_type]);
    
    if (existingDoc.length > 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: `Employee already has a ${document_type} document. Please delete the existing document first.` 
      });
    }
    
    // Encrypt document_number before saving
    const encryptedDocumentNumber = document_number ? encryptDocumentNumber(document_number) : null;
    
    const [result] = await db.query(`
      INSERT INTO employee_documents (
        employee_id, document_type, document_number, file_path, file_name, mime_type, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      document_type,
      encryptedDocumentNumber,
      filePath,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    ]);
    
    const [newDocument] = await db.query(`
      SELECT 
        d.*,
        u.name as verified_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.verified_by = u.id
      WHERE d.id = ?
    `, [result.insertId]);
    
    // Decrypt document_number before sending
    const document = newDocument[0];
    if (document.document_number) {
      document.document_number = decryptDocumentNumber(document.document_number);
    }
    
    res.status(201).json({ data: document });
  } catch (error) {
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

// Verify employee document (Admin, Team Lead, Manager only)
router.put('/:id/documents/:docId/verify', async (req, res) => {
  try {
    const { id, docId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager', 'Admin', 'Team Lead', 'Team Leader'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    if (!canManage) {
      return res.status(403).json({ error: 'Only Admin, Team Lead, or Manager can verify documents' });
    }
    
    // Check if document exists
    const [documents] = await db.query(`
      SELECT d.*, e.user_id as employee_user_id
      FROM employee_documents d
      INNER JOIN employees e ON d.employee_id = e.id
      WHERE d.id = ? AND d.employee_id = ?
    `, [docId, id]);
    
    if (documents.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update document verification status
    await db.query(`
      UPDATE employee_documents SET
        verified = ?,
        verified_by = ?,
        verified_at = NOW()
      WHERE id = ?
    `, [true, currentUserId, docId]);
    
    // Fetch updated document
    const [updatedDocs] = await db.query(`
      SELECT 
        d.*,
        u.name as verified_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.verified_by = u.id
      WHERE d.id = ?
    `, [docId]);
    
    const updatedDoc = updatedDocs[0];
    // Decrypt document_number before sending
    if (updatedDoc.document_number) {
      updatedDoc.document_number = decryptDocumentNumber(updatedDoc.document_number);
    }
    
    res.json({ 
      data: updatedDoc,
      message: 'Document verified successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Unverify employee document (Admin, Team Lead, Manager only)
router.put('/:id/documents/:docId/unverify', async (req, res) => {
  try {
    const { id, docId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager', 'Admin', 'Team Lead', 'Team Leader'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    if (!canManage) {
      return res.status(403).json({ error: 'Only Admin, Team Lead, or Manager can unverify documents' });
    }
    
    // Check if document exists
    const [documents] = await db.query(`
      SELECT d.*, e.user_id as employee_user_id
      FROM employee_documents d
      INNER JOIN employees e ON d.employee_id = e.id
      WHERE d.id = ? AND d.employee_id = ?
    `, [docId, id]);
    
    if (documents.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    // Update document verification status
    await db.query(`
      UPDATE employee_documents SET
        verified = ?,
        verified_by = NULL,
        verified_at = NULL
      WHERE id = ?
    `, [false, docId]);
    
    // Fetch updated document
    const [updatedDocs] = await db.query(`
      SELECT 
        d.*,
        u.name as verified_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.verified_by = u.id
      WHERE d.id = ?
    `, [docId]);
    
    const updatedDoc = updatedDocs[0];
    // Decrypt document_number before sending
    if (updatedDoc.document_number) {
      updatedDoc.document_number = decryptDocumentNumber(updatedDoc.document_number);
    }
    
    res.json({ 
      data: updatedDoc,
      message: 'Document unverified successfully' 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee document
router.delete('/:id/documents/:docId', async (req, res) => {
  try {
    const { id, docId } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    // Check if document exists
    const [documents] = await db.query(`
      SELECT d.*, e.user_id as employee_user_id, p.level as employee_level
      FROM employee_documents d
      INNER JOIN employees e ON d.employee_id = e.id
      LEFT JOIN positions p ON e.position_id = p.id
      WHERE d.id = ? AND d.employee_id = ?
    `, [docId, id]);
    
    if (documents.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documents[0];
    const isOwnProfile = parseInt(currentUserId) === parseInt(document.employee_user_id);
    const isLevel1 = document.employee_level === 1;
    const isLevel2 = document.employee_level === 2;
    
    // Get current user's level to check if level 1 editing level 2
    const [currentUserData] = await db.query(`
      SELECT 
        r.level as role_level,
        p.level as position_level
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [currentUserId]);
    
    let currentUserLevel = 2; // default
    if (currentUserData.length > 0) {
      const roleLevel = currentUserData[0].role_level;
      const positionLevel = currentUserData[0].position_level;
      currentUserLevel = roleLevel !== null && roleLevel !== undefined
        ? roleLevel
        : (positionLevel !== null && positionLevel !== undefined
          ? positionLevel
          : 2);
    }
    
    // Level 1 employees can delete documents of Level 2 employees
    const isLevel1EditingLevel2 = currentUserLevel === 1 && isLevel2;
    
    // Check permissions
    if (!canManage && !isOwnProfile && !isLevel1EditingLevel2) {
      return res.status(403).json({ error: 'You can only delete your own documents' });
    }
    
    // If document is verified and user is level 1 (not Super Admin), prevent deletion
    // Level 2 users can delete their own verified documents
    if (document.verified && isLevel1 && !isUserSuperAdmin && !isLevel2) {
      return res.status(403).json({ error: 'Level 1 users cannot delete verified documents. Only level 2 users can delete their own verified documents.' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', '..', document.file_path);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
    
    // Delete from database
    await db.query('DELETE FROM employee_documents WHERE id = ?', [docId]);
    
    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;


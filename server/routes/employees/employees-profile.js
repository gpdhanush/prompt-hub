import express from 'express';
import { db } from '../../config/database.js';
import { authenticate } from '../../middleware/auth.js';
import { uploadProfilePhoto, uploadDocument } from './upload-config.js';
import { encryptBankDetails, decryptBankDetails, encryptDocumentNumber, decryptDocumentNumber } from '../../utils/encryption.js';
import { logCreate, logUpdate } from '../../utils/auditLogger.js';
import { logger } from '../../utils/logger.js';
import { validateAndSanitizeObject } from '../../utils/inputValidation.js';
import fs from 'fs';

const router = express.Router();

// Upload profile photo - accessible to all authenticated users
router.post('/upload-profile-photo', authenticate, uploadProfilePhoto.single('file'), async (req, res) => {
  try {
    logger.debug('=== PROFILE PHOTO UPLOAD ===');
    logger.debug('File received:', req.file ? 'Yes' : 'No');
    logger.debug('File details:', req.file);
    
    if (!req.file) {
      logger.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = `/uploads/profile-photos/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${filePath}`;
    
    logger.info('File uploaded successfully:', filePath);
    
    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      filePath: filePath,
      url: fullUrl,
      filename: req.file.filename
    });
  } catch (error) {
    logger.error('Upload error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Update own profile - accessible to all authenticated users
router.put('/my-profile', authenticate, async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get employee ID for current user
    const [employees] = await db.query(
      'SELECT id FROM employees WHERE user_id = ?',
      [currentUserId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' });
    }

    const employeeId = employees[0].id;

    let { 
      date_of_birth, gender, date_of_joining,
      bank_name, bank_account_number, ifsc_code,
      address1, address2, landmark, state, district, pincode,
      emergency_contact_name, emergency_contact_relation, emergency_contact_number,
      profile_photo_url, pf_uan_number,
      teams_id, whatsapp, emp_code
    } = req.body;

    // Validate and sanitize all text inputs for HTML/script tags
    const textFields = ['bank_name', 'bank_account_number', 'ifsc_code', 
      'address1', 'address2', 'landmark', 'state', 'district', 
      'emergency_contact_name', 'emergency_contact_relation', 'pf_uan_number', 'teams_id', 'emp_code'];
    
    const validation = validateAndSanitizeObject(req.body, textFields);
    if (validation.errors && validation.errors.length > 0) {
      return res.status(400).json({ 
        error: 'Invalid input detected', 
        details: validation.errors.join('; ') 
      });
    }
    
    // Use sanitized values
    bank_name = validation.data.bank_name || bank_name;
    bank_account_number = validation.data.bank_account_number || bank_account_number;
    ifsc_code = validation.data.ifsc_code || ifsc_code;
    address1 = validation.data.address1 || address1;
    address2 = validation.data.address2 || address2;
    landmark = validation.data.landmark || landmark;
    state = validation.data.state || state;
    district = validation.data.district || district;
    emergency_contact_name = validation.data.emergency_contact_name || emergency_contact_name;
    emergency_contact_relation = validation.data.emergency_contact_relation || emergency_contact_relation;
    pf_uan_number = validation.data.pf_uan_number || pf_uan_number;
    teams_id = validation.data.teams_id || teams_id;
    emp_code = validation.data.emp_code || emp_code;

    // Get current employee data for audit log
    const [currentEmployee] = await db.query(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );

    if (currentEmployee.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }

    const beforeData = { ...currentEmployee[0] };

    // Encrypt bank details before storing
    const encryptedBankDetails = encryptBankDetails({
      bank_name: bank_name || null,
      bank_account_number: bank_account_number || null,
      ifsc_code: ifsc_code || null
    });

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (date_of_birth !== undefined) {
      updateFields.push('date_of_birth = ?');
      updateValues.push(date_of_birth || null);
    }
    if (gender !== undefined) {
      updateFields.push('gender = ?');
      updateValues.push(gender || null);
    }
    if (date_of_joining !== undefined) {
      updateFields.push('date_of_joining = ?');
      updateValues.push(date_of_joining || null);
    }
    if (emp_code !== undefined) {
      updateFields.push('emp_code = ?');
      updateValues.push(emp_code || null);
    }
    if (bank_name !== undefined) {
      updateFields.push('bank_name = ?');
      updateValues.push(encryptedBankDetails.bank_name);
    }
    if (bank_account_number !== undefined) {
      updateFields.push('bank_account_number = ?');
      updateValues.push(encryptedBankDetails.bank_account_number);
    }
    if (ifsc_code !== undefined) {
      updateFields.push('ifsc_code = ?');
      updateValues.push(encryptedBankDetails.ifsc_code);
    }
    if (pf_uan_number !== undefined) {
      updateFields.push('pf_uan_number = ?');
      updateValues.push(pf_uan_number || null);
    }
    if (address1 !== undefined) {
      updateFields.push('address1 = ?');
      updateValues.push(address1 || null);
    }
    if (address2 !== undefined) {
      updateFields.push('address2 = ?');
      updateValues.push(address2 || null);
    }
    if (landmark !== undefined) {
      updateFields.push('landmark = ?');
      updateValues.push(landmark || null);
    }
    if (state !== undefined) {
      updateFields.push('state = ?');
      updateValues.push(state || null);
    }
    if (district !== undefined) {
      updateFields.push('district = ?');
      updateValues.push(district || null);
    }
    if (pincode !== undefined) {
      updateFields.push('pincode = ?');
      updateValues.push(pincode || null);
    }
    if (emergency_contact_name !== undefined) {
      updateFields.push('emergency_contact_name = ?');
      updateValues.push(emergency_contact_name || null);
    }
    if (emergency_contact_relation !== undefined) {
      updateFields.push('emergency_contact_relation = ?');
      updateValues.push(emergency_contact_relation || null);
    }
    if (emergency_contact_number !== undefined) {
      updateFields.push('emergency_contact_number = ?');
      updateValues.push(emergency_contact_number || null);
    }
    if (profile_photo_url !== undefined) {
      updateFields.push('profile_photo_url = ?');
      updateValues.push(profile_photo_url || null);
    }
    if (teams_id !== undefined) {
      updateFields.push('teams_id = ?');
      updateValues.push(teams_id || null);
    }
    if (whatsapp !== undefined) {
      updateFields.push('whatsapp = ?');
      updateValues.push(whatsapp || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_at = NOW()');
    updateValues.push(employeeId);

    const updateQuery = `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`;
    await db.query(updateQuery, updateValues);

    // Get updated employee data
    const [updatedEmployee] = await db.query(
      'SELECT * FROM employees WHERE id = ?',
      [employeeId]
    );

    if (updatedEmployee.length === 0) {
      return res.status(404).json({ error: 'Employee not found after update' });
    }

    const employee = updatedEmployee[0];

    // Decrypt bank details for response
    const decryptedBankDetails = decryptBankDetails({
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      ifsc_code: employee.ifsc_code
    });
    
    if (decryptedBankDetails) {
      if (decryptedBankDetails.bank_name !== null && decryptedBankDetails.bank_name !== undefined) {
        employee.bank_name = decryptedBankDetails.bank_name;
      }
      if (decryptedBankDetails.bank_account_number !== null && decryptedBankDetails.bank_account_number !== undefined) {
        employee.bank_account_number = decryptedBankDetails.bank_account_number;
      }
      if (decryptedBankDetails.ifsc_code !== null && decryptedBankDetails.ifsc_code !== undefined) {
        employee.ifsc_code = decryptedBankDetails.ifsc_code;
      }
    }

    // Create audit log for employee update
    await logUpdate(req, 'Employees', employeeId, beforeData, employee, 'Employee');
    
    res.json({ data: employee });
  } catch (error) {
    logger.error('Error updating own profile:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload own document - accessible to all authenticated users
router.post('/my-documents', authenticate, uploadDocument.single('file'), async (req, res) => {
  try {
    const currentUserId = req.user?.id;
    if (!currentUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get employee ID for current user
    const [employees] = await db.query(
      'SELECT id FROM employees WHERE user_id = ?',
      [currentUserId]
    );

    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' });
    }

    const employeeId = employees[0].id;
    const { document_type, document_number } = req.body;

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
    `, [employeeId, document_type]);
    
    if (existingDoc.length > 0) {
      // Clean up uploaded file
      if (fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ 
        error: `You already have a ${document_type} document. Please delete the existing document first.` 
      });
    }

    // Encrypt document_number before saving
    const encryptedDocumentNumber = document_number ? encryptDocumentNumber(document_number) : null;

    const [result] = await db.query(`
      INSERT INTO employee_documents (
        employee_id, document_type, document_number, file_path, file_name, mime_type, file_size
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [
      employeeId,
      document_type,
      encryptedDocumentNumber,
      filePath,
      req.file.originalname,
      req.file.mimetype,
      req.file.size
    ]);

    // Create audit log
    await logCreate(req, 'Employee Documents', result.insertId, {
      employee_id: employeeId,
      document_type,
      file_path: filePath
    }, 'Employee Document');

    res.json({
      data: {
        id: result.insertId,
        employee_id: employeeId,
        document_type,
        file_path: filePath,
        file_name: req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        uploaded_at: new Date()
      }
    });
  } catch (error) {
    logger.error('Error uploading own document:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;


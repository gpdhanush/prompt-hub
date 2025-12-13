import express from 'express';
import { db } from '../config/database.js';
import { authenticate, canAccessUserManagement, requirePermission } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { encryptBankDetails, decryptBankDetails, encryptDocumentNumber, decryptDocumentNumber } from '../utils/encryption.js';
import { logCreate, logUpdate, logDelete, getClientIp, getUserAgent } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';
import { validateUserCreation, getAvailablePositions } from '../utils/positionValidation.js';
import { getManagerRoles, getSuperAdminRole, isSuperAdmin, getAllRoles, getRolesByLevel } from '../utils/roleHelpers.js';

const router = express.Router();

// Configure multer for profile photo uploads
// Use __dirname to ensure consistent path (server/uploads/profile-photos)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const profilePhotoUploadDir = path.join(__dirname, '..', 'uploads', 'profile-photos');
if (!fs.existsSync(profilePhotoUploadDir)) {
  fs.mkdirSync(profilePhotoUploadDir, { recursive: true });
}

const profilePhotoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, profilePhotoUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `profile-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const profilePhotoFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images (JPEG, PNG, GIF, WebP) are allowed.'), false);
  }
};

const uploadProfilePhoto = multer({
  storage: profilePhotoStorage,
  fileFilter: profilePhotoFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

// Configure multer for employee document uploads
const documentUploadDir = path.join(__dirname, '..', 'uploads', 'employee-documents');
if (!fs.existsSync(documentUploadDir)) {
  fs.mkdirSync(documentUploadDir, { recursive: true });
}

const documentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, documentUploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `doc-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const documentFilter = (req, file, cb) => {
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

const uploadDocument = multer({
  storage: documentStorage,
  fileFilter: documentFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Upload profile photo - accessible to all authenticated users (before canAccessUserManagement)
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

// Apply authentication to all routes
router.use(authenticate);

// Get employee by user_id - accessible to all authenticated users (for profile)
router.get('/by-user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user?.id;
    
    // Users can only access their own employee data, unless they're admin/team lead
    const currentUserRole = req.user?.role || '';
    // Get manager roles from database
    const managerRoles = await getManagerRoles();
    const superAdminRole = await getSuperAdminRole();
    const allManagerRoles = [...managerRoles, 'Manager']; // Include Manager as it might not be in DB
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    if (!canManage && parseInt(userId) !== currentUserId) {
      return res.status(403).json({ error: 'You can only access your own profile' });
    }
    
    const [employees] = await db.query(`
      SELECT 
        e.id,
        e.user_id,
        e.emp_code,
        e.team_lead_id,
        DATE_FORMAT(e.date_of_birth, '%Y-%m-%d') as date_of_birth,
        e.gender,
        DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining,
        e.employee_status,
        e.status,
        e.state,
        e.district,
        e.pincode,
        e.country,
        e.bank_name,
        e.bank_account_number,
        e.ifsc_code,
        e.address1,
        e.address2,
        e.landmark,
        e.pf_uan_number,
        e.emergency_contact_name,
        e.emergency_contact_relation,
        e.emergency_contact_number,
        e.annual_leave_count,
        e.sick_leave_count,
        e.casual_leave_count,
        e.profile_photo_url,
        e.created_by,
        e.created_at,
        e.updated_at,
        u.name,
        u.email,
        u.mobile,
        r.name as role,
        p.name as position
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE e.user_id = ?
    `, [userId]);
    
    if (employees.length === 0) {
      return res.json({ data: null });
    }
    
    // Decrypt bank details before sending
    const employee = employees[0];
    const decryptedBankDetails = decryptBankDetails({
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      ifsc_code: employee.ifsc_code
    });
    
    if (decryptedBankDetails) {
      // Update fields that were successfully decrypted
      // If a field exists in decryptedBankDetails, use it (even if it's the same as original - means it was plain text)
      if (decryptedBankDetails.hasOwnProperty('bank_name')) {
        employee.bank_name = decryptedBankDetails.bank_name || '';
      }
      if (decryptedBankDetails.hasOwnProperty('bank_account_number')) {
        employee.bank_account_number = decryptedBankDetails.bank_account_number || '';
      }
      if (decryptedBankDetails.hasOwnProperty('ifsc_code')) {
        employee.ifsc_code = decryptedBankDetails.ifsc_code || '';
      }
    } else {
      // If decryption completely failed, check if data looks encrypted and clear it
      // This prevents showing encrypted strings to users
      if (employee.bank_name && employee.bank_name.length > 50 && /^[A-Za-z0-9+/=]+$/.test(employee.bank_name)) {
        // Looks like encrypted base64 data that couldn't be decrypted
        employee.bank_name = '';
      }
      if (employee.bank_account_number && employee.bank_account_number.length > 50 && /^[A-Za-z0-9+/=]+$/.test(employee.bank_account_number)) {
        employee.bank_account_number = '';
      }
      if (employee.ifsc_code && employee.ifsc_code.length > 50 && /^[A-Za-z0-9+/=]+$/.test(employee.ifsc_code)) {
        employee.ifsc_code = '';
      }
    }
    
    res.json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restrict access to Employees page - uses permission-based authorization
// Super Admin always has access, others need 'employees.view' permission
router.use(requirePermission('employees.view'));

// Get available positions for current user (filtered by hierarchy)
router.get('/available-positions', async (req, res) => {
  try {
    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const availablePositions = await getAvailablePositions(creatorUserId);
    res.json({ data: availablePositions });
  } catch (error) {
    logger.error('Error getting available positions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all employees with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Get current user's role
    const currentUserRole = req.user?.role || '';
    const currentUserId = req.user?.id;
    const userIsSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    
    logger.debug('=== GET EMPLOYEES REQUEST ===');
    logger.debug('Current user ID:', req.user?.id);
    logger.debug('Current user role:', currentUserRole);
    logger.debug('Is Super Admin:', userIsSuperAdmin);
    
    let query = `
      SELECT 
        e.id,
        e.emp_code,
        e.status,
        e.employee_status,
        e.profile_photo_url,
        DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining,
        u.name,
        u.email,
        u.mobile,
        r.name as role,
        p.name as position,
        tl.name as team_lead_name
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl ON tl_emp.user_id = tl.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not Super Admin, exclude Super Admin users from results
    if (!userIsSuperAdmin) {
      const superAdminRole = await getSuperAdminRole();
      if (superAdminRole) {
        query += ` AND r.name != ?`;
        params.push(superAdminRole.name);
        logger.debug('Filtering out Super Admin employees for non-Super Admin user');
      }
    } else {
      logger.debug('Super Admin user - showing all employees including Super Admins');
    }
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR e.emp_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [employees] = await db.query(query, params);
    
    logger.debug(`Found ${employees.length} employees`);
    logger.debug('Employee roles in results:', employees.map(e => `${e.name} (${e.role || 'N/A'})`).join(', '));
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const countParams = [];
    
    // If not Super Admin, exclude Super Admin users from count
    if (!userIsSuperAdmin) {
      const superAdminRole = await getSuperAdminRole();
      if (superAdminRole) {
        countQuery += ` AND r.name != ?`;
        countParams.push(superAdminRole.name);
      }
    }
    
    if (search) {
      countQuery += ` AND (u.name LIKE ? OR u.email LIKE ? OR e.emp_code LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: employees,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get employee by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [employees] = await db.query(`
      SELECT 
        e.id,
        e.user_id,
        e.emp_code,
        e.team_lead_id,
        DATE_FORMAT(e.date_of_birth, '%Y-%m-%d') as date_of_birth,
        e.gender,
        DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining,
        e.employee_status,
        e.status,
        e.state,
        e.district,
        e.pincode,
        e.country,
        e.bank_name,
        e.bank_account_number,
        e.ifsc_code,
        e.address1,
        e.address2,
        e.landmark,
        e.pf_uan_number,
        e.emergency_contact_name,
        e.emergency_contact_relation,
        e.emergency_contact_number,
        e.annual_leave_count,
        e.sick_leave_count,
        e.casual_leave_count,
        e.profile_photo_url,
        e.created_by,
        e.created_at,
        e.updated_at,
        u.name,
        u.email,
        u.mobile,
        u.status as user_status,
        r.name as role,
        tl.name as team_lead_name,
        tl.id as team_lead_user_id
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl ON tl_emp.user_id = tl.id
      WHERE e.id = ?
    `, [id]);
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Decrypt bank details before sending
    const employee = employees[0];
    const decryptedBankDetails = decryptBankDetails({
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      ifsc_code: employee.ifsc_code
    });
    
    if (decryptedBankDetails) {
      // Update fields that were successfully decrypted
      // If a field exists in decryptedBankDetails, use it (even if it's the same as original - means it was plain text)
      if (decryptedBankDetails.hasOwnProperty('bank_name')) {
        employee.bank_name = decryptedBankDetails.bank_name;
      }
      if (decryptedBankDetails.hasOwnProperty('bank_account_number')) {
        employee.bank_account_number = decryptedBankDetails.bank_account_number;
      }
      if (decryptedBankDetails.hasOwnProperty('ifsc_code')) {
        employee.ifsc_code = decryptedBankDetails.ifsc_code;
      }
    }
    
    res.json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create employee
router.post('/', async (req, res) => {
  let userResult = null; // Declare outside try block for cleanup in catch
  try {
    const { 
      name, email, mobile, password, role, position, empCode, teamLeadId,
      date_of_birth, gender, date_of_joining, employee_status,
      bank_name, bank_account_number, ifsc_code,
      address1, address2, landmark, state, district, pincode,
      emergency_contact_name, emergency_contact_relation, emergency_contact_number,
      annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url
    } = req.body;
    
    const dbRoleName = role || 'Developer';
    
    // Get position_id if provided - validate position hierarchy
    let positionId = null;
    if (position) {
      // Map frontend position values to database position names if needed
      const positionMapping = {
        'developer': 'Developer',
        'senior-dev': 'Senior Developer',
        'tech-lead': 'Team Lead',
        'pm': 'Project Manager',
        'qa': 'QA Engineer'
      };
      
      const dbPositionName = positionMapping[position] || position;
      const [positions] = await db.query('SELECT id FROM positions WHERE name = ?', [dbPositionName]);
      if (positions.length > 0) {
        positionId = positions[0].id;
      } else {
        // If position doesn't exist, return error (don't auto-create)
        return res.status(400).json({ error: `Position "${dbPositionName}" not found. Please select a valid position.` });
      }
      
    }
    
    // Get roleId early for validation (since positions are display-only, we validate based on role level)
    let roleId = null;
    if (dbRoleName) {
      const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [dbRoleName]);
      if (roles.length > 0) {
        roleId = roles[0].id;
      }
    }
    
    // Validate role level - check if creator can create user with this role
    // Since positions are display-only, we validate based on role level
    const creatorUserId = req.user?.id;
    if (creatorUserId && roleId) {
      try {
        const validation = await validateUserCreation(creatorUserId, roleId, positionId);
        if (!validation.valid) {
          return res.status(403).json({ error: validation.error });
        }
      } catch (validationError) {
        // If validation fails due to missing columns, log warning but allow creation
        // This handles the case where migration hasn't been run yet
        if (validationError.message && validationError.message.includes('ER_BAD_FIELD_ERROR')) {
          logger.warn('Role level validation skipped - migration may not be run:', validationError.message);
          // Allow creation to proceed without validation
        } else {
          // For other validation errors, return the error
          return res.status(403).json({ error: validationError.message || 'Role validation failed' });
        }
      }
    }
    
    // Validation
    if (mobile && mobile !== '') {
      const mobileDigits = mobile.replace(/\D/g, ''); // Remove non-digits
      if (mobileDigits.length > 10) {
        return res.status(400).json({ error: 'Mobile number must be maximum 10 digits' });
      }
      if (mobileDigits.length > 0 && !/^\d{1,10}$/.test(mobileDigits)) {
        return res.status(400).json({ error: 'Mobile number must contain only numbers' });
      }
    }
    
    if (emergency_contact_number && emergency_contact_number !== '') {
      const contactDigits = emergency_contact_number.replace(/\D/g, ''); // Remove non-digits
      if (contactDigits.length > 10) {
        return res.status(400).json({ error: 'Emergency contact number must be maximum 10 digits' });
      }
      if (contactDigits.length > 0 && !/^\d{1,10}$/.test(contactDigits)) {
        return res.status(400).json({ error: 'Emergency contact number must contain only numbers' });
      }
    }
    
    if (pincode && pincode !== '') {
      const pincodeDigits = pincode.replace(/\D/g, ''); // Remove non-digits
      if (pincodeDigits.length > 6) {
        return res.status(400).json({ error: 'Pincode must be maximum 6 digits' });
      }
      if (pincodeDigits.length > 0 && !/^\d{1,6}$/.test(pincodeDigits)) {
        return res.status(400).json({ error: 'Pincode must contain only numbers' });
      }
    }
    
    // Helper function to convert to uppercase
    const toUpperCase = (value) => {
      if (value && typeof value === 'string') {
        return value.trim().toUpperCase();
      }
      return value;
    };
    
    // Helper function to extract only digits
    const extractDigits = (value) => {
      if (value && typeof value === 'string') {
        return value.replace(/\D/g, '');
      }
      return value;
    };
    
    // Convert text fields to uppercase and extract digits for numbers
    const processedName = toUpperCase(name);
    const processedMobile = mobile ? extractDigits(mobile) : mobile;
    
    // Encrypt bank details before saving
    const encryptedBankDetails = encryptBankDetails({
      bank_name: bank_name ? toUpperCase(bank_name) : null,
      bank_account_number: bank_account_number ? toUpperCase(bank_account_number) : null,
      ifsc_code: ifsc_code ? toUpperCase(ifsc_code) : null
    });
    
    const processedBankName = encryptedBankDetails?.bank_name || null;
    const processedBankAccount = encryptedBankDetails?.bank_account_number || null;
    const processedIfsc = encryptedBankDetails?.ifsc_code || null;
    const processedAddress1 = toUpperCase(address1);
    const processedAddress2 = toUpperCase(address2);
    const processedLandmark = toUpperCase(landmark);
    const processedState = toUpperCase(state);
    const processedDistrict = toUpperCase(district);
    const processedPincode = pincode ? extractDigits(pincode) : pincode;
    const processedEmergencyName = toUpperCase(emergency_contact_name);
    const processedEmergencyRelation = toUpperCase(emergency_contact_relation);
    const processedEmergencyNumber = emergency_contact_number ? extractDigits(emergency_contact_number) : emergency_contact_number;
    
    // Check if current user can only create specific roles (Level 1 users can only create Level 2 roles)
    const currentUserRole = req.user?.role;
    const currentUserId = req.user?.id;
    
    // Get manager roles and check if current user is a manager (Level 1)
    const managerRoles = await getManagerRoles();
    const isManager = managerRoles.includes(currentUserRole);
    
    if (isManager && currentUserId) {
      // Get roles that Level 2 users typically have (employee roles)
      const level2Roles = await getRolesByLevel(2);
      
      // If the role being created is not a Level 2 role, check if it's allowed
      // Level 1 managers can typically only create Level 2 employees
      if (level2Roles.length > 0 && !level2Roles.includes(dbRoleName)) {
        return res.status(403).json({ 
          error: `${currentUserRole} can only create employees with roles: ${level2Roles.join(', ')}` 
        });
      }
    }
    
    // Check for duplicate email before creating user
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
    }
    
    // Auto-generate employee code if not provided (format: NTPL0001, NTPL0002, etc.)
    let finalEmpCode = empCode;
    if (!finalEmpCode || finalEmpCode.trim() === '') {
      const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
      const nextNumber = (empCount[0].count + 1).toString().padStart(4, '0');
      finalEmpCode = `NTPL${nextNumber}`;
    }
    
    // Check for duplicate employee code before creating employee
    if (finalEmpCode) {
      const [existingEmployees] = await db.query('SELECT id FROM employees WHERE emp_code = ?', [finalEmpCode]);
      if (existingEmployees.length > 0) {
        return res.status(400).json({ error: `Employee code "${finalEmpCode}" already exists. Please use a different employee code.` });
      }
    }
    
    // Get role details (roleId already fetched above for validation, but get reporting_person_role_id here)
    const [roleDetails] = await db.query('SELECT id, reporting_person_role_id FROM roles WHERE name = ?', [dbRoleName]);
    const finalRoleId = roleId || roleDetails[0]?.id || 4; // Use roleId from validation or default to Developer
    const reportingPersonRoleId = roleDetails[0]?.reporting_person_role_id || null;
    
    // Auto-set teamLeadId based on role hierarchy if not provided
    if ((!teamLeadId || teamLeadId === '' || teamLeadId === 'none') && reportingPersonRoleId) {
      // Get the reporting role name
      const [reportingRole] = await db.query('SELECT name FROM roles WHERE id = ?', [reportingPersonRoleId]);
      if (reportingRole.length > 0) {
        const reportingRoleName = reportingRole[0].name;
        
        // Find a user with the reporting role
        const [reportingUsers] = await db.query(`
          SELECT u.id 
          FROM users u
          INNER JOIN roles r ON u.role_id = r.id
          WHERE r.name = ? AND u.status = 'Active'
          LIMIT 1
        `, [reportingRoleName]);
        
        if (reportingUsers.length > 0) {
          teamLeadId = reportingUsers[0].id.toString();
          logger.debug(`Auto-set teamLeadId to ${teamLeadId} based on role hierarchy (${dbRoleName} reports to ${reportingRoleName})`);
        }
      }
    }
    
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    // Set user status based on employee_status
    const userStatus = employee_status === 'Inactive' ? 'Inactive' : 'Active';
    
    try {
      [userResult] = await db.query(`
        INSERT INTO users (name, email, mobile, password_hash, role_id, position_id, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [processedName, email, processedMobile, passwordHash, finalRoleId, positionId, userStatus]);
    } catch (userError) {
      if (userError.code === 'ER_DUP_ENTRY') {
        // Check which field caused the duplicate
        if (userError.message.includes('email')) {
          return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
        } else if (userError.message.includes('mobile')) {
          return res.status(400).json({ error: `Mobile number "${mobile}" already exists. Please use a different mobile number.` });
        }
        return res.status(400).json({ error: 'A user with this information already exists.' });
      }
      throw userError;
    }
    
    // Get created_by from current user
    const createdBy = req.user?.id || null;
    
    // Helper function to format date to YYYY-MM-DD
    const formatDateForDB = (dateValue) => {
      if (!dateValue) return null;
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // If in ISO format, extract just the date part
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Invalid date, return null
      }
      return null;
    };

    // Convert teamLeadId (user_id) to employee_id
    let teamLeadEmployeeId = null;
    if (teamLeadId && teamLeadId !== '' && teamLeadId !== 'none') {
      logger.debug('Creating employee - Converting teamLeadId (user_id) to employee_id:', teamLeadId);
      
      // First, check if team lead has an employee record
      let [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [teamLeadId]);
      
      if (teamLeadEmployee.length > 0) {
        teamLeadEmployeeId = teamLeadEmployee[0].id;
        logger.debug('Found existing employee record for team lead, employee_id:', teamLeadEmployeeId);
      } else {
        // If team lead doesn't have an employee record, check their role
        logger.debug('Team Lead user_id not found in employees table, checking user role...');
        const [teamLeadUser] = await db.query(`
          SELECT u.id, u.name, r.name as role_name 
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          WHERE u.id = ?
        `, [teamLeadId]);
        
        if (teamLeadUser.length > 0) {
          const teamLeadRole = teamLeadUser[0].role_name;
          
          // Create employee record if they're being used as a team lead
          // This applies to manager roles (Level 1) and Super Admin
          // We create it because they're actually being assigned as a reporting manager
          // Reuse managerRoles already declared above, just get superAdminRole
          const superAdminRole = await getSuperAdminRole();
          const isManagerRole = managerRoles.includes(teamLeadRole);
          const isSuperAdminRole = superAdminRole && teamLeadRole === superAdminRole.name;
          
          if (isManagerRole || isSuperAdminRole) {
            // Generate employee code (format: NTPL0001, NTPL0002, etc.)
            const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
            const empCodeForTL = `NTPL${String(empCount[0].count + 1).padStart(4, '0')}`;
            
            const [newEmpResult] = await db.query(`
              INSERT INTO employees (user_id, emp_code, employee_status)
              VALUES (?, ?, 'Active')
            `, [teamLeadId, empCodeForTL]);
            
            teamLeadEmployeeId = newEmpResult.insertId;
            logger.debug(`Created employee record for ${teamLeadRole} with employee_id: ${teamLeadEmployeeId}, emp_code: ${empCodeForTL}`);
          } else {
            // For other roles, don't create employee record
            logger.debug(`User has role '${teamLeadRole}', not creating employee record. Setting team_lead_id to NULL.`);
            teamLeadEmployeeId = null;
          }
        } else {
          logger.warn('WARNING: Team Lead user_id not found in users table, setting team_lead_id to NULL');
        }
      }
    }

    // Then create employee record with all new fields
    // is_team_lead is automatically set based on whether this employee is used as a reporting manager
    // We don't need it as a form field - it's determined by the role and usage
    const [empResult] = await db.query(`
      INSERT INTO employees (
        user_id, emp_code, team_lead_id,
        date_of_birth, gender, date_of_joining, employee_status,
        bank_name, bank_account_number, ifsc_code,
        address1, address2, landmark, state, district, pincode,
        emergency_contact_name, emergency_contact_relation, emergency_contact_number,
        annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userResult.insertId, finalEmpCode, teamLeadEmployeeId,
      formatDateForDB(date_of_birth), gender || null, formatDateForDB(date_of_joining), employee_status || 'Active',
      processedBankName || null, processedBankAccount || null, processedIfsc || null,
      processedAddress1 || null, processedAddress2 || null, processedLandmark || null, processedState || null, processedDistrict || null, processedPincode || null,
      processedEmergencyName || null, processedEmergencyRelation || null, processedEmergencyNumber || null,
      annual_leave_count || 0, sick_leave_count || 0, casual_leave_count || 0, profile_photo_url || null, createdBy
    ]);
    
    const [newEmployee] = await db.query(`
      SELECT 
        e.*,
        u.name,
        u.email,
        u.mobile,
        u.status as user_status
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [empResult.insertId]);
    
    // Decrypt bank details before sending
    const employee = newEmployee[0];
    const decryptedBankDetails = decryptBankDetails({
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      ifsc_code: employee.ifsc_code
    });
    
    if (decryptedBankDetails) {
      // Only update fields that were successfully decrypted (not null)
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
    
    // Create audit log for employee creation
    await logCreate(req, 'Employees', empResult.insertId, {
      id: empResult.insertId,
      user_id: userResult.insertId,
      emp_code: empCode,
      name: processedName,
      email: email,
      role: dbRoleName,
      employee_status: employee_status || 'Active'
    }, 'Employee');
    
    res.status(201).json({ data: employee });
  } catch (error) {
    // If employee creation fails, try to clean up the user that was created
    // Note: userResult is declared in the outer scope, so it's accessible here
    if (userResult && userResult.insertId) {
      try {
        await db.query('DELETE FROM users WHERE id = ?', [userResult.insertId]);
        logger.debug(`Cleaned up user ${userResult.insertId} after employee creation failure`);
      } catch (cleanupError) {
        logger.error('Error cleaning up user after employee creation failure:', cleanupError);
      }
    }
    
    if (error.code === 'ER_DUP_ENTRY') {
      // Check which field caused the duplicate
      if (error.message.includes('emp_code')) {
        return res.status(400).json({ error: `Employee code "${empCode}" already exists. Please use a different employee code.` });
      } else if (error.message.includes('email')) {
        return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
      }
      return res.status(400).json({ error: 'A record with this information already exists.' });
    }
    logger.error('Error creating employee:', error);
    res.status(500).json({ error: error.message || 'Failed to create employee. Please try again.' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, mobile, password, empCode, teamLeadId, status, position,
      date_of_birth, gender, date_of_joining, employee_status,
      bank_name, bank_account_number, ifsc_code,
      address1, address2, landmark, state, district, pincode,
      emergency_contact_name, emergency_contact_relation, emergency_contact_number,
      annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url, pf_uan_number
    } = req.body;
    
    logger.debug('=== UPDATE EMPLOYEE REQUEST ===');
    logger.debug('Employee ID:', id);
    logger.debug('teamLeadId received:', teamLeadId, 'Type:', typeof teamLeadId);
    logger.debug('Request body keys:', Object.keys(req.body));
    logger.debug('date_of_birth:', date_of_birth, 'in req.body:', 'date_of_birth' in req.body);
    logger.debug('date_of_joining:', date_of_joining, 'in req.body:', 'date_of_joining' in req.body);
    logger.debug('emergency_contact_relation:', emergency_contact_relation, 'in req.body:', 'emergency_contact_relation' in req.body);
    
    // Get employee to find user_id and get before data for audit log
    const [employees] = await db.query(`
      SELECT 
        e.*,
        u.name,
        u.email,
        u.mobile,
        u.status as user_status,
        u.role_id,
        r.name as role
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE e.id = ?
    `, [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const userId = employees[0].user_id;
    const beforeData = employees[0]; // Store before data for audit log
    
    // Check if user can update (either admin/team lead or updating own profile)
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    const managerRoles = await getManagerRoles();
    const superAdminRole = await getSuperAdminRole();
    const allManagerRoles = [...managerRoles, 'Manager'];
    const canManage = allManagerRoles.includes(currentUserRole) || (superAdminRole && currentUserRole === superAdminRole.name);
    const isOwnProfile = currentUserId === userId;
    
    if (!canManage && !isOwnProfile) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    // Validation
    if (mobile !== undefined && mobile !== null && mobile !== '') {
      const mobileDigits = mobile.replace(/\D/g, ''); // Remove non-digits
      if (mobileDigits.length > 10) {
        return res.status(400).json({ error: 'Mobile number must be maximum 10 digits' });
      }
      if (mobileDigits.length > 0 && !/^\d{1,10}$/.test(mobileDigits)) {
        return res.status(400).json({ error: 'Mobile number must contain only numbers' });
      }
    }
    
    if (emergency_contact_number !== undefined && emergency_contact_number !== null && emergency_contact_number !== '') {
      const contactDigits = emergency_contact_number.replace(/\D/g, ''); // Remove non-digits
      if (contactDigits.length > 10) {
        return res.status(400).json({ error: 'Emergency contact number must be maximum 10 digits' });
      }
      if (contactDigits.length > 0 && !/^\d{1,10}$/.test(contactDigits)) {
        return res.status(400).json({ error: 'Emergency contact number must contain only numbers' });
      }
    }
    
    if (pincode !== undefined && pincode !== null && pincode !== '') {
      const pincodeDigits = pincode.replace(/\D/g, ''); // Remove non-digits
      if (pincodeDigits.length > 6) {
        return res.status(400).json({ error: 'Pincode must be maximum 6 digits' });
      }
      if (pincodeDigits.length > 0 && !/^\d{1,6}$/.test(pincodeDigits)) {
        return res.status(400).json({ error: 'Pincode must contain only numbers' });
      }
    }
    
    // Convert text fields to uppercase
    const toUpperCase = (value) => {
      if (value && typeof value === 'string') {
        return value.trim().toUpperCase();
      }
      return value;
    };
    
    // Update user if name/email/mobile/password/position provided
    if (name || email || mobile || password || position) {
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(toUpperCase(name)); }
      if (email) { updates.push('email = ?'); params.push(email); }
      if (mobile !== undefined) { 
        const mobileDigits = mobile.replace(/\D/g, ''); // Remove non-digits, keep only numbers
        updates.push('mobile = ?'); 
        params.push(mobileDigits || null); 
      }
      if (password) {
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.default.hash(password, 10);
        updates.push('password_hash = ?');
        params.push(passwordHash);
      }
      if (position) {
        // Get position_id from position name
        const [positions] = await db.query('SELECT id FROM positions WHERE name = ?', [position]);
        if (positions.length > 0) {
          const newPositionId = positions[0].id;
          
          // Validate role level if changing position (positions are display-only, validate based on role)
          // Get the current employee's role_id from the query result
          const creatorUserId = req.user?.id;
          if (creatorUserId && employees.length > 0) {
            const currentRoleId = employees[0].role_id || null;
            if (currentRoleId) {
              const validation = await validateUserCreation(creatorUserId, currentRoleId, newPositionId);
              if (!validation.valid) {
                return res.status(403).json({ error: validation.error });
              }
            }
          }
          
          updates.push('position_id = ?');
          params.push(newPositionId);
        } else {
          return res.status(400).json({ error: `Position "${position}" not found. Please select a valid position.` });
        }
      }
      if (updates.length > 0) {
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    }
    
    // Update user status if employee_status is provided (only admins can do this)
    if (employee_status && canManage) {
      const userStatus = employee_status === 'Inactive' ? 'Inactive' : 'Active';
      await db.query('UPDATE users SET status = ? WHERE id = ?', [userStatus, userId]);
    }
    
    // Helper function to format date to YYYY-MM-DD
    const formatDateForDB = (dateValue) => {
      if (!dateValue) return null;
      // If already in YYYY-MM-DD format, return as is
      if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
        return dateValue;
      }
      // If in ISO format, extract just the date part
      try {
        const date = new Date(dateValue);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      } catch (e) {
        // Invalid date, return null
      }
      return null;
    };

    // Update employee - only admins can update most fields, users can update limited fields
    const empUpdates = [];
    const empParams = [];
    
    if (canManage) {
      // Admins can update all fields
      if (empCode !== undefined) { empUpdates.push('emp_code = ?'); empParams.push(empCode); }
      if (status !== undefined) { empUpdates.push('status = ?'); empParams.push(status); }
      if ('date_of_birth' in req.body) {
        if (date_of_birth && date_of_birth !== '') {
          const formattedDate = formatDateForDB(date_of_birth);
          empUpdates.push('date_of_birth = ?');
          empParams.push(formattedDate);
          logger.debug('Processing date_of_birth:', date_of_birth, '-> formatted:', formattedDate);
        } else {
          // Explicitly set to null if empty
          empUpdates.push('date_of_birth = ?');
          empParams.push(null);
          logger.debug('Setting date_of_birth to NULL (empty value)');
        }
      }
      if (gender !== undefined) { empUpdates.push('gender = ?'); empParams.push(gender || null); }
      if ('date_of_joining' in req.body) {
        if (date_of_joining && date_of_joining !== '') {
          const formattedDate = formatDateForDB(date_of_joining);
          empUpdates.push('date_of_joining = ?');
          empParams.push(formattedDate);
          logger.debug('Processing date_of_joining:', date_of_joining, '-> formatted:', formattedDate);
        } else {
          // Explicitly set to null if empty
          empUpdates.push('date_of_joining = ?');
          empParams.push(null);
          logger.debug('Setting date_of_joining to NULL (empty value)');
        }
      }
      if (employee_status !== undefined) { empUpdates.push('employee_status = ?'); empParams.push(employee_status); }
      
      // Always handle teamLeadId if it's in the request body (including null to clear it)
      // Check if teamLeadId property exists in request body (even if value is null)
      if ('teamLeadId' in req.body) {
        logger.debug('Processing teamLeadId:', teamLeadId, 'Type:', typeof teamLeadId);
        
        // Auto-set teamLeadId based on role hierarchy if not provided
        let finalTeamLeadId = teamLeadId;
        if ((teamLeadId === null || teamLeadId === '' || teamLeadId === 'none' || teamLeadId === undefined)) {
          // Get the current role's reporting_person_role_id
          const currentRole = employees[0].role;
          const [roleData] = await db.query('SELECT reporting_person_role_id FROM roles WHERE name = ?', [currentRole]);
          const reportingPersonRoleId = roleData[0]?.reporting_person_role_id || null;
          
          if (reportingPersonRoleId) {
            // Get the reporting role name
            const [reportingRole] = await db.query('SELECT name FROM roles WHERE id = ?', [reportingPersonRoleId]);
            if (reportingRole.length > 0) {
              const reportingRoleName = reportingRole[0].name;
              
              // Find a user with the reporting role (excluding the current user)
              const [reportingUsers] = await db.query(`
                SELECT u.id 
                FROM users u
                INNER JOIN roles r ON u.role_id = r.id
                WHERE r.name = ? AND u.status = 'Active' AND u.id != ?
                LIMIT 1
              `, [reportingRoleName, userId]);
              
              if (reportingUsers.length > 0) {
                finalTeamLeadId = reportingUsers[0].id.toString();
                logger.debug(`Auto-set teamLeadId to ${finalTeamLeadId} based on role hierarchy (${currentRole} reports to ${reportingRoleName})`);
              }
            }
          }
        }
        
        if (finalTeamLeadId === null || finalTeamLeadId === '' || finalTeamLeadId === 'none' || finalTeamLeadId === undefined) {
          logger.debug('Setting team_lead_id to NULL (clearing team lead)');
          empUpdates.push('team_lead_id = ?');
          empParams.push(null);
        } else {
          // Use finalTeamLeadId instead of teamLeadId
          teamLeadId = finalTeamLeadId;
          // Convert user_id to employee_id
          logger.debug('Looking up employee for team lead user_id:', teamLeadId);
          let [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [teamLeadId]);
          let teamLeadEmployeeId = teamLeadEmployee.length > 0 ? teamLeadEmployee[0].id : null;
          
          // If Team Lead doesn't have an employee record, create one
          if (!teamLeadEmployeeId) {
            logger.debug('Team Lead user_id not found in employees table, checking user role...');
            // Get user info to verify they exist and check their role
            const [teamLeadUser] = await db.query(`
              SELECT u.id, u.name, r.name as role_name 
              FROM users u 
              LEFT JOIN roles r ON u.role_id = r.id 
              WHERE u.id = ?
            `, [teamLeadId]);
            
            if (teamLeadUser.length > 0) {
              const teamLeadRole = teamLeadUser[0].role_name;
              
              // Create employee record if they're being used as a team lead
              // This applies to manager roles (Level 1) and Super Admin
              // We create it because they're actually being assigned as a reporting manager
              // Reuse managerRoles and superAdminRole already declared above
              const isManagerRole = managerRoles.includes(teamLeadRole);
              const isSuperAdminRole = superAdminRole && teamLeadRole === superAdminRole.name;
              
              if (isManagerRole || isSuperAdminRole) {
                // Generate employee code (format: NTPL0001, NTPL0002, etc.)
                const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
                const empCode = `NTPL${String(empCount[0].count + 1).padStart(4, '0')}`;
                
                // Create employee record
                const [newEmpResult] = await db.query(`
                  INSERT INTO employees (user_id, emp_code, employee_status)
                  VALUES (?, ?, 'Active')
                `, [teamLeadId, empCode]);
                
                teamLeadEmployeeId = newEmpResult.insertId;
                logger.debug(`Created employee record for ${teamLeadRole} with employee_id: ${teamLeadEmployeeId}, emp_code: ${empCode}`);
              } else {
                // For other roles, don't create employee record
                logger.debug(`User has role '${teamLeadRole}', not creating employee record. Setting team_lead_id to NULL.`);
                teamLeadEmployeeId = null;
              }
            } else {
              logger.error('ERROR: Team Lead user_id not found in users table');
            }
          }
          
          logger.debug('Final team lead employee_id:', teamLeadEmployeeId);
          if (teamLeadEmployeeId) {
            empUpdates.push('team_lead_id = ?');
            empParams.push(teamLeadEmployeeId);
            logger.debug('Will update team_lead_id to:', teamLeadEmployeeId);
          } else {
            // If we still don't have an employee_id, set to null
            logger.warn('WARNING: Could not get/create employee record for Team Lead, setting to NULL');
            empUpdates.push('team_lead_id = ?');
            empParams.push(null);
          }
        }
      } else {
        logger.warn('WARNING: teamLeadId not found in request body - field may not be sent from frontend');
      }
      // Helper function to convert to uppercase
      const toUpperCase = (value) => {
        if (value && typeof value === 'string') {
          return value.trim().toUpperCase();
        }
        return value;
      };
      
      // Helper function to extract only digits
      const extractDigits = (value) => {
        if (value && typeof value === 'string') {
          return value.replace(/\D/g, '');
        }
        return value;
      };
      
      // Encrypt bank details before saving
      if (bank_name !== undefined) {
        const encrypted = encryptBankDetails({ bank_name: toUpperCase(bank_name) || null });
        empUpdates.push('bank_name = ?');
        empParams.push(encrypted?.bank_name || null);
      }
      if (bank_account_number !== undefined) {
        const encrypted = encryptBankDetails({ bank_account_number: toUpperCase(bank_account_number) || null });
        empUpdates.push('bank_account_number = ?');
        empParams.push(encrypted?.bank_account_number || null);
      }
      if (ifsc_code !== undefined) {
        const encrypted = encryptBankDetails({ ifsc_code: toUpperCase(ifsc_code) || null });
        empUpdates.push('ifsc_code = ?');
        empParams.push(encrypted?.ifsc_code || null);
      }
      if (pf_uan_number !== undefined) { empUpdates.push('pf_uan_number = ?'); empParams.push(toUpperCase(pf_uan_number) || null); }
      if (address1 !== undefined) { empUpdates.push('address1 = ?'); empParams.push(toUpperCase(address1) || null); }
      if (address2 !== undefined) { empUpdates.push('address2 = ?'); empParams.push(toUpperCase(address2) || null); }
      if (landmark !== undefined) { empUpdates.push('landmark = ?'); empParams.push(toUpperCase(landmark) || null); }
      if (state !== undefined) { empUpdates.push('state = ?'); empParams.push(toUpperCase(state) || null); }
      if (district !== undefined) { empUpdates.push('district = ?'); empParams.push(toUpperCase(district) || null); }
      if (pincode !== undefined) { 
        const pincodeDigits = extractDigits(pincode);
        empUpdates.push('pincode = ?'); 
        empParams.push(pincodeDigits || null); 
      }
      if (emergency_contact_name !== undefined) { empUpdates.push('emergency_contact_name = ?'); empParams.push(toUpperCase(emergency_contact_name) || null); }
      if (emergency_contact_relation !== undefined) { empUpdates.push('emergency_contact_relation = ?'); empParams.push(toUpperCase(emergency_contact_relation) || null); }
      if (emergency_contact_number !== undefined) { 
        const contactDigits = extractDigits(emergency_contact_number);
        empUpdates.push('emergency_contact_number = ?'); 
        empParams.push(contactDigits || null); 
      }
      if (annual_leave_count !== undefined) { empUpdates.push('annual_leave_count = ?'); empParams.push(annual_leave_count); }
      if (sick_leave_count !== undefined) { empUpdates.push('sick_leave_count = ?'); empParams.push(sick_leave_count); }
      if (casual_leave_count !== undefined) { empUpdates.push('casual_leave_count = ?'); empParams.push(casual_leave_count); }
      if (profile_photo_url !== undefined) { empUpdates.push('profile_photo_url = ?'); empParams.push(profile_photo_url || null); }
    } else if (isOwnProfile) {
      // Users can update limited fields on their own profile
      if (mobile !== undefined) { 
        // Already handled in user update above
      }
      // Allow users to update their own basic employee information
      // Always process these fields if they're in the request (including null values)
      if ('date_of_birth' in req.body) {
        if (date_of_birth && date_of_birth !== '') {
          const formattedDate = formatDateForDB(date_of_birth);
          empUpdates.push('date_of_birth = ?');
          empParams.push(formattedDate);
          logger.debug('Processing date_of_birth:', date_of_birth, '-> formatted:', formattedDate);
        } else {
          // Explicitly set to null if empty
          empUpdates.push('date_of_birth = ?');
          empParams.push(null);
          logger.debug('Setting date_of_birth to NULL (empty value)');
        }
      }
      if ('gender' in req.body) { 
        empUpdates.push('gender = ?'); 
        empParams.push(gender || null);
        logger.debug('Processing gender:', gender);
      }
      if ('date_of_joining' in req.body) {
        if (date_of_joining && date_of_joining !== '') {
          const formattedDate = formatDateForDB(date_of_joining);
          empUpdates.push('date_of_joining = ?');
          empParams.push(formattedDate);
          logger.debug('Processing date_of_joining:', date_of_joining, '-> formatted:', formattedDate);
        } else {
          // Explicitly set to null if empty
          empUpdates.push('date_of_joining = ?');
          empParams.push(null);
          logger.debug('Setting date_of_joining to NULL (empty value)');
        }
      }
      // Helper function to convert to uppercase
      const toUpperCase = (value) => {
        if (value && typeof value === 'string') {
          return value.trim().toUpperCase();
        }
        return value;
      };
      
      // Helper function to extract only digits
      const extractDigits = (value) => {
        if (value && typeof value === 'string') {
          return value.replace(/\D/g, '');
        }
        return value;
      };
      
      // Allow users to update their own finance information - encrypt before saving
      if ('bank_name' in req.body) {
        const encrypted = encryptBankDetails({ bank_name: toUpperCase(bank_name) || null });
        empUpdates.push('bank_name = ?');
        empParams.push(encrypted?.bank_name || null);
      }
      if ('bank_account_number' in req.body) {
        const encrypted = encryptBankDetails({ bank_account_number: toUpperCase(bank_account_number) || null });
        empUpdates.push('bank_account_number = ?');
        empParams.push(encrypted?.bank_account_number || null);
      }
      if ('ifsc_code' in req.body) {
        const encrypted = encryptBankDetails({ ifsc_code: toUpperCase(ifsc_code) || null });
        empUpdates.push('ifsc_code = ?');
        empParams.push(encrypted?.ifsc_code || null);
      }
      if ('pf_uan_number' in req.body) { empUpdates.push('pf_uan_number = ?'); empParams.push(toUpperCase(pf_uan_number) || null); }
      if ('address1' in req.body) { empUpdates.push('address1 = ?'); empParams.push(toUpperCase(address1) || null); }
      if ('address2' in req.body) { empUpdates.push('address2 = ?'); empParams.push(toUpperCase(address2) || null); }
      if ('landmark' in req.body) { empUpdates.push('landmark = ?'); empParams.push(toUpperCase(landmark) || null); }
      if ('state' in req.body) { empUpdates.push('state = ?'); empParams.push(toUpperCase(state) || null); }
      if ('district' in req.body) { empUpdates.push('district = ?'); empParams.push(toUpperCase(district) || null); }
      if ('pincode' in req.body) { 
        const pincodeDigits = extractDigits(pincode);
        empUpdates.push('pincode = ?'); 
        empParams.push(pincodeDigits || null); 
      }
      if ('emergency_contact_name' in req.body) { empUpdates.push('emergency_contact_name = ?'); empParams.push(toUpperCase(emergency_contact_name) || null); }
      logger.debug('Checking emergency_contact_relation - in req.body:', 'emergency_contact_relation' in req.body, 'value:', emergency_contact_relation, 'req.body keys:', Object.keys(req.body));
      if ('emergency_contact_relation' in req.body) {
        empUpdates.push('emergency_contact_relation = ?');
        empParams.push(toUpperCase(emergency_contact_relation) || null);
        logger.debug('Processing emergency_contact_relation:', emergency_contact_relation);
      } else {
        logger.error('ERROR: emergency_contact_relation NOT in req.body at isOwnProfile block!');
      }
      if ('emergency_contact_number' in req.body) { 
        const contactDigits = extractDigits(emergency_contact_number);
        empUpdates.push('emergency_contact_number = ?'); 
        empParams.push(contactDigits || null); 
      }
      if ('profile_photo_url' in req.body) { empUpdates.push('profile_photo_url = ?'); empParams.push(profile_photo_url || null); }
    }
    
    if (empUpdates.length > 0) {
      empParams.push(id);
      const updateQuery = `UPDATE employees SET ${empUpdates.join(', ')} WHERE id = ?`;
      logger.debug('Executing UPDATE query with fields:', empUpdates);
      logger.debug('Update params:', empParams);
      logger.debug('Full SQL query:', updateQuery);
      logger.debug('Date values in params:', {
        date_of_birth_index: empUpdates.findIndex(f => f.includes('date_of_birth')),
        date_of_joining_index: empUpdates.findIndex(f => f.includes('date_of_joining')),
        date_of_birth_value: empParams[empUpdates.findIndex(f => f.includes('date_of_birth'))],
        date_of_joining_value: empParams[empUpdates.findIndex(f => f.includes('date_of_joining'))]
      });
      
      const [result] = await db.query(updateQuery, empParams);
      logger.debug('Update result:', {
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
        warningCount: result.warningCount
      });
      logger.debug('Employee update successful');
    } else {
      logger.debug('No employee fields to update');
    }
    
    const [updatedEmployee] = await db.query(`
      SELECT 
        e.id,
        e.user_id,
        e.emp_code,
        e.team_lead_id,
        DATE_FORMAT(e.date_of_birth, '%Y-%m-%d') as date_of_birth,
        e.gender,
        DATE_FORMAT(e.date_of_joining, '%Y-%m-%d') as date_of_joining,
        e.employee_status,
        e.status,
        e.state,
        e.district,
        e.pincode,
        e.country,
        e.bank_name,
        e.bank_account_number,
        e.ifsc_code,
        e.address1,
        e.address2,
        e.landmark,
        e.pf_uan_number,
        e.emergency_contact_name,
        e.emergency_contact_relation,
        e.emergency_contact_number,
        e.annual_leave_count,
        e.sick_leave_count,
        e.casual_leave_count,
        e.profile_photo_url,
        e.created_by,
        e.created_at,
        e.updated_at,
        u.name,
        u.email,
        u.mobile,
        u.status as user_status,
        r.name as role,
        tl.name as team_lead_name,
        tl.id as team_lead_user_id
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl ON tl_emp.user_id = tl.id
      WHERE e.id = ?
    `, [id]);
    
    logger.debug('Updated employee data from DB:', {
      id: updatedEmployee[0]?.id,
      date_of_birth: updatedEmployee[0]?.date_of_birth,
      date_of_joining: updatedEmployee[0]?.date_of_joining,
      gender: updatedEmployee[0]?.gender
    });
    
    // Verify the dates were actually updated by checking the raw values
    const [verifyDates] = await db.query(`
      SELECT date_of_birth, date_of_joining 
      FROM employees 
      WHERE id = ?
    `, [id]);
    logger.debug('Raw date values from DB (for verification):', verifyDates[0]);
    
    // Decrypt bank details before sending
    const employee = updatedEmployee[0];
    const decryptedBankDetails = decryptBankDetails({
      bank_name: employee.bank_name,
      bank_account_number: employee.bank_account_number,
      ifsc_code: employee.ifsc_code
    });
    
    if (decryptedBankDetails) {
      // Only update fields that were successfully decrypted (not null)
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
    await logUpdate(req, 'Employees', id, beforeData, employee, 'Employee');
    
    res.json({ data: employee });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get employee and user info before deletion (for audit log)
    const [employees] = await db.query(`
      SELECT 
        e.*,
        u.id as user_id,
        u.name,
        u.email,
        u.mobile,
        r.name as role,
        p.name as position
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE e.id = ?
    `, [id]);
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeRole = employees[0].role;
    const currentUserRole = req.user?.role;
    const currentUserId = req.user?.id;
    const beforeData = employees[0]; // Store before data for audit log
    
    // Check if current user is a manager and can only delete Level 2 employees
    const managerRoles = await getManagerRoles();
    const isManager = managerRoles.includes(currentUserRole);
    
    if (isManager && currentUserId) {
      // Get Level 2 roles (employee roles)
      const level2Roles = await getRolesByLevel(2);
      
      // Managers can only delete Level 2 employees
      if (level2Roles.length > 0 && !level2Roles.includes(employeeRole)) {
        return res.status(403).json({ 
          error: `${currentUserRole} can only delete employees with roles: ${level2Roles.join(', ')}` 
        });
      }
    }
    
    // Delete user (cascade will delete employee)
    await db.query('DELETE FROM users WHERE id = ?', [employees[0].user_id]);
    
    // Create audit log for employee deletion
    await logDelete(req, 'Employees', id, beforeData, 'Employee');
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get employee documents
router.get('/:id/documents', async (req, res) => {
  try {
    const { id } = req.params;
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role || '';
    const managerRoles = await getManagerRoles();
    const isUserSuperAdmin = currentUserId ? await isSuperAdmin(currentUserId) : false;
    const allManagerRoles = [...managerRoles, 'Manager'];
    const canManage = allManagerRoles.includes(currentUserRole) || isUserSuperAdmin;
    
    // Check if employee exists and user has access
    const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeUserId = employees[0].user_id;
    const isOwnProfile = parseInt(currentUserId) === parseInt(employeeUserId);
    
    if (!canManage && !isOwnProfile) {
      return res.status(403).json({ error: 'You can only access your own documents' });
    }
    
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
        d.uploaded_at,
        d.verified,
        d.verified_by,
        d.verified_at,
        u.name as verified_by_name
      FROM employee_documents d
      LEFT JOIN users u ON d.verified_by = u.id
      WHERE d.employee_id = ?
      ORDER BY d.uploaded_at DESC
    `, [id]);
    
    // Decrypt document_number for each document
    const decryptedDocuments = documents.map(doc => {
      if (doc.document_number) {
        doc.document_number = decryptDocumentNumber(doc.document_number);
      }
      return doc;
    });
    
    res.json({ data: decryptedDocuments });
  } catch (error) {
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
    const allManagerRoles = [...managerRoles, 'Manager'];
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
      SELECT d.*, e.user_id as employee_user_id
      FROM employee_documents d
      INNER JOIN employees e ON d.employee_id = e.id
      WHERE d.id = ? AND d.employee_id = ?
    `, [docId, id]);
    
    if (documents.length === 0) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const document = documents[0];
    const isOwnProfile = parseInt(currentUserId) === parseInt(document.employee_user_id);
    
    if (!canManage && !isOwnProfile) {
      return res.status(403).json({ error: 'You can only delete your own documents' });
    }
    
    // Delete file from filesystem
    const filePath = path.join(__dirname, '..', document.file_path);
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

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, canAccessUserManagement } from '../middleware/auth.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

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

// Upload profile photo - accessible to all authenticated users (before canAccessUserManagement)
router.post('/upload-profile-photo', authenticate, uploadProfilePhoto.single('file'), async (req, res) => {
  try {
    console.log('=== PROFILE PHOTO UPLOAD ===');
    console.log('File received:', req.file ? 'Yes' : 'No');
    console.log('File details:', req.file);
    
    if (!req.file) {
      console.error('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = `/uploads/profile-photos/${req.file.filename}`;
    const fullUrl = `${req.protocol}://${req.get('host')}${filePath}`;
    
    console.log('File uploaded successfully:', filePath);
    
    res.status(200).json({
      message: 'Profile photo uploaded successfully',
      filePath: filePath,
      url: fullUrl,
      filename: req.file.filename
    });
  } catch (error) {
    console.error('Upload error:', error);
    // Clean up uploaded file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ error: error.message || 'Failed to upload image' });
  }
});

// Apply authentication to all routes
router.use(authenticate);

// Restrict access to Employees page - Admin, Super Admin, Team Lead, and Manager can access
router.use(canAccessUserManagement);

// Get all employees with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Get current user's role
    const currentUserRole = req.user?.role || '';
    const isSuperAdmin = currentUserRole === 'Super Admin';
    
    console.log('=== GET EMPLOYEES REQUEST ===');
    console.log('Current user ID:', req.user?.id);
    console.log('Current user role:', currentUserRole);
    console.log('Is Super Admin:', isSuperAdmin);
    
    let query = `
      SELECT 
        e.id,
        e.emp_code,
        e.status,
        e.hire_date,
        u.name,
        u.email,
        u.mobile,
        r.name as role,
        tl.name as team_lead_name
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl ON tl_emp.user_id = tl.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not Super Admin, exclude Super Admin users from results
    if (!isSuperAdmin) {
      query += ` AND r.name != 'Super Admin'`;
      console.log('Filtering out Super Admin employees for non-Super Admin user');
    } else {
      console.log('Super Admin user - showing all employees including Super Admins');
    }
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR e.emp_code LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY e.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [employees] = await db.query(query, params);
    
    console.log(`Found ${employees.length} employees`);
    console.log('Employee roles in results:', employees.map(e => `${e.name} (${e.role || 'N/A'})`).join(', '));
    
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
    if (!isSuperAdmin) {
      countQuery += ` AND r.name != 'Super Admin'`;
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
        e.*,
        u.name,
        u.email,
        u.mobile,
        u.status as user_status,
        r.name as role,
        tl.name as team_lead_name,
        tl.id as team_lead_user_id,
        e.emp_code,
        e.status,
        e.date_of_birth,
        e.gender,
        e.date_of_joining,
        e.is_team_lead,
        e.employee_status,
        e.bank_name,
        e.bank_account_number,
        e.ifsc_code,
        e.routing_number,
        e.address1,
        e.address2,
        e.landmark,
        e.state,
        e.district,
        e.pincode,
        e.emergency_contact_name,
        e.emergency_contact_relation,
        e.emergency_contact_number,
        e.annual_leave_count,
        e.sick_leave_count,
        e.casual_leave_count,
        e.profile_photo_url,
        e.created_by,
        e.created_date,
        e.last_updated_date
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
    
    res.json({ data: employees[0] });
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
      bank_name, bank_account_number, ifsc_code, routing_number,
      address1, address2, landmark, state, district, pincode,
      emergency_contact_name, emergency_contact_relation, emergency_contact_number,
      annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url
    } = req.body;
    
    const dbRoleName = role || 'Developer';
    
    // Team Leader and Manager can only create Developer, Designer, and Tester roles
    const currentUserRole = req.user?.role;
    if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        !['Developer', 'Designer', 'Tester'].includes(dbRoleName)) {
      return res.status(403).json({ 
        error: `${currentUserRole} can only create employees with Developer, Designer, or Tester roles` 
      });
    }
    
    // Check for duplicate email before creating user
    const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existingUsers.length > 0) {
      return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
    }
    
    // Check for duplicate employee code before creating employee
    if (empCode) {
      const [existingEmployees] = await db.query('SELECT id FROM employees WHERE emp_code = ?', [empCode]);
      if (existingEmployees.length > 0) {
        return res.status(400).json({ error: `Employee code "${empCode}" already exists. Please use a different employee code.` });
      }
    }
    
    // First create user
    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [dbRoleName]);
    const roleId = roles[0]?.id || 4; // Default to Developer
    
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    // Set user status based on employee_status
    const userStatus = employee_status === 'Inactive' ? 'Inactive' : 'Active';
    
    try {
      [userResult] = await db.query(`
        INSERT INTO users (name, email, mobile, password_hash, role_id, status)
        VALUES (?, ?, ?, ?, ?, ?)
      `, [name, email, mobile, passwordHash, roleId, userStatus]);
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
      console.log('Creating employee - Converting teamLeadId (user_id) to employee_id:', teamLeadId);
      
      // First, check if team lead has an employee record
      let [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [teamLeadId]);
      
      if (teamLeadEmployee.length > 0) {
        teamLeadEmployeeId = teamLeadEmployee[0].id;
        console.log('Found existing employee record for team lead, employee_id:', teamLeadEmployeeId);
      } else {
        // If team lead doesn't have an employee record, check their role
        console.log('Team Lead user_id not found in employees table, checking user role...');
        const [teamLeadUser] = await db.query(`
          SELECT u.id, u.name, r.name as role_name 
          FROM users u 
          LEFT JOIN roles r ON u.role_id = r.id 
          WHERE u.id = ?
        `, [teamLeadId]);
        
        if (teamLeadUser.length > 0) {
          const teamLeadRole = teamLeadUser[0].role_name;
          
          // Create employee record if they're being used as a team lead
          // This applies to Team Lead, Super Admin, and Admin roles
          // We create it because they're actually being assigned as a reporting manager
          if (teamLeadRole === 'Team Leader' || teamLeadRole === 'Team Lead' || teamLeadRole === 'Super Admin' || teamLeadRole === 'Admin') {
            // Generate employee code based on role
            const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
            let empCodePrefix = 'EMP-TL';
            if (teamLeadRole === 'Super Admin') {
              empCodePrefix = 'EMP-SA';
            } else if (teamLeadRole === 'Admin') {
              empCodePrefix = 'EMP-AD';
            }
            const empCodeForTL = `${empCodePrefix}-${String(empCount[0].count + 1).padStart(4, '0')}`;
            
            // Set is_team_lead automatically based on role
            // Super Admin, Admin, and Team Lead are automatically set as team leads when used as reporting managers
            const isTeamLead = teamLeadRole === 'Team Leader' || teamLeadRole === 'Team Lead' || teamLeadRole === 'Super Admin' || teamLeadRole === 'Admin';
            
            const [newEmpResult] = await db.query(`
              INSERT INTO employees (user_id, emp_code, is_team_lead, employee_status)
              VALUES (?, ?, ?, 'Active')
            `, [teamLeadId, empCodeForTL, isTeamLead]);
            
            teamLeadEmployeeId = newEmpResult.insertId;
            console.log(`Created employee record for ${teamLeadRole} with employee_id: ${teamLeadEmployeeId}, emp_code: ${empCodeForTL}`);
          } else {
            // For other roles, don't create employee record
            console.log(`User has role '${teamLeadRole}', not creating employee record. Setting team_lead_id to NULL.`);
            teamLeadEmployeeId = null;
          }
        } else {
          console.log('WARNING: Team Lead user_id not found in users table, setting team_lead_id to NULL');
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
        bank_name, bank_account_number, ifsc_code, routing_number,
        address1, address2, landmark, state, district, pincode,
        emergency_contact_name, emergency_contact_relation, emergency_contact_number,
        annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url, created_by
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      userResult.insertId, empCode, teamLeadEmployeeId,
      formatDateForDB(date_of_birth), gender || null, formatDateForDB(date_of_joining), employee_status || 'Active',
      bank_name || null, bank_account_number || null, ifsc_code || null, routing_number || null,
      address1 || null, address2 || null, landmark || null, state || null, district || null, pincode || null,
      emergency_contact_name || null, emergency_contact_relation || null, emergency_contact_number || null,
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
    
    res.status(201).json({ data: newEmployee[0] });
  } catch (error) {
    // If employee creation fails, try to clean up the user that was created
    // Note: userResult is declared in the outer scope, so it's accessible here
    if (userResult && userResult.insertId) {
      try {
        await db.query('DELETE FROM users WHERE id = ?', [userResult.insertId]);
        console.log(`Cleaned up user ${userResult.insertId} after employee creation failure`);
      } catch (cleanupError) {
        console.error('Error cleaning up user after employee creation failure:', cleanupError);
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
    console.error('Error creating employee:', error);
    res.status(500).json({ error: error.message || 'Failed to create employee. Please try again.' });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      name, email, mobile, password, empCode, teamLeadId, status,
      date_of_birth, gender, date_of_joining, employee_status,
      bank_name, bank_account_number, ifsc_code, routing_number,
      address1, address2, landmark, state, district, pincode,
      emergency_contact_name, emergency_contact_relation, emergency_contact_number,
      annual_leave_count, sick_leave_count, casual_leave_count, profile_photo_url
    } = req.body;
    
    console.log('=== UPDATE EMPLOYEE REQUEST ===');
    console.log('Employee ID:', id);
    console.log('teamLeadId received:', teamLeadId, 'Type:', typeof teamLeadId);
    console.log('Request body keys:', Object.keys(req.body));
    
    // Get employee to find user_id
    const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const userId = employees[0].user_id;
    
    // Check if user can update (either admin/team lead or updating own profile)
    const currentUserId = req.user?.id;
    const currentUserRole = req.user?.role;
    const canManage = ['Admin', 'Super Admin', 'Team Leader', 'Team Lead', 'Manager'].includes(currentUserRole);
    const isOwnProfile = currentUserId === userId;
    
    if (!canManage && !isOwnProfile) {
      return res.status(403).json({ error: 'You can only update your own profile' });
    }
    
    // Update user if name/email/mobile/password provided
    if (name || email || mobile || password) {
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (email) { updates.push('email = ?'); params.push(email); }
      if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
      if (password) {
        const bcrypt = await import('bcryptjs');
        const passwordHash = await bcrypt.default.hash(password, 10);
        updates.push('password_hash = ?');
        params.push(passwordHash);
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
      if (date_of_birth !== undefined) { empUpdates.push('date_of_birth = ?'); empParams.push(formatDateForDB(date_of_birth)); }
      if (gender !== undefined) { empUpdates.push('gender = ?'); empParams.push(gender || null); }
      if (date_of_joining !== undefined) { empUpdates.push('date_of_joining = ?'); empParams.push(formatDateForDB(date_of_joining)); }
      if (employee_status !== undefined) { empUpdates.push('employee_status = ?'); empParams.push(employee_status); }
      
      // Always handle teamLeadId if it's in the request body (including null to clear it)
      // Check if teamLeadId property exists in request body (even if value is null)
      if ('teamLeadId' in req.body) {
        console.log('Processing teamLeadId:', teamLeadId, 'Type:', typeof teamLeadId);
        if (teamLeadId === null || teamLeadId === '' || teamLeadId === 'none' || teamLeadId === undefined) {
          console.log('Setting team_lead_id to NULL (clearing team lead)');
          empUpdates.push('team_lead_id = ?');
          empParams.push(null);
        } else {
          // Convert user_id to employee_id
          console.log('Looking up employee for team lead user_id:', teamLeadId);
          let [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [teamLeadId]);
          let teamLeadEmployeeId = teamLeadEmployee.length > 0 ? teamLeadEmployee[0].id : null;
          
          // If Team Lead doesn't have an employee record, create one
          if (!teamLeadEmployeeId) {
            console.log('Team Lead user_id not found in employees table, checking user role...');
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
              // This applies to Team Lead, Super Admin, and Admin roles
              // We create it because they're actually being assigned as a reporting manager
              if (teamLeadRole === 'Team Leader' || teamLeadRole === 'Team Lead' || teamLeadRole === 'Super Admin' || teamLeadRole === 'Admin') {
                // Generate employee code based on role
                const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
                let empCodePrefix = 'EMP-TL';
                if (teamLeadRole === 'Super Admin') {
                  empCodePrefix = 'EMP-SA';
                } else if (teamLeadRole === 'Admin') {
                  empCodePrefix = 'EMP-AD';
                }
                const empCode = `${empCodePrefix}-${String(empCount[0].count + 1).padStart(4, '0')}`;
                
                // Set is_team_lead automatically based on role
                // Super Admin, Admin, and Team Lead are automatically set as team leads when used as reporting managers
                const isTeamLead = teamLeadRole === 'Team Leader' || teamLeadRole === 'Team Lead' || teamLeadRole === 'Super Admin' || teamLeadRole === 'Admin';
                
                // Create employee record
                const [newEmpResult] = await db.query(`
                  INSERT INTO employees (user_id, emp_code, is_team_lead, employee_status)
                  VALUES (?, ?, ?, 'Active')
                `, [teamLeadId, empCode, isTeamLead]);
                
                teamLeadEmployeeId = newEmpResult.insertId;
                console.log(`Created employee record for ${teamLeadRole} with employee_id: ${teamLeadEmployeeId}, emp_code: ${empCode}`);
              } else {
                // For other roles, don't create employee record
                console.log(`User has role '${teamLeadRole}', not creating employee record. Setting team_lead_id to NULL.`);
                teamLeadEmployeeId = null;
              }
            } else {
              console.log('ERROR: Team Lead user_id not found in users table');
            }
          }
          
          console.log('Final team lead employee_id:', teamLeadEmployeeId);
          if (teamLeadEmployeeId) {
            empUpdates.push('team_lead_id = ?');
            empParams.push(teamLeadEmployeeId);
            console.log('Will update team_lead_id to:', teamLeadEmployeeId);
          } else {
            // If we still don't have an employee_id, set to null
            console.log('WARNING: Could not get/create employee record for Team Lead, setting to NULL');
            empUpdates.push('team_lead_id = ?');
            empParams.push(null);
          }
        }
      } else {
        console.log('WARNING: teamLeadId not found in request body - field may not be sent from frontend');
      }
      if (bank_name !== undefined) { empUpdates.push('bank_name = ?'); empParams.push(bank_name || null); }
      if (bank_account_number !== undefined) { empUpdates.push('bank_account_number = ?'); empParams.push(bank_account_number || null); }
      if (ifsc_code !== undefined) { empUpdates.push('ifsc_code = ?'); empParams.push(ifsc_code || null); }
      if (routing_number !== undefined) { empUpdates.push('routing_number = ?'); empParams.push(routing_number || null); }
      if (address1 !== undefined) { empUpdates.push('address1 = ?'); empParams.push(address1 || null); }
      if (address2 !== undefined) { empUpdates.push('address2 = ?'); empParams.push(address2 || null); }
      if (landmark !== undefined) { empUpdates.push('landmark = ?'); empParams.push(landmark || null); }
      if (state !== undefined) { empUpdates.push('state = ?'); empParams.push(state || null); }
      if (district !== undefined) { empUpdates.push('district = ?'); empParams.push(district || null); }
      if (pincode !== undefined) { empUpdates.push('pincode = ?'); empParams.push(pincode || null); }
      if (emergency_contact_name !== undefined) { empUpdates.push('emergency_contact_name = ?'); empParams.push(emergency_contact_name || null); }
      if (emergency_contact_number !== undefined) { empUpdates.push('emergency_contact_number = ?'); empParams.push(emergency_contact_number || null); }
      if (annual_leave_count !== undefined) { empUpdates.push('annual_leave_count = ?'); empParams.push(annual_leave_count); }
      if (sick_leave_count !== undefined) { empUpdates.push('sick_leave_count = ?'); empParams.push(sick_leave_count); }
      if (casual_leave_count !== undefined) { empUpdates.push('casual_leave_count = ?'); empParams.push(casual_leave_count); }
      if (profile_photo_url !== undefined) { empUpdates.push('profile_photo_url = ?'); empParams.push(profile_photo_url || null); }
    } else if (isOwnProfile) {
      // Users can update limited fields on their own profile
      if (mobile !== undefined) { 
        // Already handled in user update above
      }
      if (address1 !== undefined) { empUpdates.push('address1 = ?'); empParams.push(address1 || null); }
      if (address2 !== undefined) { empUpdates.push('address2 = ?'); empParams.push(address2 || null); }
      if (landmark !== undefined) { empUpdates.push('landmark = ?'); empParams.push(landmark || null); }
      if (state !== undefined) { empUpdates.push('state = ?'); empParams.push(state || null); }
      if (district !== undefined) { empUpdates.push('district = ?'); empParams.push(district || null); }
      if (pincode !== undefined) { empUpdates.push('pincode = ?'); empParams.push(pincode || null); }
      if (emergency_contact_name !== undefined) { empUpdates.push('emergency_contact_name = ?'); empParams.push(emergency_contact_name || null); }
      if (emergency_contact_relation !== undefined) { empUpdates.push('emergency_contact_relation = ?'); empParams.push(emergency_contact_relation || null); }
      if (emergency_contact_number !== undefined) { empUpdates.push('emergency_contact_number = ?'); empParams.push(emergency_contact_number || null); }
      if (profile_photo_url !== undefined) { empUpdates.push('profile_photo_url = ?'); empParams.push(profile_photo_url || null); }
    }
    
    if (empUpdates.length > 0) {
      empParams.push(id);
      console.log('Executing UPDATE query with fields:', empUpdates);
      console.log('Update params:', empParams);
      await db.query(`UPDATE employees SET ${empUpdates.join(', ')} WHERE id = ?`, empParams);
      console.log('Employee update successful');
    } else {
      console.log('No employee fields to update');
    }
    
    const [updatedEmployee] = await db.query(`
      SELECT 
        e.*,
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
    
    res.json({ data: updatedEmployee[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete employee
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get employee and user info before deletion
    const [employees] = await db.query(`
      SELECT e.user_id, u.id as user_id, r.name as role
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE e.id = ?
    `, [id]);
    
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    const employeeRole = employees[0].role;
    const currentUserRole = req.user?.role;
    
    // Team Leader and Manager can only delete Developer, Designer, and Tester employees
    if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        !['Developer', 'Designer', 'Tester'].includes(employeeRole)) {
      return res.status(403).json({ 
        error: `${currentUserRole} can only delete employees with Developer, Designer, or Tester roles` 
      });
    }
    
    // Delete user (cascade will delete employee)
    await db.query('DELETE FROM users WHERE id = ?', [employees[0].user_id]);
    
    res.json({ message: 'Employee deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, canManageUsers, requireSuperAdmin, canAccessUserManagement } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyUserUpdated } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';
import { validateUserCreation, getAvailablePositions } from '../utils/positionValidation.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get assignable users (for bug/task assignment) - all authenticated users can access
router.get('/assignable', async (req, res) => {
  try {
    const query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('Developer', 'Designer', 'Tester', 'Team Leader', 'Team Lead')
      ORDER BY 
        CASE r.name
          WHEN 'Team Leader' THEN 1
          WHEN 'Team Lead' THEN 1
          WHEN 'Developer' THEN 2
          WHEN 'Designer' THEN 3
          WHEN 'Tester' THEN 4
          ELSE 99
        END,
        u.name ASC
    `;
    
    const [users] = await db.query(query);
    res.json({ data: users });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Restrict access to Users page - only Admin, Super Admin, and Team Lead can view
router.use(canAccessUserManagement);

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

// Get all users with pagination
router.get('/', async (req, res) => {
  try {
    // Parse and validate query parameters
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 10, 100); // Max 100 per page
    const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
    const offset = (page - 1) * limit;
    
    // Get current user's role
    const currentUserRole = req.user?.role || '';
    const isSuperAdmin = currentUserRole === 'Super Admin';
    
    logger.debug('=== GET USERS REQUEST ===');
    logger.debug('Current user ID:', req.user?.id);
    logger.debug('Current user role:', currentUserRole);
    logger.debug('Is Super Admin:', isSuperAdmin);
    
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.status,
        u.last_login,
        u.created_at,
        u.mfa_enabled,
        e.profile_photo_url,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees e ON u.id = e.user_id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not Super Admin, exclude Super Admin users from results
    if (!isSuperAdmin) {
      query += ` AND r.name != 'Super Admin'`;
      logger.debug('Filtering out Super Admin users for non-Super Admin user');
    } else {
      logger.debug('Super Admin user - showing all users including other Super Admins');
    }
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(limit, offset);
    
    const [users] = await db.query(query, params);
    
    logger.debug(`Found ${users.length} users`);
    logger.debug('User roles in results:', users.map(u => `${u.name} (${u.role})`).join(', '));
    
    // Get total count
    let countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE 1=1
    `;
    const countParams = [];
    
    // If not Super Admin, exclude Super Admin users from count
    if (!isSuperAdmin) {
      countQuery += ` AND r.name != 'Super Admin'`;
    }
    
    if (search) {
      countQuery += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      countParams.push(`%${search}%`, `%${search}%`);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    logger.error('Error fetching users:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [users] = await db.query(`
      SELECT 
        u.*,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: users[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user - requires Admin, Super Admin, Team Lead, or Manager
// Team Lead and Manager can only create Developer, Designer, and Tester roles
router.post('/', canManageUsers, async (req, res) => {
  try {
    logger.debug('=== CREATE USER REQUEST ===');
    logger.debug('Full request body:', JSON.stringify(req.body, null, 2));
    
    const { name, email, password, role, position, mobile, status = 'Active', team_lead_id } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password, and role are required' });
    }
    
    // Normalize role value (trim and lowercase)
    const normalizedRole = String(role).trim().toLowerCase();
    
    // Map frontend role values to database role names
    const roleMapping = {
      'admin': 'Admin',
      'team-lead': 'Team Leader',
      'team-leader': 'Team Leader',
      'team lead': 'Team Leader', // Handle space variant
      'Team Lead': 'Team Leader', // Map to database role name
      'developer': 'Developer',
      'designer': 'Designer',
      'tester': 'Tester',
      'viewer': 'Viewer',
      'super-admin': 'Super Admin',
      'super admin': 'Super Admin' // Handle space variant
    };
    
    const dbRoleName = roleMapping[normalizedRole] || role;
    
    // Check if trying to create Super Admin - only Super Admins can do this
    if (dbRoleName === 'Super Admin' && req.user.role !== 'Super Admin') {
      return res.status(403).json({ 
        error: 'Only Super Admins can create other Super Admin users' 
      });
    }
    
    // Team Leader, Team Lead, and Manager can only create Developer, Designer, and Tester roles
    const currentUserRole = req.user.role;
    if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        !['Developer', 'Designer', 'Tester'].includes(dbRoleName)) {
      return res.status(403).json({ 
        error: `${currentUserRole} can only create employees with Developer, Designer, or Tester roles` 
      });
    }
    
    // Team Leader and Manager cannot create Admin roles
    if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        dbRoleName === 'Admin') {
      return res.status(403).json({ 
        error: `${currentUserRole} cannot create Admin users. Only Super Admin can create Admin users.` 
      });
    }
    
    // Debug: Log the role mapping
    logger.debug('Received role:', role, 'Type:', typeof role);
    logger.debug('Normalized role:', normalizedRole);
    logger.debug('Role mapping lookup:', normalizedRole, '->', roleMapping[normalizedRole]);
    logger.debug('Mapped to:', dbRoleName);
    
    // Get role_id - try case-insensitive search if exact match fails
    let [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [dbRoleName]);
    
    // If not found, try case-insensitive search
    if (roles.length === 0) {
      [roles] = await db.query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)', [dbRoleName]);
    }
    
    // If still not found, get all available roles for error message
    if (roles.length === 0) {
      const [allRoles] = await db.query('SELECT name FROM roles');
      const availableRoles = allRoles.map(r => r.name).join(', ');
      return res.status(400).json({ 
        error: `Invalid role: "${role}" (mapped to: "${dbRoleName}"). Available roles: ${availableRoles}` 
      });
    }
    const roleId = roles[0].id;
    
    // Get reporting person role from the role's reporting_person_role_id
    // This determines who the user reports to based on their role
    const [roleInfo] = await db.query('SELECT reporting_person_role_id FROM roles WHERE id = ?', [roleId]);
    const reportingPersonRoleId = roleInfo[0]?.reporting_person_role_id || null;
    
    // Validate role level - check if creator can create user with this role
    // This validation is based on level (Level 1 can create Level 2, etc.)
    const creatorUserId = req.user?.id;
    if (creatorUserId && roleId) {
      // Get position_id if provided
      let positionId = null;
      if (position) {
        // Map frontend position values to database position names
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
      
      // Always validate role level (even if position is not provided)
      // Level 1 users (Team Leader, Manager) can create Level 2 users (Developer, Designer, Tester)
      const validation = await validateUserCreation(creatorUserId, roleId, positionId);
      if (!validation.valid) {
        return res.status(403).json({ error: validation.error });
      }
    }
    
    // Hash password (in production, use bcrypt)
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    // Validate team_lead_id for Developer, Designer, and Tester roles
    if ((dbRoleName === 'Developer' || dbRoleName === 'Designer' || dbRoleName === 'Tester') && team_lead_id) {
      // Verify that the team_lead_id exists and is a Team Lead
      const [teamLeadCheck] = await db.query(`
        SELECT u.id, r.name as role 
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = ? AND (r.name = 'Team Leader' OR r.name = 'Team Lead')
      `, [team_lead_id]);
      
      if (teamLeadCheck.length === 0) {
        return res.status(400).json({ 
          error: `Invalid Team Leader ID: ${team_lead_id}. Must be a user with Team Leader role.` 
        });
      }
    }
    
    const [result] = await db.query(`
      INSERT INTO users (name, email, mobile, password_hash, role_id, position_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, email, mobile || null, passwordHash, roleId, positionId, status]);
    
    const newUserId = result.insertId;
    
    // If Team Leader role, create employee record for them (Team Leaders need employee records too)
    if (dbRoleName === 'Team Leader' || dbRoleName === 'Team Lead') {
      // Check if employee record already exists
      const [existingEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [newUserId]);
      
      if (existingEmployee.length === 0) {
        // Generate employee code for Team Lead (format: NTPL0001, NTPL0002, etc.)
        const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
        const empCode = `NTPL${String(empCount[0].count + 1).padStart(4, '0')}`;
        
        // Create employee record for Team Lead (no team_lead_id since they are the lead)
        await db.query(`
          INSERT INTO employees (user_id, emp_code, employee_status)
          VALUES (?, ?, 'Active')
        `, [newUserId, empCode]);
        logger.debug(`Created employee record for Team Lead user_id: ${newUserId}, emp_code: ${empCode}`);
      }
    }
    // If Developer, Designer, or Tester role and team_lead_id provided, create/update employee record
    else if ((dbRoleName === 'Developer' || dbRoleName === 'Designer' || dbRoleName === 'Tester') && team_lead_id) {
      // Check if employee record already exists
      const [existingEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [newUserId]);
      
      // First, get the team lead's employee ID (convert user_id to employee_id)
      // If Team Lead doesn't have employee record, create one
      let [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [team_lead_id]);
      let teamLeadEmployeeId = teamLeadEmployee.length > 0 ? teamLeadEmployee[0].id : null;
      
      // If Team Lead doesn't have employee record, create one
      if (!teamLeadEmployeeId) {
        logger.debug(`Team Lead user_id ${team_lead_id} doesn't have employee record, creating one...`);
        const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
        const empCode = `NTPL${String(empCount[0].count + 1).padStart(4, '0')}`;
        
        const [newTeamLeadEmp] = await db.query(`
          INSERT INTO employees (user_id, emp_code, employee_status)
          VALUES (?, ?, 'Active')
        `, [team_lead_id, empCode]);
        
        teamLeadEmployeeId = newTeamLeadEmp.insertId;
        logger.debug(`Created employee record for Team Lead with employee_id: ${teamLeadEmployeeId}`);
      }
      
      if (existingEmployee.length > 0) {
        // Update existing employee record
        await db.query('UPDATE employees SET team_lead_id = ? WHERE user_id = ?', [teamLeadEmployeeId, newUserId]);
      } else {
        // Create new employee record
        // Generate employee code (format: NTPL0001, NTPL0002, etc.)
        const [empCount] = await db.query('SELECT COUNT(*) as count FROM employees');
        const empCode = `NTPL${String(empCount[0].count + 1).padStart(4, '0')}`;
        
        await db.query(`
          INSERT INTO employees (user_id, emp_code, team_lead_id)
          VALUES (?, ?, ?)
        `, [newUserId, empCode, teamLeadEmployeeId]);
      }
    }
    
    const [newUser] = await db.query(`
      SELECT 
        u.*,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [result.insertId]);
    
    // Create audit log for user creation
    await logCreate(req, 'Users', result.insertId, {
      id: result.insertId,
      name: name,
      email: email,
      role: dbRoleName,
      status: status || 'Active'
    }, 'User');
    
    res.status(201).json({ data: newUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // Check which field caused the duplicate
      if (error.message.includes('email') || error.message.includes('idx_user_email')) {
        return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
      } else if (error.message.includes('mobile') || error.message.includes('idx_user_mobile')) {
        return res.status(400).json({ error: `Mobile number "${mobile}" already exists. Please use a different mobile number.` });
      }
      return res.status(400).json({ error: 'A user with this information already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user - requires Admin, Super Admin, Team Lead, or Manager
// Team Lead and Manager can only update Developer, Designer, and Tester roles
router.put('/:id', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, position, mobile, status } = req.body;
    
    // Get before data for audit log
    const [existingUsers] = await db.query(`
      SELECT 
        u.*,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [id]);
    
    if (existingUsers.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const beforeData = existingUsers[0];
    
    // Get role_id if role is provided
    let roleId = null;
    if (role) {
      // Normalize role value (trim and lowercase)
      const normalizedRole = String(role).trim().toLowerCase();
      
    // Map frontend role values to database role names
    const roleMapping = {
      'admin': 'Admin',
      'team-lead': 'Team Leader',
      'team-leader': 'Team Leader',
      'team lead': 'Team Leader', // Handle space variant
      'developer': 'Developer',
      'designer': 'Designer',
      'tester': 'Tester',
      'viewer': 'Viewer',
      'super-admin': 'Super Admin',
      'super admin': 'Super Admin' // Handle space variant
    };
      
      const dbRoleName = roleMapping[normalizedRole] || role;
      
      // Check if trying to update to Super Admin - only Super Admins can do this
      if (dbRoleName === 'Super Admin' && req.user.role !== 'Super Admin') {
        return res.status(403).json({ 
          error: 'Only Super Admins can assign Super Admin role to other users' 
        });
      }
      
      // Team Leader and Manager can only update users to Developer, Designer, and Tester roles
      const currentUserRole = req.user.role;
      if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
          !['Developer', 'Designer', 'Tester'].includes(dbRoleName)) {
        return res.status(403).json({ 
          error: `${currentUserRole} can only assign Developer, Designer, or Tester roles` 
        });
      }
      
      // Team Leader and Manager cannot update users to Admin role
      if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
          dbRoleName === 'Admin') {
        return res.status(403).json({ 
          error: `${currentUserRole} cannot assign Admin role. Only Super Admin can assign Admin role.` 
        });
      }
      
      // Try exact match first, then case-insensitive
      let [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [dbRoleName]);
      if (roles.length === 0) {
        [roles] = await db.query('SELECT id FROM roles WHERE LOWER(name) = LOWER(?)', [dbRoleName]);
      }
      
      if (roles.length === 0) {
        const [allRoles] = await db.query('SELECT name FROM roles');
        const availableRoles = allRoles.map(r => r.name).join(', ');
        return res.status(400).json({ error: `Invalid role: "${role}". Available roles: ${availableRoles}` });
      }
      roleId = roles[0].id;
    }
    
    // Get position_id if position is provided
    let positionId = null;
    if (position) {
      // Map frontend position values to database position names
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
        // If position doesn't exist, create it with proper hierarchy
        // Default to Level 2 and auto-assign parent
        let parentId = null;
        
        // Try to find Team Lead first, then any Level 1 position
        const [teamLead] = await db.query(
          'SELECT id FROM positions WHERE level = 1 AND name IN ("Team Lead", "Team Leader") LIMIT 1'
        );
        if (teamLead.length > 0) {
          parentId = teamLead[0].id;
        } else {
          // Fallback to any Level 1 position
          const [level1Position] = await db.query('SELECT id FROM positions WHERE level = 1 LIMIT 1');
          if (level1Position.length > 0) {
            parentId = level1Position[0].id;
          }
        }
        
        // Create position with level 2 and parent_id
        const [newPosition] = await db.query(
          'INSERT INTO positions (name, level, parent_id) VALUES (?, 2, ?)',
          [dbPositionName, parentId]
        );
        positionId = newPosition.insertId;
      }
    }
    
    const updates = [];
    const params = [];
    
    if (name) { updates.push('name = ?'); params.push(name); }
    if (email) { updates.push('email = ?'); params.push(email); }
    if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
    if (roleId) { updates.push('role_id = ?'); params.push(roleId); }
    if (positionId !== null) { updates.push('position_id = ?'); params.push(positionId); }
    if (status) { updates.push('status = ?'); params.push(status); }
    if (password) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);
    
    const [updatedUser] = await db.query(`
      SELECT 
        u.*,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE u.id = ?
    `, [id]);
    
    // Create audit log for user update
    await logUpdate(req, 'Users', id, beforeData, updatedUser[0], 'User');
    
    // Send notification to user if updated by Super Admin or Team Lead
    // Only notify if the user being updated is not the same as the updater
    if (req.user.id !== parseInt(id) && (req.user.role === 'Super Admin' || req.user.role === 'Team Leader' || req.user.role === 'Team Lead')) {
      // Track what changed
      const changes = {};
      if (name && name !== beforeData.name) changes.name = { from: beforeData.name, to: name };
      if (email && email !== beforeData.email) changes.email = { from: beforeData.email, to: email };
      if (mobile !== undefined && mobile !== beforeData.mobile) changes.mobile = { from: beforeData.mobile, to: mobile };
      if (status && status !== beforeData.status) changes.status = { from: beforeData.status, to: status };
      
      // Notify user about the update
      await notifyUserUpdated(parseInt(id), req.user.id, changes);
    }
    
    res.json({ data: updatedUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // Check which field caused the duplicate
      if (error.message.includes('email') || error.message.includes('idx_user_email')) {
        return res.status(400).json({ error: `Email "${email}" already exists. Please use a different email address.` });
      } else if (error.message.includes('mobile') || error.message.includes('idx_user_mobile')) {
        return res.status(400).json({ error: `Mobile number "${mobile}" already exists. Please use a different mobile number.` });
      }
      return res.status(400).json({ error: 'A user with this information already exists.' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete user - requires Admin, Super Admin, Team Lead, or Manager
router.delete('/:id', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if the user being deleted is a Super Admin
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [id]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const userToDelete = users[0];
    const beforeData = userToDelete; // Store before data for audit log
    
    // Prevent deletion of Super Admin users
    if (userToDelete.role === 'Super Admin') {
      return res.status(403).json({ 
        error: 'Cannot delete Super Admin users. Super Admin accounts are protected.' 
      });
    }
    
    // Team Leader and Manager can only delete Developer, Designer, and Tester users
    const currentUserRole = req.user.role;
    if ((currentUserRole === 'Team Leader' || currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        !['Developer', 'Designer', 'Tester'].includes(userToDelete.role)) {
      return res.status(403).json({ 
        error: `${currentUserRole} can only delete employees with Developer, Designer, or Tester roles` 
      });
    }
    
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Create audit log for user deletion
    await logDelete(req, 'Users', id, beforeData, 'User');
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

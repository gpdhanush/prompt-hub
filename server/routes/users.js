import express from 'express';
import { db } from '../config/database.js';
import { authenticate, canManageUsers, requireSuperAdmin, canAccessUserManagement } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Restrict access to Users page - only Admin, Super Admin, and Team Lead can view
router.use(canAccessUserManagement);

// Get all users with pagination
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search = '' } = req.query;
    const offset = (page - 1) * limit;
    
    // Get current user's role
    const currentUserRole = req.user?.role || '';
    const isSuperAdmin = currentUserRole === 'Super Admin';
    
    console.log('=== GET USERS REQUEST ===');
    console.log('Current user ID:', req.user?.id);
    console.log('Current user role:', currentUserRole);
    console.log('Is Super Admin:', isSuperAdmin);
    
    let query = `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.mobile,
        u.status,
        u.last_login,
        u.created_at,
        r.name as role,
        p.name as position
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not Super Admin, exclude Super Admin users from results
    if (!isSuperAdmin) {
      query += ` AND r.name != 'Super Admin'`;
      console.log('Filtering out Super Admin users for non-Super Admin user');
    } else {
      console.log('Super Admin user - showing all users including other Super Admins');
    }
    
    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search}%`, `%${search}%`);
    }
    
    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));
    
    const [users] = await db.query(query, params);
    
    console.log(`Found ${users.length} users`);
    console.log('User roles in results:', users.map(u => `${u.name} (${u.role})`).join(', '));
    
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

// Create user - requires Admin or Super Admin
router.post('/', canManageUsers, async (req, res) => {
  try {
    console.log('=== CREATE USER REQUEST ===');
    console.log('Full request body:', JSON.stringify(req.body, null, 2));
    
    const { name, email, password, role, position, mobile, status = 'Active' } = req.body;
    
    // Validate required fields
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields: name, email, password, and role are required' });
    }
    
    // Normalize role value (trim and lowercase)
    const normalizedRole = String(role).trim().toLowerCase();
    
    // Map frontend role values to database role names
    const roleMapping = {
      'admin': 'Admin',
      'team-lead': 'Team Lead',
      'team lead': 'Team Lead', // Handle space variant
      'employee': 'Employee',
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
    
    // Debug: Log the role mapping
    console.log('Received role:', role, 'Type:', typeof role);
    console.log('Normalized role:', normalizedRole);
    console.log('Role mapping lookup:', normalizedRole, '->', roleMapping[normalizedRole]);
    console.log('Mapped to:', dbRoleName);
    
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
        // If position doesn't exist, create it
        const [newPosition] = await db.query('INSERT INTO positions (name) VALUES (?)', [dbPositionName]);
        positionId = newPosition.insertId;
      }
    }
    
    // Hash password (in production, use bcrypt)
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    const [result] = await db.query(`
      INSERT INTO users (name, email, mobile, password_hash, role_id, position_id, status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `, [name, email, mobile || null, passwordHash, roleId, positionId, status]);
    
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
    
    res.status(201).json({ data: newUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update user - requires Admin or Super Admin
router.put('/:id', canManageUsers, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, position, mobile, status } = req.body;
    
    // Get role_id if role is provided
    let roleId = null;
    if (role) {
      // Normalize role value (trim and lowercase)
      const normalizedRole = String(role).trim().toLowerCase();
      
      // Map frontend role values to database role names
      const roleMapping = {
        'admin': 'Admin',
        'team-lead': 'Team Lead',
        'team lead': 'Team Lead', // Handle space variant
        'employee': 'Employee',
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
        // If position doesn't exist, create it
        const [newPosition] = await db.query('INSERT INTO positions (name) VALUES (?)', [dbPositionName]);
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
    
    res.json({ data: updatedUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete user - requires Admin or Super Admin
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
    
    // Prevent deletion of Super Admin users
    if (userToDelete.role === 'Super Admin') {
      return res.status(403).json({ 
        error: 'Cannot delete Super Admin users. Super Admin accounts are protected.' 
      });
    }
    
    const [result] = await db.query('DELETE FROM users WHERE id = ?', [id]);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

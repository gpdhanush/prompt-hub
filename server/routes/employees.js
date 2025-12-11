import express from 'express';
import { db } from '../config/database.js';
import { authenticate, canAccessUserManagement } from '../middleware/auth.js';

const router = express.Router();

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
        e.department,
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
        r.name as role,
        tl.name as team_lead_name,
        e.department,
        e.emp_code,
        e.status
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
  try {
    const { name, email, mobile, password, role, position, department, empCode, teamLeadId } = req.body;
    
    const dbRoleName = role || 'Developer';
    
    // Team Lead and Manager can only create Developer, Designer, and Tester roles
    const currentUserRole = req.user?.role;
    if ((currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
        !['Developer', 'Designer', 'Tester'].includes(dbRoleName)) {
      return res.status(403).json({ 
        error: `${currentUserRole} can only create employees with Developer, Designer, or Tester roles` 
      });
    }
    
    // First create user
    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', [dbRoleName]);
    const roleId = roles[0]?.id || 4; // Default to Developer
    
    const bcrypt = await import('bcryptjs');
    const passwordHash = await bcrypt.default.hash(password, 10);
    
    const [userResult] = await db.query(`
      INSERT INTO users (name, email, mobile, password_hash, role_id, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `, [name, email, mobile, passwordHash, roleId]);
    
    // Then create employee record
    const [empResult] = await db.query(`
      INSERT INTO employees (user_id, emp_code, department, team_lead_id)
      VALUES (?, ?, ?, ?)
    `, [userResult.insertId, empCode, department, teamLeadId || null]);
    
    const [newEmployee] = await db.query(`
      SELECT 
        e.*,
        u.name,
        u.email,
        u.mobile
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      WHERE e.id = ?
    `, [empResult.insertId]);
    
    res.status(201).json({ data: newEmployee[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update employee
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, mobile, department, empCode, teamLeadId, status, photo } = req.body;
    
    // Get employee to find user_id
    const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    const userId = employees[0].user_id;
    
    // Update user if name/email/mobile provided
    if (name || email || mobile) {
      const updates = [];
      const params = [];
      if (name) { updates.push('name = ?'); params.push(name); }
      if (email) { updates.push('email = ?'); params.push(email); }
      if (mobile !== undefined) { updates.push('mobile = ?'); params.push(mobile); }
      if (updates.length > 0) {
        params.push(userId);
        await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      }
    }
    
    // Update employee
    const empUpdates = [];
    const empParams = [];
    if (department !== undefined) { empUpdates.push('department = ?'); empParams.push(department); }
    if (empCode !== undefined) { empUpdates.push('emp_code = ?'); empParams.push(empCode); }
    if (status !== undefined) { empUpdates.push('status = ?'); empParams.push(status); }
    // Note: Photo storage would require a photo column in employees table
    // For now, we accept it but don't store it (can be added later)
    if (photo) {
      console.log('Photo received (base64 length):', photo.length);
      // TODO: Store photo in database or file system when photo column is added
    }
    
    // Handle teamLeadId - convert user_id to employee_id if provided
    if (teamLeadId !== undefined) {
      if (teamLeadId === null || teamLeadId === '') {
        empUpdates.push('team_lead_id = ?');
        empParams.push(null);
      } else {
        // teamLeadId might be a user_id, convert to employee_id
        const [teamLeadEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [teamLeadId]);
        const teamLeadEmployeeId = teamLeadEmployee.length > 0 ? teamLeadEmployee[0].id : null;
        if (teamLeadEmployeeId) {
          empUpdates.push('team_lead_id = ?');
          empParams.push(teamLeadEmployeeId);
        }
      }
    }
    
    if (empUpdates.length > 0) {
      empParams.push(id);
      await db.query(`UPDATE employees SET ${empUpdates.join(', ')} WHERE id = ?`, empParams);
    }
    
    const [updatedEmployee] = await db.query(`
      SELECT 
        e.*,
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
    
    // Team Lead and Manager can only delete Developer, Designer, and Tester employees
    if ((currentUserRole === 'Team Lead' || currentUserRole === 'Manager') && 
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

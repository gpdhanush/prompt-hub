import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all roles - Admin, Team Lead, and Super Admin can view (needed for user/employee creation)
router.get('/', authorize('Super Admin', 'Admin', 'Team Lead'), async (req, res) => {
  try {
    const [roles] = await db.query(`
      SELECT 
        r.*,
        rp.name as reporting_person_role_name
      FROM roles r
      LEFT JOIN roles rp ON r.reporting_person_role_id = rp.id
      ORDER BY r.name ASC
    `);
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get role by ID - Admin, Team Lead, and Super Admin can view
router.get('/:id', authorize('Super Admin', 'Admin', 'Team Lead'), async (req, res) => {
  try {
    const [roles] = await db.query(`
      SELECT 
        r.*,
        rp.name as reporting_person_role_name
      FROM roles r
      LEFT JOIN roles rp ON r.reporting_person_role_id = rp.id
      WHERE r.id = ?
    `, [req.params.id]);
    if (roles.length === 0) return res.status(404).json({ error: 'Role not found' });
    res.json({ data: roles[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create role - Super Admin only
router.post('/', authorize('Super Admin'), async (req, res) => {
  try {
    const { name, description, reporting_person_role_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Role name is required' });
    }
    
    // Check if role name already exists
    const [existing] = await db.query('SELECT id FROM roles WHERE name = ?', [name]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    
    const [result] = await db.query(`
      INSERT INTO roles (name, description, reporting_person_role_id)
      VALUES (?, ?, ?)
    `, [name, description || null, reporting_person_role_id || null]);
    
    const [newRole] = await db.query(`
      SELECT 
        r.*,
        rp.name as reporting_person_role_name
      FROM roles r
      LEFT JOIN roles rp ON r.reporting_person_role_id = rp.id
      WHERE r.id = ?
    `, [result.insertId]);
    
    res.status(201).json({ data: newRole[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update role - Super Admin only
router.put('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, reporting_person_role_id } = req.body;
    
    // Check if role exists
    const [existing] = await db.query('SELECT id FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // If name is being changed, check for duplicates
    if (name) {
      const [duplicate] = await db.query('SELECT id FROM roles WHERE name = ? AND id != ?', [name, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'Role name already exists' });
      }
    }
    
    // Prevent circular reference (role reporting to itself)
    if (reporting_person_role_id && parseInt(reporting_person_role_id) === parseInt(id)) {
      return res.status(400).json({ error: 'Role cannot report to itself' });
    }
    
    await db.query(`
      UPDATE roles 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          reporting_person_role_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, reporting_person_role_id || null, id]);
    
    const [updated] = await db.query(`
      SELECT 
        r.*,
        rp.name as reporting_person_role_name
      FROM roles r
      LEFT JOIN roles rp ON r.reporting_person_role_id = rp.id
      WHERE r.id = ?
    `, [id]);
    
    res.json({ data: updated[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete role - Super Admin only
router.delete('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if role exists
    const [existing] = await db.query('SELECT name FROM roles WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Prevent deletion of Super Admin role
    if (existing[0].name === 'Super Admin') {
      return res.status(400).json({ error: 'Cannot delete Super Admin role' });
    }
    
    // Check if role is being used by any users
    const [users] = await db.query('SELECT COUNT(*) as count FROM users WHERE role_id = ?', [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role. It is assigned to ${users[0].count} user(s). Please reassign users first.` 
      });
    }
    
    await db.query('DELETE FROM roles WHERE id = ?', [id]);
    res.json({ message: 'Role deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

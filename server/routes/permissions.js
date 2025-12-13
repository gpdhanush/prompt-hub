import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all permissions - Super Admin only
router.get('/', authorize('Super Admin'), async (req, res) => {
  try {
    const [permissions] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      ORDER BY module, code ASC
    `);
    res.json({ data: permissions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get permission by ID - Super Admin only
router.get('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const [permissions] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      WHERE id = ?
    `, [req.params.id]);
    if (permissions.length === 0) return res.status(404).json({ error: 'Permission not found' });
    res.json({ data: permissions[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create permission - Super Admin only
router.post('/', authorize('Super Admin'), async (req, res) => {
  try {
    const { code, description, module } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Permission code is required' });
    }
    
    if (!module) {
      return res.status(400).json({ error: 'Permission module is required' });
    }
    
    // Check if permission code already exists
    const [existing] = await db.query('SELECT id FROM permissions WHERE code = ?', [code]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Permission code already exists' });
    }
    
    const [result] = await db.query(`
      INSERT INTO permissions (code, description, module)
      VALUES (?, ?, ?)
    `, [code, description || null, module]);
    
    const [newPermission] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      WHERE id = ?
    `, [result.insertId]);
    
    // Create audit log for permission creation
    await logCreate(req, 'Permissions', result.insertId, {
      id: result.insertId,
      code: code,
      module: module,
      description: description
    }, 'Permission');
    
    res.status(201).json({ data: newPermission[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Permission code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update permission - Super Admin only
router.put('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, module } = req.body;
    
    // Check if permission exists and get before data
    const [existing] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      WHERE id = ?
    `, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    const beforeData = existing[0];
    
    // If code is being changed, check for duplicates
    if (code) {
      const [duplicate] = await db.query('SELECT id FROM permissions WHERE code = ? AND id != ?', [code, id]);
      if (duplicate.length > 0) {
        return res.status(400).json({ error: 'Permission code already exists' });
      }
    }
    
    await db.query(`
      UPDATE permissions 
      SET code = COALESCE(?, code),
          description = COALESCE(?, description),
          module = COALESCE(?, module)
      WHERE id = ?
    `, [code, description, module, id]);
    
    const [updated] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      WHERE id = ?
    `, [id]);
    
    // Create audit log for permission update
    await logUpdate(req, 'Permissions', id, beforeData, updated[0], 'Permission');
    
    res.json({ data: updated[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Permission code already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete permission - Super Admin only
router.delete('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if permission exists and get before data
    const [existing] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      WHERE id = ?
    `, [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    const beforeData = existing[0];
    
    // Check if permission is being used by any roles
    const [rolePermissions] = await db.query('SELECT COUNT(*) as count FROM role_permissions WHERE permission_id = ?', [id]);
    if (rolePermissions[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete permission. It is assigned to ${rolePermissions[0].count} role(s). Please remove from roles first.` 
      });
    }
    
    await db.query('DELETE FROM permissions WHERE id = ?', [id]);
    
    // Create audit log for permission deletion
    await logDelete(req, 'Permissions', id, beforeData, 'Permission');
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

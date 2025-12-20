import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize, requireSuperAdmin } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all permissions - accessible to all authenticated users
router.get('/', async (req, res) => {
  try {
    const [permissions] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      ORDER BY module, code
    `);
    
    res.json({ data: permissions });
  } catch (error) {
    logger.error('Error fetching permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get permissions by module
router.get('/by-module', async (req, res) => {
  try {
    const [permissions] = await db.query(`
      SELECT 
        id,
        code,
        description,
        module,
        created_at
      FROM permissions
      ORDER BY module, code
    `);
    
    // Group by module
    const grouped = permissions.reduce((acc, perm) => {
      if (!acc[perm.module]) {
        acc[perm.module] = [];
      }
      acc[perm.module].push(perm);
      return acc;
    }, {});
    
    res.json({ data: grouped });
  } catch (error) {
    logger.error('Error fetching permissions by module:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create permission - Super Admin only
router.post('/', requireSuperAdmin, async (req, res) => {
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
router.put('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { code, description, module } = req.body;
    
    // Check if permission exists
    const [existing] = await db.query('SELECT * FROM permissions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const beforeData = existing[0];
    
    // Update permission
    const updates = [];
    const params = [];
    
    if (code !== undefined) {
      updates.push('code = ?');
      params.push(code);
    }
    if (description !== undefined) {
      updates.push('description = ?');
      params.push(description);
    }
    if (module !== undefined) {
      updates.push('module = ?');
      params.push(module);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(id);
    
    await db.query(`
      UPDATE permissions 
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);
    
    const [updated] = await db.query('SELECT * FROM permissions WHERE id = ?', [id]);
    
    // Create audit log
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
router.delete('/:id', requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if permission exists
    const [existing] = await db.query('SELECT * FROM permissions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Permission not found' });
    }
    
    const beforeData = existing[0];
    
    // Delete permission (cascade will handle role_permissions)
    await db.query('DELETE FROM permissions WHERE id = ?', [id]);
    
    // Create audit log
    await logDelete(req, 'Permissions', id, beforeData, 'Permission');
    
    res.json({ message: 'Permission deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Check permissions availability - Super Admin only
router.get('/check/availability', requireSuperAdmin, async (req, res) => {
  try {
    // Get all permissions count
    const [permissionsCount] = await db.query('SELECT COUNT(*) as total FROM permissions');
    const totalPermissions = permissionsCount[0].total;
    
    // Get all roles count
    const [rolesCount] = await db.query('SELECT COUNT(*) as total FROM roles');
    const totalRoles = rolesCount[0].total;
    
    // Get role-permission mappings count
    const [mappingsCount] = await db.query('SELECT COUNT(*) as total FROM role_permissions WHERE allowed = TRUE');
    const totalMappings = mappingsCount[0].total;
    
    // Get Super Admin permissions count
    const [superAdminRole] = await db.query('SELECT id FROM roles WHERE name = ?', ['Super Admin']);
    let superAdminPermissionsCount = 0;
    if (superAdminRole.length > 0) {
      const [superAdminPerms] = await db.query(
        'SELECT COUNT(*) as total FROM role_permissions WHERE role_id = ? AND allowed = TRUE',
        [superAdminRole[0].id]
      );
      superAdminPermissionsCount = superAdminPerms[0].total;
    }
    
    // Check if Super Admin has all permissions
    const superAdminHasAll = superAdminPermissionsCount === totalPermissions;
    
    // Get permissions by module
    const [permissionsByModule] = await db.query(`
      SELECT module, COUNT(*) as count
      FROM permissions
      GROUP BY module
      ORDER BY module
    `);
    
    // Get role permissions summary
    const [rolePermissionsSummary] = await db.query(`
      SELECT 
        r.name as role_name,
        COUNT(rp.permission_id) as permission_count
      FROM roles r
      LEFT JOIN role_permissions rp ON r.id = rp.role_id AND rp.allowed = TRUE
      GROUP BY r.id, r.name
      ORDER BY r.name
    `);
    
    res.json({
      data: {
        summary: {
          totalPermissions,
          totalRoles,
          totalMappings,
          superAdminPermissionsCount,
          superAdminHasAll
        },
        permissionsByModule,
        rolePermissionsSummary,
        status: superAdminHasAll && totalPermissions > 0 ? 'ready' : 'needs_setup'
      }
    });
  } catch (error) {
    logger.error('Error checking permissions availability:', error);
    res.status(500).json({ error: error.message });
  }
});

// Initialize permissions for Super Admin - Super Admin only
router.post('/initialize/super-admin', requireSuperAdmin, async (req, res) => {
  try {
    // Get Super Admin role
    const [superAdminRole] = await db.query('SELECT id FROM roles WHERE name = ?', ['Super Admin']);
    if (superAdminRole.length === 0) {
      return res.status(404).json({ error: 'Super Admin role not found' });
    }
    
    const roleId = superAdminRole[0].id;
    
    // Get all permissions
    const [permissions] = await db.query('SELECT id FROM permissions');
    
    if (permissions.length === 0) {
      return res.status(400).json({ error: 'No permissions found. Please create permissions first.' });
    }
    
    // Insert all permissions for Super Admin
    const values = permissions.map(p => `(${roleId}, ${p.id}, TRUE)`).join(',');
    await db.query(`
      INSERT INTO role_permissions (role_id, permission_id, allowed)
      VALUES ${values}
      ON DUPLICATE KEY UPDATE allowed = TRUE
    `);
    
    logger.info(`Initialized ${permissions.length} permissions for Super Admin`);
    
    res.json({
      message: `Successfully initialized ${permissions.length} permissions for Super Admin`,
      permissionsCount: permissions.length
    });
  } catch (error) {
    logger.error('Error initializing Super Admin permissions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

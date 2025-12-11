import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get positions for a specific role (accessible to Admin, Team Lead, and Super Admin for user creation)
router.get('/role/:roleId', authorize('Super Admin', 'Admin', 'Team Lead'), async (req, res) => {
  try {
    const { roleId } = req.params;
    
    // Validate role exists first
    const [roleCheck] = await db.query('SELECT id, name FROM roles WHERE id = ?', [roleId]);
    if (roleCheck.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Try to fetch positions with role mapping
    // Use try-catch for the JOIN query in case role_positions table doesn't exist
    let positions = [];
    try {
      const [mappedPositions] = await db.query(`
        SELECT 
          p.id,
          p.name,
          p.description,
          p.created_at,
          p.updated_at,
          CASE WHEN rp.id IS NOT NULL THEN 1 ELSE 0 END as is_mapped
        FROM positions p
        LEFT JOIN role_positions rp ON p.id = rp.position_id AND rp.role_id = ?
        ORDER BY p.name ASC
      `, [roleId]);
      positions = mappedPositions;
    } catch (joinError) {
      // If role_positions table doesn't exist, fallback to all positions
      if (joinError.code === 'ER_NO_SUCH_TABLE' || joinError.message.includes('role_positions')) {
        console.warn('role_positions table not found, returning all positions');
        const [allPositions] = await db.query('SELECT * FROM positions ORDER BY name ASC');
        positions = allPositions.map((p) => ({ ...p, is_mapped: 0 }));
      } else {
        throw joinError; // Re-throw if it's a different error
      }
    }
    
    res.json({ data: positions });
  } catch (error) {
    console.error('Error fetching role positions:', error);
    // Fallback: return all positions if query fails
    try {
      const [allPositions] = await db.query('SELECT * FROM positions ORDER BY name ASC');
      return res.json({ 
        data: allPositions.map((p) => ({ ...p, is_mapped: 0 })),
        warning: 'Using fallback: all positions returned due to mapping query error'
      });
    } catch (fallbackError) {
      res.status(500).json({ error: error.message });
    }
  }
});

// Get roles for a specific position
router.get('/position/:positionId', authorize('Super Admin'), async (req, res) => {
  try {
    const { positionId } = req.params;
    const [roles] = await db.query(`
      SELECT 
        r.*,
        CASE WHEN rp.id IS NOT NULL THEN TRUE ELSE FALSE END as is_mapped
      FROM roles r
      LEFT JOIN role_positions rp ON r.id = rp.role_id AND rp.position_id = ?
      ORDER BY r.name ASC
    `, [positionId]);
    res.json({ data: roles });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update position mappings for a role (replace all mappings)
router.put('/role/:roleId', authorize('Super Admin'), async (req, res) => {
  try {
    const { roleId } = req.params;
    const { position_ids } = req.body; // Array of position IDs
    
    // Validate role exists
    const [role] = await db.query('SELECT id FROM roles WHERE id = ?', [roleId]);
    if (role.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Check if role_positions table exists
    try {
      await db.query('SELECT 1 FROM role_positions LIMIT 1');
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message.includes('role_positions')) {
        return res.status(503).json({ 
          error: 'Role-Position mapping table does not exist. Please run the database migration script: database/add_role_positions_mapping.sql' 
        });
      }
      throw tableError;
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Delete existing mappings for this role
      await db.query('DELETE FROM role_positions WHERE role_id = ?', [roleId]);
      
      // Insert new mappings
      if (position_ids && Array.isArray(position_ids) && position_ids.length > 0) {
        // Validate all positions exist
        const placeholders = position_ids.map(() => '?').join(',');
        const [positions] = await db.query(
          `SELECT id FROM positions WHERE id IN (${placeholders})`,
          position_ids
        );
        
        if (positions.length !== position_ids.length) {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: 'One or more positions not found' });
        }
        
        // Insert mappings
        const values = position_ids.map((posId) => [roleId, posId]);
        await db.query(
          'INSERT INTO role_positions (role_id, position_id) VALUES ?',
          [values]
        );
      }
      
      await db.query('COMMIT');
      
      // Return updated mappings
      const [mappedPositions] = await db.query(`
        SELECT p.*
        FROM positions p
        INNER JOIN role_positions rp ON p.id = rp.position_id
        WHERE rp.role_id = ?
        ORDER BY p.name ASC
      `, [roleId]);
      
      res.json({ data: mappedPositions });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating role position mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update role mappings for a position (replace all mappings)
router.put('/position/:positionId', authorize('Super Admin'), async (req, res) => {
  try {
    const { positionId } = req.params;
    const { role_ids } = req.body; // Array of role IDs
    
    // Validate position exists
    const [position] = await db.query('SELECT id FROM positions WHERE id = ?', [positionId]);
    if (position.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    
    // Check if role_positions table exists
    try {
      await db.query('SELECT 1 FROM role_positions LIMIT 1');
    } catch (tableError) {
      if (tableError.code === 'ER_NO_SUCH_TABLE' || tableError.message.includes('role_positions')) {
        return res.status(503).json({ 
          error: 'Role-Position mapping table does not exist. Please run the database migration script: database/add_role_positions_mapping.sql' 
        });
      }
      throw tableError;
    }
    
    // Start transaction
    await db.query('START TRANSACTION');
    
    try {
      // Delete existing mappings for this position
      await db.query('DELETE FROM role_positions WHERE position_id = ?', [positionId]);
      
      // Insert new mappings
      if (role_ids && Array.isArray(role_ids) && role_ids.length > 0) {
        // Validate all roles exist
        const placeholders = role_ids.map(() => '?').join(',');
        const [roles] = await db.query(
          `SELECT id FROM roles WHERE id IN (${placeholders})`,
          role_ids
        );
        
        if (roles.length !== role_ids.length) {
          await db.query('ROLLBACK');
          return res.status(400).json({ error: 'One or more roles not found' });
        }
        
        // Insert mappings
        const values = role_ids.map((roleId) => [roleId, positionId]);
        await db.query(
          'INSERT INTO role_positions (role_id, position_id) VALUES ?',
          [values]
        );
      }
      
      await db.query('COMMIT');
      
      // Return updated mappings
      const [mappedRoles] = await db.query(`
        SELECT r.*
        FROM roles r
        INNER JOIN role_positions rp ON r.id = rp.role_id
        WHERE rp.position_id = ?
        ORDER BY r.name ASC
      `, [positionId]);
      
      res.json({ data: mappedRoles });
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error updating position role mappings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all role-position mappings
router.get('/', authorize('Super Admin'), async (req, res) => {
  try {
    const [mappings] = await db.query(`
      SELECT 
        rp.id,
        rp.role_id,
        r.name as role_name,
        rp.position_id,
        p.name as position_name,
        rp.created_at
      FROM role_positions rp
      INNER JOIN roles r ON rp.role_id = r.id
      INNER JOIN positions p ON rp.position_id = p.id
      ORDER BY r.name ASC, p.name ASC
    `);
    res.json({ data: mappings });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

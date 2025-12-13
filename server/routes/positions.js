import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get all positions - Admin, Team Leader, and Super Admin can view (needed for user/employee creation)
router.get('/', authorize('Super Admin', 'Admin', 'Team Leader', 'Team Lead'), async (req, res) => {
  try {
    // Check if level column exists, handle gracefully
    let query = '';
    try {
      query = `
        SELECT 
          p.*,
          parent.name as parent_name
        FROM positions p
        LEFT JOIN positions parent ON p.parent_id = parent.id
        ORDER BY p.level ASC, p.name ASC
      `;
      const [positions] = await db.query(query);
      res.json({ data: positions });
    } catch (dbError) {
      // If level column doesn't exist, return positions without hierarchy
      if (dbError.code === 'ER_BAD_FIELD_ERROR') {
        const [positions] = await db.query(`
          SELECT p.*
          FROM positions p
          ORDER BY p.name ASC
        `);
        res.json({ data: positions });
      } else {
        throw dbError;
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get available positions for current user (filtered by hierarchy)
router.get('/available', async (req, res) => {
  try {
    const { getAvailablePositions } = await import('../utils/positionValidation.js');
    const creatorUserId = req.user?.id;
    if (!creatorUserId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    const availablePositions = await getAvailablePositions(creatorUserId);
    res.json({ data: availablePositions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get position hierarchy tree
router.get('/hierarchy', authorize('Super Admin'), async (req, res) => {
  try {
    const [positions] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.level,
        p.parent_id,
        p.description,
        parent.name as parent_name
      FROM positions p
      LEFT JOIN positions parent ON p.parent_id = parent.id
      ORDER BY p.level ASC, p.name ASC
    `);
    
    // Build tree structure
    const positionMap = new Map();
    const rootPositions = [];
    
    // First pass: create map
    positions.forEach(pos => {
      positionMap.set(pos.id, { ...pos, children: [] });
    });
    
    // Second pass: build tree
    positions.forEach(pos => {
      const position = positionMap.get(pos.id);
      if (pos.parent_id === null) {
        rootPositions.push(position);
      } else {
        const parent = positionMap.get(pos.parent_id);
        if (parent) {
          parent.children.push(position);
        } else {
          rootPositions.push(position); // Orphan node
        }
      }
    });
    
    res.json({ data: rootPositions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get position by ID - Admin, Team Leader, and Super Admin can view
router.get('/:id', authorize('Super Admin', 'Admin', 'Team Leader', 'Team Lead'), async (req, res) => {
  try {
    const [positions] = await db.query('SELECT * FROM positions WHERE id = ?', [req.params.id]);
    if (positions.length === 0) return res.status(404).json({ error: 'Position not found' });
    res.json({ data: positions[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create position - Super Admin only
router.post('/', authorize('Super Admin'), async (req, res) => {
  try {
    const { name, description, level, parent_id } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Position name is required' });
    }
    
    // Positions are for display purposes only - no hierarchy validation required
    // Level defaults to 2 if not provided (since column is NOT NULL)
    const positionLevel = level !== undefined && level !== null && level !== '' ? parseInt(level) : 2;
    const finalParentId = parent_id !== undefined && parent_id !== null && parent_id !== '' ? parseInt(parent_id) : null;
    
    // Validate level if provided (must be 0, 1, or 2)
    if (isNaN(positionLevel) || positionLevel < 0 || positionLevel > 2) {
      return res.status(400).json({ error: 'Level must be 0, 1, or 2' });
    }
    
    // Validate parent_id if provided (just check if it exists, no hierarchy validation)
    if (finalParentId !== null) {
      const [parent] = await db.query('SELECT id FROM positions WHERE id = ?', [finalParentId]);
      if (parent.length === 0) {
        return res.status(400).json({ error: 'Parent position not found' });
      }
    }
    
    // Insert position - level defaults to 2 if not provided (for display-only positions)
    const [result] = await db.query(`
      INSERT INTO positions (name, description, level, parent_id)
      VALUES (?, ?, ?, ?)
    `, [name, description || null, positionLevel, finalParentId]);
    
    const [newPosition] = await db.query('SELECT * FROM positions WHERE id = ?', [result.insertId]);
    
    // Create audit log for position creation
    await logCreate(req, 'Positions', result.insertId, {
      id: result.insertId,
      name: name,
      description: description
    }, 'Position');
    
    res.status(201).json({ data: newPosition[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Position name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Update position - Super Admin only
router.put('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, level, parent_id } = req.body;
    
    // Check if position exists and get before data
    const [existing] = await db.query('SELECT * FROM positions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    const beforeData = existing[0];
    
    // Positions are for display purposes only - no hierarchy validation required
    // Level defaults to existing value or 2 if not provided (since column is NOT NULL)
    let positionLevel = existing[0].level; // Keep existing if not provided
    if (level !== undefined && level !== null && level !== '') {
      positionLevel = parseInt(level);
      if (isNaN(positionLevel) || positionLevel < 0 || positionLevel > 2) {
        return res.status(400).json({ error: 'Level must be 0, 1, or 2' });
      }
    }
    
    // Validate parent_id if provided (just check if it exists, no hierarchy validation)
    let finalParentId = existing[0].parent_id; // Keep existing if not provided
    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === '') {
        finalParentId = null;
      } else {
        const [parent] = await db.query('SELECT id FROM positions WHERE id = ?', [parent_id]);
        if (parent.length === 0) {
          return res.status(400).json({ error: 'Parent position not found' });
        }
        // Prevent self-reference
        if (parseInt(parent_id) === parseInt(id)) {
          return res.status(400).json({ error: 'Position cannot be its own parent' });
        }
        finalParentId = parseInt(parent_id);
      }
    }
    
    await db.query(`
      UPDATE positions 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          level = ?,
          parent_id = ?,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, positionLevel, finalParentId, id]);
    
    const [updated] = await db.query('SELECT * FROM positions WHERE id = ?', [id]);
    
    // Create audit log for position update
    await logUpdate(req, 'Positions', id, beforeData, updated[0], 'Position');
    
    res.json({ data: updated[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Position name already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete position - Super Admin only
router.delete('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Check if position exists and get before data
    const [existing] = await db.query('SELECT * FROM positions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    const beforeData = existing[0];
    
    // Check if position is being used by any users
    const [users] = await db.query('SELECT COUNT(*) as count FROM users WHERE position_id = ?', [id]);
    if (users[0].count > 0) {
      return res.status(400).json({ 
        error: `Cannot delete position. It is assigned to ${users[0].count} user(s). Please reassign users first.` 
      });
    }
    
    await db.query('DELETE FROM positions WHERE id = ?', [id]);
    
    // Create audit log for position deletion
    await logDelete(req, 'Positions', id, beforeData, 'Position');
    
    res.json({ message: 'Position deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

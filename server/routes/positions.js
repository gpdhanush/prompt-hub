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
    
    // Validate level (0, 1, or 2)
    const positionLevel = level !== undefined ? parseInt(level) : 2; // Default to 2
    if (positionLevel < 0 || positionLevel > 2) {
      return res.status(400).json({ error: 'Level must be 0, 1, or 2' });
    }
    
    // Validate parent_id if provided
    if (parent_id) {
      const [parent] = await db.query('SELECT id, level FROM positions WHERE id = ?', [parent_id]);
      if (parent.length === 0) {
        return res.status(400).json({ error: 'Parent position not found' });
      }
      // Ensure parent level is one less than child level
      if (parent[0].level !== positionLevel - 1) {
        return res.status(400).json({ 
          error: `Invalid hierarchy: Level ${positionLevel} position cannot have Level ${parent[0].level} as parent. Parent must be Level ${positionLevel - 1}.` 
        });
      }
    } else if (positionLevel > 0) {
      // Level 1 and 2 positions should have a parent
      return res.status(400).json({ error: `Level ${positionLevel} positions must have a parent position` });
    }
    
    const [result] = await db.query(`
      INSERT INTO positions (name, description, level, parent_id)
      VALUES (?, ?, ?, ?)
    `, [name, description || null, positionLevel, parent_id || null]);
    
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
    
    // Validate level if provided
    let positionLevel = existing[0].level; // Keep existing if not provided
    if (level !== undefined) {
      positionLevel = parseInt(level);
      if (positionLevel < 0 || positionLevel > 2) {
        return res.status(400).json({ error: 'Level must be 0, 1, or 2' });
      }
    }
    
    // Validate parent_id if provided
    let finalParentId = existing[0].parent_id; // Keep existing if not provided
    if (parent_id !== undefined) {
      if (parent_id === null || parent_id === '') {
        finalParentId = null;
      } else {
        const [parent] = await db.query('SELECT id, level FROM positions WHERE id = ?', [parent_id]);
        if (parent.length === 0) {
          return res.status(400).json({ error: 'Parent position not found' });
        }
        // Ensure parent level is one less than child level
        if (parent[0].level !== positionLevel - 1) {
          return res.status(400).json({ 
            error: `Invalid hierarchy: Level ${positionLevel} position cannot have Level ${parent[0].level} as parent. Parent must be Level ${positionLevel - 1}.` 
          });
        }
        finalParentId = parent_id;
      }
    }
    
    // Prevent circular references (position cannot be its own parent or ancestor)
    if (finalParentId) {
      const [ancestors] = await db.query(`
        WITH RECURSIVE ancestors AS (
          SELECT id, parent_id FROM positions WHERE id = ?
          UNION ALL
          SELECT p.id, p.parent_id FROM positions p
          INNER JOIN ancestors a ON p.id = a.parent_id
        )
        SELECT id FROM ancestors WHERE id = ?
      `, [finalParentId, id]);
      
      if (ancestors.length > 0) {
        return res.status(400).json({ error: 'Cannot set parent: This would create a circular reference in the hierarchy' });
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

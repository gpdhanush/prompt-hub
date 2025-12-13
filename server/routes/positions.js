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
    const [positions] = await db.query('SELECT * FROM positions ORDER BY name ASC');
    res.json({ data: positions });
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
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Position name is required' });
    }
    
    const [result] = await db.query(`
      INSERT INTO positions (name, description)
      VALUES (?, ?)
    `, [name, description || null]);
    
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
    const { name, description } = req.body;
    
    // Check if position exists and get before data
    const [existing] = await db.query('SELECT * FROM positions WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Position not found' });
    }
    const beforeData = existing[0];
    
    await db.query(`
      UPDATE positions 
      SET name = COALESCE(?, name),
          description = COALESCE(?, description),
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, [name, description, id]);
    
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

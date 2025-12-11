import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    const [projects] = await db.query(`
      SELECT * FROM projects 
      ORDER BY created_at DESC 
      LIMIT ? OFFSET ?
    `, [parseInt(limit), parseInt(offset)]);
    
    const [countResult] = await db.query('SELECT COUNT(*) as total FROM projects');
    const total = countResult[0].total;
    
    res.json({
      data: projects,
      pagination: { page: parseInt(page), limit: parseInt(limit), total, totalPages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const [projects] = await db.query('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
    res.json({ data: projects[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project - only Team Lead and Super Admin
router.post('/', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { name, description, status, start_date, end_date } = req.body;
    
    // Valid status values matching database ENUM
    const validStatuses = ['Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold'];
    
    // Normalize status - map old/invalid values to valid ones
    let normalizedStatus = status || 'Planning';
    const statusMap = {
      'Development': 'In Progress',
      'Dev': 'In Progress',
      'In-Progress': 'In Progress',
      'PreProd': 'Pre-Prod',
      'Pre Prod': 'Pre-Prod',
    };
    
    if (statusMap[normalizedStatus]) {
      normalizedStatus = statusMap[normalizedStatus];
    }
    
    // Validate status is in allowed values
    if (!validStatuses.includes(normalizedStatus)) {
      return res.status(400).json({ 
        error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}` 
      });
    }
    
    // Generate project code (PRJ-001, PRJ-002, etc.)
    // Get the highest project code number to avoid duplicates
    const [maxCodeResult] = await db.query(`
      SELECT project_code FROM projects 
      WHERE project_code LIKE 'PRJ-%' 
      ORDER BY CAST(SUBSTRING(project_code, 5) AS UNSIGNED) DESC 
      LIMIT 1
    `);
    
    let nextNumber = 1;
    if (maxCodeResult.length > 0 && maxCodeResult[0].project_code) {
      const lastCode = maxCodeResult[0].project_code;
      const lastNumber = parseInt(lastCode.replace('PRJ-', '')) || 0;
      nextNumber = lastNumber + 1;
    }
    
    const projectCode = `PRJ-${String(nextNumber).padStart(3, '0')}`;
    
    const [result] = await db.query(`
      INSERT INTO projects (project_code, name, description, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [projectCode, name, description, normalizedStatus, start_date || null, end_date || null]);
    const [newProject] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
    res.status(201).json({ data: newProject[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      // If project code already exists (race condition), try next number
      const [maxCodeResult] = await db.query(`
        SELECT project_code FROM projects 
        WHERE project_code LIKE 'PRJ-%' 
        ORDER BY CAST(SUBSTRING(project_code, 5) AS UNSIGNED) DESC 
        LIMIT 1
      `);
      let nextNumber = 1;
      if (maxCodeResult.length > 0 && maxCodeResult[0].project_code) {
        const lastCode = maxCodeResult[0].project_code;
        const lastNumber = parseInt(lastCode.replace('PRJ-', '')) || 0;
        nextNumber = lastNumber + 1;
      }
      const projectCode = `PRJ-${String(nextNumber).padStart(3, '0')}`;
      try {
        const [result] = await db.query(`
          INSERT INTO projects (project_code, name, description, status, start_date, end_date)
          VALUES (?, ?, ?, ?, ?, ?)
        `, [projectCode, name, description, status || 'Planning', start_date || null, end_date || null]);
        const [newProject] = await db.query('SELECT * FROM projects WHERE id = ?', [result.insertId]);
        res.status(201).json({ data: newProject[0] });
      } catch (retryError) {
        res.status(500).json({ error: retryError.message });
      }
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

// Update project - only Team Lead and Super Admin
router.put('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, status, start_date, end_date } = req.body;
    
    console.log('=== UPDATE PROJECT REQUEST ===');
    console.log('Project ID:', id);
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Status received:', status);
    
    // Valid status values matching database ENUM
    const validStatuses = ['Planning', 'In Progress', 'Testing', 'Pre-Prod', 'Production', 'Completed', 'On Hold'];
    
    // Normalize status - map old/invalid values to valid ones
    let normalizedStatus = status || 'Planning';
    const statusMap = {
      'Development': 'In Progress',
      'Dev': 'In Progress',
      'In-Progress': 'In Progress',
      'PreProd': 'Pre-Prod',
      'Pre Prod': 'Pre-Prod',
    };
    
    if (statusMap[normalizedStatus]) {
      normalizedStatus = statusMap[normalizedStatus];
    }
    
    console.log('Normalized status:', normalizedStatus);
    
    // Validate status is in allowed values
    if (!validStatuses.includes(normalizedStatus)) {
      console.log('Invalid status detected:', normalizedStatus);
      return res.status(400).json({ 
        error: `Invalid status: "${status}". Valid values are: ${validStatuses.join(', ')}` 
      });
    }
    
    // Always update all provided fields
    // Use the normalized status value
    const updateParams = [
      name,
      description,
      normalizedStatus, // Use normalized status
      start_date || null,
      end_date || null,
      id
    ];
    
    console.log('Update params array:', updateParams);
    console.log('Status value being sent:', normalizedStatus);
    console.log('Status type:', typeof normalizedStatus);
    
    const [result] = await db.query(`
      UPDATE projects 
      SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateParams);
    
    console.log('Update result:', result);
    console.log('Affected rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const [updated] = await db.query('SELECT * FROM projects WHERE id = ?', [id]);
    console.log('Updated project:', updated[0]);
    
    res.json({ data: updated[0] });
  } catch (error) {
    console.error('Update project error:', error);
    if (error.code === 'ER_DATA_TOO_LONG' || error.message.includes('truncated')) {
      return res.status(400).json({ 
        error: `Invalid status value. Valid values are: Planning, In Progress, Testing, Pre-Prod, Production, Completed, On Hold` 
      });
    }
    res.status(500).json({ error: error.message });
  }
});

// Delete project - only Team Lead and Super Admin
router.delete('/:id', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM projects WHERE id = ?', [req.params.id]);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const [prompts] = await db.query('SELECT * FROM ai_prompts ORDER BY created_at DESC');
    res.json({ data: prompts });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const { title, prompt_text, category, created_by } = req.body;
    const [result] = await db.query(`
      INSERT INTO ai_prompts (title, prompt_text, category, created_by)
      VALUES (?, ?, ?, ?)
    `, [title, prompt_text, category, created_by]);
    const [newPrompt] = await db.query('SELECT * FROM ai_prompts WHERE id = ?', [result.insertId]);
    
    // Create audit log for prompt creation
    await logCreate(req, 'Prompts', result.insertId, {
      id: result.insertId,
      title: title,
      category: category,
      created_by: created_by
    }, 'Prompt');
    
    res.status(201).json({ data: newPrompt[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, prompt_text, category } = req.body;
    
    // Get before data for audit log
    const [existing] = await db.query('SELECT * FROM ai_prompts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    const beforeData = existing[0];
    
    await db.query('UPDATE ai_prompts SET title = ?, prompt_text = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, prompt_text, category, id]);
    const [updated] = await db.query('SELECT * FROM ai_prompts WHERE id = ?', [id]);
    
    // Create audit log for prompt update
    await logUpdate(req, 'Prompts', id, beforeData, updated[0], 'Prompt');
    
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get before data for audit log
    const [existing] = await db.query('SELECT * FROM ai_prompts WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Prompt not found' });
    }
    const beforeData = existing[0];
    
    await db.query('DELETE FROM ai_prompts WHERE id = ?', [id]);
    
    // Create audit log for prompt deletion
    await logDelete(req, 'Prompts', id, beforeData, 'Prompt');
    
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

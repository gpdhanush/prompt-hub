import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

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
    res.status(201).json({ data: newPrompt[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const { title, prompt_text, category } = req.body;
    await db.query('UPDATE ai_prompts SET title = ?, prompt_text = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [title, prompt_text, category, req.params.id]);
    const [updated] = await db.query('SELECT * FROM ai_prompts WHERE id = ?', [req.params.id]);
    res.json({ data: updated[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM ai_prompts WHERE id = ?', [req.params.id]);
    res.json({ message: 'Prompt deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

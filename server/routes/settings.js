import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get settings - all authenticated users can view
router.get('/', async (req, res) => {
  try {
    // Check if settings table exists and has data
    let [settings] = await db.query('SELECT * FROM settings LIMIT 1');
    
    // If no settings exist, create default settings
    if (settings.length === 0) {
      await db.query(`
        INSERT INTO settings (currency_symbol, created_at, updated_at)
        VALUES ('$', NOW(), NOW())
      `);
      [settings] = await db.query('SELECT * FROM settings LIMIT 1');
    }
    
    res.json({ data: settings[0] || { currency_symbol: '$' } });
  } catch (error) {
    // If table doesn't exist, return default
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.json({ data: { currency_symbol: '$' } });
    }
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update settings - Super Admin only
router.patch('/', async (req, res) => {
  try {
    const userRole = req.user?.role || '';
    
    // Only Super Admin can update settings
    if (userRole !== 'Super Admin') {
      return res.status(403).json({ error: 'Only Super Admin can update settings' });
    }
    
    const { currency_symbol } = req.body;
    
    // Validate currency symbol
    if (currency_symbol && !['$', '₹'].includes(currency_symbol)) {
      return res.status(400).json({ error: 'Invalid currency symbol. Only $ and ₹ are allowed.' });
    }
    
    // Check if settings table exists
    let [existing] = await db.query('SELECT * FROM settings LIMIT 1');
    
    if (existing.length === 0) {
      // Create settings record
      await db.query(`
        INSERT INTO settings (currency_symbol, created_at, updated_at)
        VALUES (?, NOW(), NOW())
      `, [currency_symbol || '$']);
    } else {
      // Update existing settings
      const updates = [];
      const values = [];
      
      if (currency_symbol !== undefined) {
        updates.push('currency_symbol = ?');
        values.push(currency_symbol);
      }
      
      if (updates.length > 0) {
        updates.push('updated_at = NOW()');
        values.push(1); // WHERE id = 1
        await db.query(`UPDATE settings SET ${updates.join(', ')} WHERE id = ?`, values);
      }
    }
    
    const [updated] = await db.query('SELECT * FROM settings LIMIT 1');
    res.json({ data: updated[0] || { currency_symbol: currency_symbol || '$' } });
  } catch (error) {
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

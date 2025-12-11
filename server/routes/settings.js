import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to ensure settings table exists
async function ensureSettingsTable() {
  try {
    // Check if table exists
    const [tables] = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = DATABASE() 
      AND table_name = 'settings'
    `);
    
    if (tables[0].count === 0) {
      // Create settings table
      await db.query(`
        CREATE TABLE IF NOT EXISTS settings (
          id INT UNSIGNED NOT NULL AUTO_INCREMENT,
          currency_symbol VARCHAR(3) DEFAULT '$',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
          PRIMARY KEY (id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
      `);
      
      // Insert default settings
      await db.query(`
        INSERT INTO settings (id, currency_symbol, created_at, updated_at)
        VALUES (1, '$', NOW(), NOW())
        ON DUPLICATE KEY UPDATE currency_symbol = '$'
      `);
    }
  } catch (error) {
    console.error('Error ensuring settings table:', error);
    throw error;
  }
}

// Get settings - all authenticated users can view
router.get('/', async (req, res) => {
  try {
    // Ensure table exists
    await ensureSettingsTable();
    
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
      // Try to create table and retry
      try {
        await ensureSettingsTable();
        const [settings] = await db.query('SELECT * FROM settings LIMIT 1');
        return res.json({ data: settings[0] || { currency_symbol: '$' } });
      } catch (createError) {
        console.error('Error creating settings table:', createError);
        return res.json({ data: { currency_symbol: '$' } });
      }
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
    
    // Ensure table exists first
    await ensureSettingsTable();
    
    // Check if settings table exists and has data
    let [existing] = await db.query('SELECT * FROM settings LIMIT 1');
    
    if (existing.length === 0) {
      // Create settings record
      await db.query(`
        INSERT INTO settings (id, currency_symbol, created_at, updated_at)
        VALUES (1, ?, NOW(), NOW())
        ON DUPLICATE KEY UPDATE currency_symbol = ?
      `, [currency_symbol || '$', currency_symbol || '$']);
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
    // If table doesn't exist, try to create it and retry
    if (error.code === 'ER_NO_SUCH_TABLE') {
      try {
        await ensureSettingsTable();
        // Retry the update
        if (currency_symbol !== undefined) {
          await db.query(`
            INSERT INTO settings (id, currency_symbol, created_at, updated_at)
            VALUES (1, ?, NOW(), NOW())
            ON DUPLICATE KEY UPDATE currency_symbol = ?, updated_at = NOW()
          `, [currency_symbol, currency_symbol]);
        }
        const [updated] = await db.query('SELECT * FROM settings LIMIT 1');
        return res.json({ data: updated[0] || { currency_symbol: currency_symbol || '$' } });
      } catch (createError) {
        console.error('Error creating settings table:', createError);
        return res.status(500).json({ error: 'Failed to create settings table: ' + createError.message });
      }
    }
    console.error('Error updating settings:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Helper function to get day name from date
function getDayName(dateString) {
  const date = new Date(dateString);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

// Get all holidays - All authenticated users can view
router.get('/', async (req, res) => {
  try {
    const { year, is_restricted } = req.query;
    
    let query = 'SELECT * FROM holidays WHERE 1=1';
    const params = [];
    
    if (year) {
      query += ' AND year = ?';
      params.push(parseInt(year));
    }
    
    if (is_restricted !== undefined) {
      query += ' AND is_restricted = ?';
      params.push(is_restricted === 'true' ? 1 : 0);
    }
    
    query += ' ORDER BY date ASC';
    
    const [holidays] = await db.query(query, params);
    
    res.json({ data: holidays });
  } catch (error) {
    logger.error('Error fetching holidays:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get holiday by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [holidays] = await db.query('SELECT * FROM holidays WHERE id = ?', [id]);
    
    if (holidays.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    
    res.json({ data: holidays[0] });
  } catch (error) {
    logger.error('Error fetching holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create holiday - Super Admin only
router.post('/', authorize('Super Admin'), async (req, res) => {
  try {
    const { holiday_name, date, is_restricted } = req.body;
    const userId = req.user.id;
    
    if (!holiday_name || !date) {
      return res.status(400).json({ error: 'Holiday name and date are required' });
    }
    
    const holidayDate = new Date(date);
    const year = holidayDate.getFullYear();
    const day = getDayName(date);
    
    // Check for duplicate
    const [existing] = await db.query(
      'SELECT id FROM holidays WHERE date = ? AND holiday_name = ?',
      [date, holiday_name]
    );
    
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Holiday with this name and date already exists' });
    }
    
    const [result] = await db.query(
      `INSERT INTO holidays (holiday_name, date, day, is_restricted, year, created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [holiday_name, date, day, is_restricted ? 1 : 0, year, userId]
    );
    
    const [newHoliday] = await db.query('SELECT * FROM holidays WHERE id = ?', [result.insertId]);
    
    await logCreate(req, 'Holidays', result.insertId, newHoliday[0], 'Holiday');
    
    res.status(201).json({ data: newHoliday[0] });
  } catch (error) {
    logger.error('Error creating holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update holiday - Super Admin only
router.put('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    const { holiday_name, date, is_restricted } = req.body;
    
    // Fetch old holiday data for audit log
    const [oldHolidays] = await db.query('SELECT * FROM holidays WHERE id = ?', [id]);
    if (oldHolidays.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    const oldHoliday = oldHolidays[0];
    
    const updateFields = [];
    const updateValues = [];
    
    if (holiday_name !== undefined) {
      updateFields.push('holiday_name = ?');
      updateValues.push(holiday_name);
    }
    
    if (date !== undefined) {
      const holidayDate = new Date(date);
      const year = holidayDate.getFullYear();
      const day = getDayName(date);
      updateFields.push('date = ?');
      updateFields.push('day = ?');
      updateFields.push('year = ?');
      updateValues.push(date, day, year);
    }
    
    if (is_restricted !== undefined) {
      updateFields.push('is_restricted = ?');
      updateValues.push(is_restricted ? 1 : 0);
    }
    
    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updateValues.push(id);
    
    await db.query(
      `UPDATE holidays SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );
    
    const [updatedHolidays] = await db.query('SELECT * FROM holidays WHERE id = ?', [id]);
    const updatedHoliday = updatedHolidays[0];
    
    await logUpdate(req, 'Holidays', id, oldHoliday, updatedHoliday, 'Holiday');
    
    res.json({ data: updatedHoliday });
  } catch (error) {
    logger.error('Error updating holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete holiday - Super Admin only
router.delete('/:id', authorize('Super Admin'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const [holidays] = await db.query('SELECT * FROM holidays WHERE id = ?', [id]);
    if (holidays.length === 0) {
      return res.status(404).json({ error: 'Holiday not found' });
    }
    const holiday = holidays[0];
    
    await db.query('DELETE FROM holidays WHERE id = ?', [id]);
    
    await logDelete(req, 'Holidays', id, holiday, 'Holiday');
    
    res.json({ message: 'Holiday deleted successfully' });
  } catch (error) {
    logger.error('Error deleting holiday:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


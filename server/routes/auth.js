import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    logger.debug('Login attempt for email:', email);
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = ?
    `, [email]);
    
    if (users.length === 0) {
      logger.warn('User not found for email:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = users[0];
    logger.debug('User found:', user.email, 'Role:', user.role);
    
    // Verify password
    const bcrypt = await import('bcryptjs');
    const isValid = await bcrypt.default.compare(password, user.password_hash);
    
    logger.debug('Password valid:', isValid);
    
    if (!isValid) {
      logger.warn('Password mismatch for user:', email);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    await db.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?', [user.id]);
    
    // In production, generate JWT token here
    const token = 'mock-jwt-token'; // Replace with actual JWT
    
    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    // In production, verify JWT token from headers
    const userId = req.headers['user-id'] || 1; // Mock for now
    
    const [users] = await db.query(`
      SELECT u.*, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ data: users[0] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update current user's profile
router.put('/me/profile', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    const { name, email, mobile, password, oldPassword } = req.body;
    
    // If password is being updated, validate old password first
    if (password) {
      if (!oldPassword) {
        return res.status(400).json({ error: 'Old password is required to change password' });
      }
      
      // Get current user's password hash
      const [users] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      
      // Verify old password
      const bcrypt = await import('bcryptjs');
      const isValid = await bcrypt.default.compare(oldPassword, users[0].password_hash);
      if (!isValid) {
        return res.status(400).json({ error: 'Old password is incorrect' });
      }
    }
    
    const updates = [];
    const params = [];
    
    if (name) {
      updates.push('name = ?');
      params.push(name);
    }
    if (email) {
      updates.push('email = ?');
      params.push(email);
    }
    if (mobile !== undefined) {
      updates.push('mobile = ?');
      params.push(mobile);
    }
    if (password) {
      const bcrypt = await import('bcryptjs');
      const passwordHash = await bcrypt.default.hash(password, 10);
      updates.push('password_hash = ?');
      params.push(passwordHash);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(userId);
    
    await db.query(`
      UPDATE users 
      SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, params);
    
    const [updatedUser] = await db.query(`
      SELECT 
        u.*,
        r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    res.json({ data: updatedUser[0] });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get current user's permissions
router.get('/me/permissions', async (req, res) => {
  try {
    const userId = req.headers['user-id'];
    
    if (!userId) {
      return res.status(401).json({ error: 'User ID not provided' });
    }
    
    // Get user's role
    const [users] = await db.query(`
      SELECT u.role_id, r.name as role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ?
    `, [userId]);
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[0];
    const roleId = user.role_id;
    
    // Super Admin has all permissions
    if (user.role === 'Super Admin') {
      const [allPermissions] = await db.query(`
        SELECT code FROM permissions
      `);
      return res.json({ 
        data: allPermissions.map((p) => p.code) 
      });
    }
    
    // Get permissions for the user's role
    const [permissions] = await db.query(`
      SELECT p.code
      FROM permissions p
      INNER JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = ? AND rp.allowed = TRUE
    `, [roleId]);
    
    res.json({ 
      data: permissions.map((p) => p.code) 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { authenticate, requireAdmin, requirePermission } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete, getClientIp, getUserAgent } from '../utils/auditLogger.js';
import { logger } from '../utils/logger.js';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure multer for ticket attachment uploads
const ticketAttachmentsDir = path.join(__dirname, '..', 'uploads', 'ticket-attachments');
if (!fs.existsSync(ticketAttachmentsDir)) {
  fs.mkdirSync(ticketAttachmentsDir, { recursive: true });
}

const ticketAttachmentStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ticketAttachmentsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `ticket-${uniqueSuffix}${path.extname(file.originalname)}`);
  }
});

const ticketAttachmentFilter = (req, file, cb) => {
  // Allow images, documents, and common file types
  const allowedMimes = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/zip',
    'application/x-zip-compressed',
    'application/x-rar-compressed',
    'text/plain',
    'text/csv',
    'application/json',
    'application/xml',
    'text/xml'
  ];
  
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only images, documents, and archives are allowed.'), false);
  }
};

const uploadTicketAttachment = multer({
  storage: ticketAttachmentStorage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: ticketAttachmentFilter
});

// Apply authentication to all routes
router.use(authenticate);

// ============================================
// ASSET CATEGORIES
// ============================================

// Get all asset categories
router.get('/categories', async (req, res) => {
  try {
    const [categories] = await db.query(`
      SELECT * FROM asset_categories 
      ORDER BY name ASC
    `);
    res.json({ data: categories });
  } catch (error) {
    logger.error('Error fetching asset categories:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create asset category (Admin only)
router.post('/categories', requireAdmin, async (req, res) => {
  try {
    const { name, description } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Category name is required' });
    }
    
    const [result] = await db.query(`
      INSERT INTO asset_categories (name, description)
      VALUES (?, ?)
    `, [name, description]);
    
    res.status(201).json({ 
      data: { id: result.insertId, name, description },
      message: 'Asset category created successfully'
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ error: 'Category name already exists' });
    }
    logger.error('Error creating asset category:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSETS - Main CRUD
// ============================================

// Generate unique asset code
async function generateAssetCode(categoryId) {
  const [category] = await db.query('SELECT name FROM asset_categories WHERE id = ?', [categoryId]);
  if (category.length === 0) throw new Error('Category not found');
  
  const prefix = category[0].name.substring(0, 3).toUpperCase();
  const [existing] = await db.query(
    'SELECT asset_code FROM assets WHERE asset_code LIKE ? ORDER BY asset_code DESC LIMIT 1',
    [`${prefix}%`]
  );
  
  let num = 1;
  if (existing.length > 0) {
    const lastCode = existing[0].asset_code;
    const lastNum = parseInt(lastCode.replace(prefix, '')) || 0;
    num = lastNum + 1;
  }
  
  return `${prefix}${String(num).padStart(4, '0')}`;
}

// Get all assets with filters
router.get('/', async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 10, 
      status, 
      category_id, 
      search,
      assigned_only 
    } = req.query;
    
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    logger.debug('=== GET ASSETS REQUEST ===');
    logger.debug('User ID:', userId);
    logger.debug('User Role:', userRole);
    logger.debug('Is Admin:', isAdmin);
    
    let query = `
      SELECT 
        a.*,
        ac.name as category_name,
        u.name as created_by_name,
        aa.employee_id as assigned_employee_id,
        e.emp_code as assigned_emp_code,
        CONCAT(u2.name) as assigned_employee_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN asset_assignments aa ON a.id = aa.asset_id AND aa.status = 'active'
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u2 ON e.user_id = u2.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not admin, show only assigned assets to the employee
    if (!isAdmin && assigned_only === 'true') {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ' AND aa.employee_id = ?';
        params.push(employee[0].id);
      } else {
        // Employee not found, return empty
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      query += ' AND a.status = ?';
      params.push(status);
    }
    
    if (category_id) {
      query += ' AND a.asset_category_id = ?';
      params.push(category_id);
    }
    
    if (search) {
      query += ' AND (a.asset_code LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    query += ' ORDER BY a.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [assets] = await db.query(query, params);
    
    // Get laptop/mobile/accessory details for each asset
    for (const asset of assets) {
      const categoryName = asset.category_name?.toLowerCase() || '';
      
      if (categoryName.includes('laptop')) {
        const [laptop] = await db.query('SELECT * FROM asset_laptop_details WHERE asset_id = ?', [asset.id]);
        asset.laptop_details = laptop[0] || null;
      } else if (categoryName.includes('mobile')) {
        const [mobile] = await db.query('SELECT * FROM asset_mobile_details WHERE asset_id = ?', [asset.id]);
        asset.mobile_details = mobile[0] || null;
      } else {
        const [accessory] = await db.query('SELECT * FROM asset_accessory_details WHERE asset_id = ?', [asset.id]);
        asset.accessory_details = accessory[0] || null;
      }
    }
    
    // Count query
    let countQuery = 'SELECT COUNT(*) as total FROM assets a WHERE 1=1';
    const countParams = [];
    
    if (!isAdmin && assigned_only === 'true') {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        countQuery += ' AND EXISTS (SELECT 1 FROM asset_assignments aa WHERE aa.asset_id = a.id AND aa.employee_id = ? AND aa.status = "active")';
        countParams.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      countQuery += ' AND a.status = ?';
      countParams.push(status);
    }
    
    if (category_id) {
      countQuery += ' AND a.asset_category_id = ?';
      countParams.push(category_id);
    }
    
    if (search) {
      countQuery += ' AND (a.asset_code LIKE ? OR a.brand LIKE ? OR a.model LIKE ? OR a.serial_number LIKE ?)';
      const searchTerm = `%${search}%`;
      countParams.push(searchTerm, searchTerm, searchTerm, searchTerm);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: assets,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// INVENTORY MANAGEMENT ROUTES
// Must come BEFORE /:id route to avoid conflicts
// ============================================

// Get inventory history
router.get('/inventory/history', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 20, asset_id, type, date_from, date_to } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT 
        t.*,
        i.asset_name,
        i.asset_code,
        u.name as user_name
      FROM inventory_transactions t
      LEFT JOIN inventory_items i ON t.inventory_item_id = i.id
      LEFT JOIN users u ON t.created_by = u.id
      WHERE 1=1
    `;
    
    const params = [];
    
    if (asset_id) {
      query += ' AND t.inventory_item_id = ?';
      params.push(asset_id);
    }
    
    if (type) {
      query += ' AND t.type = ?';
      params.push(type);
    }
    
    if (date_from) {
      query += ' AND DATE(t.created_at) >= ?';
      params.push(date_from);
    }
    
    if (date_to) {
      query += ' AND DATE(t.created_at) <= ?';
      params.push(date_to);
    }
    
    // Count total
    const countQuery = query.replace(/SELECT[\s\S]*?FROM/, 'SELECT COUNT(*) as total FROM');
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0].total;
    
    // Get paginated results
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [transactions] = await db.query(query, params);
    
    res.json({
      data: transactions,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching inventory history:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get low stock alerts
router.get('/inventory/low-stock', requireAdmin, async (req, res) => {
  try {
    const [items] = await db.query(`
      SELECT 
        i.*,
        ac.name as category_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      WHERE i.current_stock <= i.min_stock_level
      ORDER BY 
        CASE 
          WHEN i.current_stock = 0 THEN 1
          WHEN i.current_stock <= i.min_stock_level THEN 2
          ELSE 3
        END,
        i.current_stock ASC
    `);
    
    res.json({ data: items });
  } catch (error) {
    logger.error('Error fetching low stock alerts:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get inventory stats
router.get('/inventory/stats', requireAdmin, async (req, res) => {
  try {
    const [stats] = await db.query(`
      SELECT 
        COUNT(*) AS total_items,
        SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
        SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 ELSE 0 END) AS low_stock_count,
        SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) AS in_stock_count,
        SUM(current_stock * COALESCE(unit_price, 0)) AS total_value,
        SUM(current_stock) AS total_quantity
      FROM inventory_items
    `);
    
    res.json({ data: stats[0] });
  } catch (error) {
    logger.error('Error fetching inventory stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get inventory reports
router.get('/inventory/reports', requireAdmin, async (req, res) => {
  try {
    const { report_type = 'stock_levels', date_from, date_to, category_id } = req.query;
    
    let reportData = {};
    
    switch (report_type) {
      case 'stock_levels':
        let stockQuery = `
          SELECT 
            i.*,
            ac.name as category_name,
            (i.current_stock * COALESCE(i.unit_price, 0)) as total_value
          FROM inventory_items i
          LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
          WHERE 1=1
        `;
        const stockParams = [];
        
        if (category_id) {
          stockQuery += ' AND i.asset_category_id = ?';
          stockParams.push(category_id);
        }
        
        stockQuery += ' ORDER BY i.asset_name ASC';
        
        const [items] = await db.query(stockQuery, stockParams);
        
        const [summary] = await db.query(`
          SELECT 
            COUNT(*) AS total_items,
            SUM(CASE WHEN current_stock = 0 THEN 1 ELSE 0 END) AS out_of_stock_count,
            SUM(CASE WHEN current_stock > 0 AND current_stock <= min_stock_level THEN 1 ELSE 0 END) AS low_stock_count,
            SUM(CASE WHEN current_stock > min_stock_level THEN 1 ELSE 0 END) AS in_stock_count,
            SUM(current_stock * COALESCE(unit_price, 0)) AS total_value
          FROM inventory_items
        `);
        
        reportData = {
          items,
          ...summary[0]
        };
        break;
        
      case 'stock_movements':
        let movementQuery = `
          SELECT 
            t.*,
            i.asset_name,
            i.asset_code,
            u.name as user_name
          FROM inventory_transactions t
          LEFT JOIN inventory_items i ON t.inventory_item_id = i.id
          LEFT JOIN users u ON t.created_by = u.id
          WHERE 1=1
        `;
        const movementParams = [];
        
        if (date_from) {
          movementQuery += ' AND DATE(t.created_at) >= ?';
          movementParams.push(date_from);
        }
        
        if (date_to) {
          movementQuery += ' AND DATE(t.created_at) <= ?';
          movementParams.push(date_to);
        }
        
        movementQuery += ' ORDER BY t.created_at DESC';
        
        const [movements] = await db.query(movementQuery, movementParams);
        
        const totalAdditions = movements
          .filter(m => m.type === 'addition')
          .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);
        const totalReductions = movements
          .filter(m => m.type === 'reduction')
          .reduce((sum, m) => sum + Math.abs(m.quantity_change), 0);
        
        reportData = {
          movements,
          total_additions: totalAdditions,
          total_reductions: totalReductions,
          net_change: totalAdditions - totalReductions
        };
        break;
        
      case 'low_stock_analysis':
        let lowStockQuery = `
          SELECT 
            i.*,
            ac.name as category_name,
            (i.min_stock_level - i.current_stock) as deficit
          FROM inventory_items i
          LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
          WHERE i.current_stock <= i.min_stock_level
        `;
        const lowStockParams = [];
        
        if (category_id) {
          lowStockQuery += ' AND i.asset_category_id = ?';
          lowStockParams.push(category_id);
        }
        
        lowStockQuery += ' ORDER BY i.current_stock ASC';
        
        const [lowStockItems] = await db.query(lowStockQuery, lowStockParams);
        
        reportData = {
          low_stock_items: lowStockItems
        };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.json({ data: reportData });
  } catch (error) {
    logger.error('Error generating inventory report:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all inventory items
router.get('/inventory', requireAdmin, async (req, res) => {
  try {
    const { page = 1, limit = 10, category_id, search, low_stock } = req.query;
    const offset = (page - 1) * limit;
    
    // Build WHERE clause
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (category_id) {
      whereClause += ' AND i.asset_category_id = ?';
      params.push(category_id);
    }
    
    if (search) {
      whereClause += ' AND (i.asset_name LIKE ? OR i.asset_code LIKE ?)';
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm);
    }
    
    if (low_stock === 'true') {
      whereClause += ' AND i.current_stock <= i.min_stock_level';
    }
    
    // Count total
    const countQuery = `
      SELECT COUNT(*) as total
      FROM inventory_items i
      ${whereClause}
    `;
    const [countResult] = await db.query(countQuery, params);
    const total = countResult[0]?.total || 0;
    
    // Get paginated results
    const query = `
      SELECT 
        i.*,
        ac.name as category_name,
        u.name as created_by_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      LEFT JOIN users u ON i.created_by = u.id
      ${whereClause}
      ORDER BY i.asset_name ASC
      LIMIT ? OFFSET ?
    `;
    
    const queryParams = [...params, parseInt(limit), parseInt(offset)];
    const [items] = await db.query(query, queryParams);
    
    logger.debug('Inventory items query:', {
      total,
      itemsCount: items?.length || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });
    
    // Ensure items is an array
    const itemsArray = Array.isArray(items) ? items : [];
    
    res.json({
      data: itemsArray,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching inventory items:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ error: error.message || 'Failed to fetch inventory items' });
  }
});

// Get single inventory item
router.get('/inventory/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [items] = await db.query(`
      SELECT 
        i.*,
        ac.name as category_name,
        u.name as created_by_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      LEFT JOIN users u ON i.created_by = u.id
      WHERE i.id = ?
    `, [id]);
    
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    res.json({ data: items[0] });
  } catch (error) {
    logger.error('Error fetching inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create inventory item
router.post('/inventory', requireAdmin, async (req, res) => {
  try {
    const {
      asset_category_id,
      asset_name,
      asset_code,
      initial_stock = 0,
      min_stock_level,
      unit_price,
      location,
      notes
    } = req.body;
    
    if (!asset_category_id || !asset_name || min_stock_level === undefined) {
      return res.status(400).json({ error: 'Category, name, and minimum stock level are required' });
    }
    
    const userId = req.user?.id;
    
    // Generate code if not provided
    let finalCode = asset_code;
    if (!finalCode) {
      const [category] = await db.query('SELECT name FROM asset_categories WHERE id = ?', [asset_category_id]);
      const categoryPrefix = category[0]?.name?.substring(0, 3).toUpperCase() || 'INV';
      const [existing] = await db.query(
        'SELECT asset_code FROM inventory_items WHERE asset_code LIKE ? ORDER BY asset_code DESC LIMIT 1',
        [`${categoryPrefix}-%`]
      );
      
      let nextNum = 1;
      if (existing.length > 0) {
        const lastCode = existing[0].asset_code;
        const match = lastCode.match(/\d+$/);
        if (match) {
          nextNum = parseInt(match[0]) + 1;
        }
      }
      finalCode = `${categoryPrefix}-${String(nextNum).padStart(4, '0')}`;
    }
    
    const [result] = await db.query(`
      INSERT INTO inventory_items (
        asset_category_id, asset_name, asset_code, current_stock,
        min_stock_level, unit_price, location, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      asset_category_id, asset_name, finalCode, initial_stock,
      min_stock_level, unit_price || null, location || null, notes || null, userId
    ]);
    
    const itemId = result.insertId;
    
    // If initial stock > 0, create a transaction record
    if (initial_stock > 0) {
      await db.query(`
        INSERT INTO inventory_transactions (
          inventory_item_id, type, quantity_change, previous_stock, new_stock,
          reason, notes, created_by
        ) VALUES (?, 'addition', ?, 0, ?, 'purchase', 'Initial stock', ?)
      `, [itemId, initial_stock, initial_stock, userId]);
    }
    
    const [newItem] = await db.query(`
      SELECT 
        i.*,
        ac.name as category_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      WHERE i.id = ?
    `, [itemId]);
    
    res.status(201).json({
      data: newItem[0],
      message: 'Inventory item created successfully'
    });
  } catch (error) {
    logger.error('Error creating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update inventory item
router.put('/inventory/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      asset_category_id,
      asset_name,
      asset_code,
      min_stock_level,
      unit_price,
      location,
      notes
    } = req.body;
    
    // Check if item exists
    const [existing] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    await db.query(`
      UPDATE inventory_items SET
        asset_category_id = ?,
        asset_name = ?,
        asset_code = ?,
        min_stock_level = ?,
        unit_price = ?,
        location = ?,
        notes = ?
      WHERE id = ?
    `, [
      asset_category_id, asset_name, asset_code, min_stock_level,
      unit_price || null, location || null, notes || null, id
    ]);
    
    const [updated] = await db.query(`
      SELECT 
        i.*,
        ac.name as category_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      WHERE i.id = ?
    `, [id]);
    
    res.json({
      data: updated[0],
      message: 'Inventory item updated successfully'
    });
  } catch (error) {
    logger.error('Error updating inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete inventory item
router.delete('/inventory/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [existing] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (existing.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    await db.query('DELETE FROM inventory_items WHERE id = ?', [id]);
    
    res.json({ message: 'Inventory item deleted successfully' });
  } catch (error) {
    logger.error('Error deleting inventory item:', error);
    res.status(500).json({ error: error.message });
  }
});

// Adjust stock
router.post('/inventory/:id/adjust', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reason, notes } = req.body;
    
    if (!quantity || !reason) {
      return res.status(400).json({ error: 'Quantity and reason are required' });
    }
    
    // Get current item
    const [items] = await db.query('SELECT * FROM inventory_items WHERE id = ?', [id]);
    if (items.length === 0) {
      return res.status(404).json({ error: 'Inventory item not found' });
    }
    
    const item = items[0];
    const previousStock = item.current_stock;
    const newStock = previousStock + parseInt(quantity);
    
    if (newStock < 0) {
      return res.status(400).json({ error: 'Stock cannot be negative' });
    }
    
    const userId = req.user?.id;
    const transactionType = quantity > 0 ? 'addition' : 'reduction';
    
    // Update stock
    await db.query(
      'UPDATE inventory_items SET current_stock = ? WHERE id = ?',
      [newStock, id]
    );
    
    // Create transaction record
    await db.query(`
      INSERT INTO inventory_transactions (
        inventory_item_id, type, quantity_change, previous_stock, new_stock,
        reason, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [id, transactionType, parseInt(quantity), previousStock, newStock, reason, notes || null, userId]);
    
    const [updated] = await db.query(`
      SELECT 
        i.*,
        ac.name as category_name
      FROM inventory_items i
      LEFT JOIN asset_categories ac ON i.asset_category_id = ac.id
      WHERE i.id = ?
    `, [id]);
    
    res.json({
      data: updated[0],
      message: 'Stock adjusted successfully'
    });
  } catch (error) {
    logger.error('Error adjusting stock:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// END OF INVENTORY ROUTES
// ============================================

// ============================================
// ASSET MAINTENANCE
// Must come BEFORE /:id route to avoid conflicts
// ============================================

// Get all maintenance records
router.get('/maintenance', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, asset_id, maintenance_type } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let query = `
      SELECT 
        m.*,
        a.asset_code, a.brand, a.model,
        ac.name as category_name,
        u.name as created_by_name,
        t.ticket_number
      FROM asset_maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN asset_tickets t ON m.ticket_id = t.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not admin, show only maintenance for assigned assets
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ` AND m.asset_id IN (
          SELECT asset_id FROM asset_assignments WHERE employee_id = ? AND status = 'active'
        )`;
        params.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      query += ' AND m.status = ?';
      params.push(status);
    }
    
    if (asset_id) {
      query += ' AND m.asset_id = ?';
      params.push(asset_id);
    }
    
    if (maintenance_type) {
      query += ' AND m.maintenance_type = ?';
      params.push(maintenance_type);
    }
    
    query += ' ORDER BY m.start_date DESC, m.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [maintenance] = await db.query(query, params);
    
    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM asset_maintenance m WHERE 1=1';
    const countParams = [];
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        countQuery += ` AND m.asset_id IN (
          SELECT asset_id FROM asset_assignments WHERE employee_id = ? AND status = 'active'
        )`;
        countParams.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      countQuery += ' AND m.status = ?';
      countParams.push(status);
    }
    
    if (asset_id) {
      countQuery += ' AND m.asset_id = ?';
      countParams.push(asset_id);
    }
    
    if (maintenance_type) {
      countQuery += ' AND m.maintenance_type = ?';
      countParams.push(maintenance_type);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: maintenance,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching maintenance records:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single maintenance record
router.get('/maintenance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    const [maintenance] = await db.query(`
      SELECT 
        m.*,
        a.asset_code, a.brand, a.model, a.serial_number,
        ac.name as category_name,
        u.name as created_by_name,
        t.ticket_number, t.subject as ticket_subject
      FROM asset_maintenance m
      LEFT JOIN assets a ON m.asset_id = a.id
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      LEFT JOIN users u ON m.created_by = u.id
      LEFT JOIN asset_tickets t ON m.ticket_id = t.id
      WHERE m.id = ?
    `, [id]);
    
    if (maintenance.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    // Check access for non-admins
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        const [assignment] = await db.query(
          'SELECT * FROM asset_assignments WHERE asset_id = ? AND employee_id = ? AND status = "active"',
          [maintenance[0].asset_id, employee[0].id]
        );
        if (assignment.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ data: maintenance[0] });
  } catch (error) {
    logger.error('Error fetching maintenance record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create maintenance record (Admin only)
router.post('/maintenance', requireAdmin, async (req, res) => {
  try {
    const {
      asset_id,
      ticket_id,
      maintenance_type,
      vendor_name,
      vendor_contact,
      cost,
      start_date,
      end_date,
      status,
      description,
      notes
    } = req.body;
    
    if (!asset_id || !maintenance_type || !start_date) {
      return res.status(400).json({ error: 'Asset ID, maintenance type, and start date are required' });
    }
    
    const userId = req.user?.id;
    
    // Check if asset exists
    const [assets] = await db.query('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    // Create maintenance record
    const [result] = await db.query(`
      INSERT INTO asset_maintenance (
        asset_id, ticket_id, maintenance_type, vendor_name, vendor_contact,
        cost, start_date, end_date, status, description, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      asset_id, ticket_id || null, maintenance_type, vendor_name || null, vendor_contact || null,
      cost || null, start_date, end_date || null, status || 'scheduled', description || null, notes || null, userId
    ]);
    
    // Update asset status if maintenance type is repair
    if (maintenance_type === 'repair' && status === 'in_progress') {
      await db.query('UPDATE assets SET status = "repair" WHERE id = ?', [asset_id]);
    }
    
    // Log audit
    logCreate('asset_maintenance', result.insertId, userId, {
      asset_id,
      maintenance_type,
      status: status || 'scheduled'
    });
    
    res.status(201).json({
      data: { id: result.insertId },
      message: 'Maintenance record created successfully'
    });
  } catch (error) {
    logger.error('Error creating maintenance record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update maintenance record (Admin only)
router.put('/maintenance/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if maintenance record exists
    const [maintenance] = await db.query('SELECT * FROM asset_maintenance WHERE id = ?', [id]);
    if (maintenance.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    const oldMaintenance = maintenance[0];
    
    const {
      maintenance_type,
      vendor_name,
      vendor_contact,
      cost,
      start_date,
      end_date,
      status,
      description,
      notes
    } = req.body;
    
    // Update maintenance record
    await db.query(`
      UPDATE asset_maintenance SET
        maintenance_type = ?,
        vendor_name = ?,
        vendor_contact = ?,
        cost = ?,
        start_date = ?,
        end_date = ?,
        status = ?,
        description = ?,
        notes = ?
      WHERE id = ?
    `, [
      maintenance_type || oldMaintenance.maintenance_type,
      vendor_name !== undefined ? vendor_name : oldMaintenance.vendor_name,
      vendor_contact !== undefined ? vendor_contact : oldMaintenance.vendor_contact,
      cost !== undefined ? cost : oldMaintenance.cost,
      start_date || oldMaintenance.start_date,
      end_date !== undefined ? end_date : oldMaintenance.end_date,
      status || oldMaintenance.status,
      description !== undefined ? description : oldMaintenance.description,
      notes !== undefined ? notes : oldMaintenance.notes,
      id
    ]);
    
    // Update asset status based on maintenance status
    if (status === 'completed' && oldMaintenance.maintenance_type === 'repair') {
      // Check if asset should be available or assigned
      const [assignments] = await db.query(
        'SELECT * FROM asset_assignments WHERE asset_id = ? AND status = "active"',
        [oldMaintenance.asset_id]
      );
      const newStatus = assignments.length > 0 ? 'assigned' : 'available';
      await db.query('UPDATE assets SET status = ? WHERE id = ?', [newStatus, oldMaintenance.asset_id]);
    } else if (status === 'in_progress' && oldMaintenance.maintenance_type === 'repair') {
      await db.query('UPDATE assets SET status = "repair" WHERE id = ?', [oldMaintenance.asset_id]);
    }
    
    // Log audit
    logUpdate('asset_maintenance', id, userId, {
      old_status: oldMaintenance.status,
      new_status: status || oldMaintenance.status
    });
    
    res.json({ message: 'Maintenance record updated successfully' });
  } catch (error) {
    logger.error('Error updating maintenance record:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete maintenance record (Admin only)
router.delete('/maintenance/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if maintenance record exists
    const [maintenance] = await db.query('SELECT * FROM asset_maintenance WHERE id = ?', [id]);
    if (maintenance.length === 0) {
      return res.status(404).json({ error: 'Maintenance record not found' });
    }
    
    const maintenanceRecord = maintenance[0];
    
    // Don't allow deletion of in-progress maintenance
    if (maintenanceRecord.status === 'in_progress') {
      return res.status(400).json({ error: 'Cannot delete maintenance record that is in progress' });
    }
    
    // Log before deletion
    logDelete('asset_maintenance', id, userId, {
      asset_id: maintenanceRecord.asset_id,
      maintenance_type: maintenanceRecord.maintenance_type
    });
    
    // Delete maintenance record
    await db.query('DELETE FROM asset_maintenance WHERE id = ?', [id]);
    
    res.json({ message: 'Maintenance record deleted successfully' });
  } catch (error) {
    logger.error('Error deleting maintenance record:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSET APPROVALS
// Must come BEFORE /:id route to avoid conflicts
// ============================================

// Get all approvals
router.get('/approvals', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, request_type } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let query = `
      SELECT 
        ap.*,
        a.asset_code, a.brand, a.model,
        u1.name as requested_by_name,
        u2.name as approver_name,
        aa.employee_id,
        e.emp_code,
        u3.name as employee_name
      FROM asset_approvals ap
      LEFT JOIN assets a ON ap.asset_id = a.id
      LEFT JOIN users u1 ON ap.requested_by = u1.id
      LEFT JOIN users u2 ON ap.approver_id = u2.id
      LEFT JOIN asset_assignments aa ON ap.assignment_id = aa.id
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u3 ON e.user_id = u3.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not admin, show only own requests or pending approvals assigned to user
    if (!isAdmin) {
      query += ' AND (ap.requested_by = ? OR (ap.approver_id = ? AND ap.status = "pending"))';
      params.push(userId, userId);
    }
    
    if (status) {
      query += ' AND ap.status = ?';
      params.push(status);
    }
    
    if (request_type) {
      query += ' AND ap.request_type = ?';
      params.push(request_type);
    }
    
    query += ' ORDER BY ap.requested_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [approvals] = await db.query(query, params);
    
    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM asset_approvals ap WHERE 1=1';
    const countParams = [];
    
    if (!isAdmin) {
      countQuery += ' AND (ap.requested_by = ? OR (ap.approver_id = ? AND ap.status = "pending"))';
      countParams.push(userId, userId);
    }
    
    if (status) {
      countQuery += ' AND ap.status = ?';
      countParams.push(status);
    }
    
    if (request_type) {
      countQuery += ' AND ap.request_type = ?';
      countParams.push(request_type);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: approvals,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching approvals:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create approval request
router.post('/approvals', async (req, res) => {
  try {
    const {
      request_type,
      asset_id,
      assignment_id,
      maintenance_id,
      ticket_id,
      comments
    } = req.body;
    
    if (!request_type) {
      return res.status(400).json({ error: 'Request type is required' });
    }
    
    const userId = req.user?.id;
    
    // Create approval request
    const [result] = await db.query(`
      INSERT INTO asset_approvals (
        request_type, asset_id, assignment_id, maintenance_id, ticket_id,
        requested_by, status, comments
      ) VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    `, [
      request_type, asset_id || null, assignment_id || null, maintenance_id || null, ticket_id || null,
      userId, comments || null
    ]);
    
    // Log audit
    logCreate('asset_approvals', result.insertId, userId, {
      request_type,
      status: 'pending'
    });
    
    res.status(201).json({
      data: { id: result.insertId },
      message: 'Approval request created successfully'
    });
  } catch (error) {
    logger.error('Error creating approval request:', error);
    res.status(500).json({ error: error.message });
  }
});

// Approve/Reject approval request (Admin only)
router.put('/approvals/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, comments, rejection_reason } = req.body;
    const userId = req.user?.id;
    
    if (!status || !['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Valid status (approved/rejected) is required' });
    }
    
    // Get approval request
    const [approvals] = await db.query('SELECT * FROM asset_approvals WHERE id = ?', [id]);
    if (approvals.length === 0) {
      return res.status(404).json({ error: 'Approval request not found' });
    }
    
    const approval = approvals[0];
    
    if (approval.status !== 'pending') {
      return res.status(400).json({ error: 'Approval request is not pending' });
    }
    
    // Update approval
    await db.query(`
      UPDATE asset_approvals SET
        status = ?,
        approver_id = ?,
        approved_at = NOW(),
        comments = ?,
        rejection_reason = ?
      WHERE id = ?
    `, [status, userId, comments || null, rejection_reason || null, id]);
    
    // If approved, process the request based on type
    if (status === 'approved') {
      if (approval.request_type === 'assignment' && approval.assignment_id) {
        // Auto-approve assignment if needed
        const [assignments] = await db.query('SELECT * FROM asset_assignments WHERE id = ?', [approval.assignment_id]);
        if (assignments.length > 0 && assignments[0].status === 'pending') {
          await db.query('UPDATE asset_assignments SET status = "active" WHERE id = ?', [approval.assignment_id]);
          await db.query('UPDATE assets SET status = "assigned" WHERE id = ?', [assignments[0].asset_id]);
        }
      } else if (approval.request_type === 'return' && approval.assignment_id) {
        // Process return
        const [assignments] = await db.query('SELECT * FROM asset_assignments WHERE id = ?', [approval.assignment_id]);
        if (assignments.length > 0) {
          await db.query(`
            UPDATE asset_assignments SET
              status = 'returned',
              returned_date = CURDATE(),
              returned_to = ?
            WHERE id = ?
          `, [userId, approval.assignment_id]);
          await db.query('UPDATE assets SET status = "available" WHERE id = ?', [assignments[0].asset_id]);
        }
      }
    }
    
    // Log audit
    logUpdate('asset_approvals', id, userId, {
      old_status: 'pending',
      new_status: status
    });
    
    res.json({ message: `Approval request ${status} successfully` });
  } catch (error) {
    logger.error('Error updating approval request:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSET REPORTS
// Must come BEFORE /:id route to avoid conflicts
// ============================================

// Get asset reports
router.get('/reports', async (req, res) => {
  try {
    const { report_type, date_from, date_to, category_id } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    if (!report_type) {
      return res.status(400).json({ error: 'Report type is required' });
    }
    
    let reportData = {};
    
    switch (report_type) {
      case 'asset_summary':
        // Asset summary by status
        const [statusSummary] = await db.query(`
          SELECT status, COUNT(*) as count
          FROM assets
          GROUP BY status
        `);
        reportData = { status_summary: statusSummary };
        break;
        
      case 'category_distribution':
        // Assets by category
        const [categoryDist] = await db.query(`
          SELECT ac.name as category, COUNT(*) as count
          FROM assets a
          LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
          GROUP BY ac.name
          ORDER BY count DESC
        `);
        reportData = { category_distribution: categoryDist };
        break;
        
      case 'assignment_history':
        // Assignment history
        let assignmentQuery = `
          SELECT 
            DATE(aa.assigned_date) as date,
            COUNT(*) as assignments,
            COUNT(CASE WHEN aa.status = 'active' THEN 1 END) as active,
            COUNT(CASE WHEN aa.status = 'returned' THEN 1 END) as returned
          FROM asset_assignments aa
          WHERE 1=1
        `;
        const assignParams = [];
        
        if (date_from) {
          assignmentQuery += ' AND aa.assigned_date >= ?';
          assignParams.push(date_from);
        }
        if (date_to) {
          assignmentQuery += ' AND aa.assigned_date <= ?';
          assignParams.push(date_to);
        }
        
        assignmentQuery += ' GROUP BY DATE(aa.assigned_date) ORDER BY date DESC LIMIT 30';
        const [assignmentHistory] = await db.query(assignmentQuery, assignParams);
        reportData = { assignment_history: assignmentHistory };
        break;
        
      case 'maintenance_summary':
        // Maintenance summary
        const [maintenanceSummary] = await db.query(`
          SELECT 
            maintenance_type,
            status,
            COUNT(*) as count,
            SUM(cost) as total_cost
          FROM asset_maintenance
          GROUP BY maintenance_type, status
        `);
        reportData = { maintenance_summary: maintenanceSummary };
        break;
        
      case 'warranty_expiry':
        // Warranty expiry report
        const [warrantyExpiry] = await db.query(`
          SELECT 
            asset_code, brand, model, warranty_expiry,
            DATEDIFF(warranty_expiry, CURDATE()) as days_remaining
          FROM assets
          WHERE warranty_expiry IS NOT NULL
            AND warranty_expiry >= CURDATE()
          ORDER BY warranty_expiry ASC
          LIMIT 50
        `);
        reportData = { warranty_expiry: warrantyExpiry };
        break;
        
      case 'cost_analysis':
        // Cost analysis
        const [costAnalysis] = await db.query(`
          SELECT 
            DATE_FORMAT(purchase_date, '%Y-%m') as month,
            COUNT(*) as assets_purchased,
            SUM(purchase_price) as total_cost,
            AVG(purchase_price) as avg_cost
          FROM assets
          WHERE purchase_date IS NOT NULL
          GROUP BY DATE_FORMAT(purchase_date, '%Y-%m')
          ORDER BY month DESC
          LIMIT 12
        `);
        reportData = { cost_analysis: costAnalysis };
        break;
        
      default:
        return res.status(400).json({ error: 'Invalid report type' });
    }
    
    res.json({ data: reportData });
  } catch (error) {
    logger.error('Error generating report:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSET SETTINGS
// Must come BEFORE /:id route to avoid conflicts
// ============================================

// Get all settings
router.get('/settings', requireAdmin, async (req, res) => {
  try {
    const { category } = req.query;
    
    let query = 'SELECT * FROM asset_settings WHERE 1=1';
    const params = [];
    
    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    
    query += ' ORDER BY category, setting_key';
    
    const [settings] = await db.query(query, params);
    
    res.json({ data: settings });
  } catch (error) {
    logger.error('Error fetching settings:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single setting
router.get('/settings/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    
    const [settings] = await db.query('SELECT * FROM asset_settings WHERE setting_key = ?', [key]);
    
    if (settings.length === 0) {
      return res.status(404).json({ error: 'Setting not found' });
    }
    
    res.json({ data: settings[0] });
  } catch (error) {
    logger.error('Error fetching setting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update setting (Admin only)
router.put('/settings/:key', requireAdmin, async (req, res) => {
  try {
    const { key } = req.params;
    const { setting_value, description } = req.body;
    const userId = req.user?.id;
    
    if (setting_value === undefined) {
      return res.status(400).json({ error: 'Setting value is required' });
    }
    
    // Check if setting exists
    const [settings] = await db.query('SELECT * FROM asset_settings WHERE setting_key = ?', [key]);
    
    if (settings.length === 0) {
      // Create new setting
      const [result] = await db.query(`
        INSERT INTO asset_settings (setting_key, setting_value, description, updated_by)
        VALUES (?, ?, ?, ?)
      `, [key, setting_value, description || null, userId]);
      
      res.status(201).json({
        data: { id: result.insertId },
        message: 'Setting created successfully'
      });
    } else {
      // Update existing setting
      await db.query(`
        UPDATE asset_settings SET
          setting_value = ?,
          description = ?,
          updated_by = ?
        WHERE setting_key = ?
      `, [setting_value, description || settings[0].description, userId, key]);
      
      res.json({ message: 'Setting updated successfully' });
    }
  } catch (error) {
    logger.error('Error updating setting:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single asset by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    const [assets] = await db.query(`
      SELECT 
        a.*,
        ac.name as category_name,
        u.name as created_by_name
      FROM assets a
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      LEFT JOIN users u ON a.created_by = u.id
      WHERE a.id = ?
    `, [id]);
    
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const asset = assets[0];
    
    // Check if non-admin user has access to this asset
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        const [assignment] = await db.query(
          'SELECT * FROM asset_assignments WHERE asset_id = ? AND employee_id = ?',
          [id, employee[0].id]
        );
        if (assignment.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Get device-specific details
    const categoryName = asset.category_name?.toLowerCase() || '';
    
    if (categoryName.includes('laptop')) {
      const [laptop] = await db.query('SELECT * FROM asset_laptop_details WHERE asset_id = ?', [id]);
      asset.laptop_details = laptop[0] || null;
    } else if (categoryName.includes('mobile')) {
      const [mobile] = await db.query('SELECT * FROM asset_mobile_details WHERE asset_id = ?', [id]);
      asset.mobile_details = mobile[0] || null;
    } else {
      const [accessory] = await db.query('SELECT * FROM asset_accessory_details WHERE asset_id = ?', [id]);
      asset.accessory_details = accessory[0] || null;
    }
    
    // Get assignment history
    const [assignments] = await db.query(`
      SELECT 
        aa.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as assigned_by_name,
        u3.name as returned_to_name
      FROM asset_assignments aa
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON aa.assigned_by = u2.id
      LEFT JOIN users u3 ON aa.returned_to = u3.id
      WHERE aa.asset_id = ?
      ORDER BY aa.assigned_date DESC
    `, [id]);
    
    asset.assignments = assignments;
    
    res.json({ data: asset });
  } catch (error) {
    logger.error('Error fetching asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create asset and auto-assign to employee (for employees to add their holding devices)
router.post('/employee/create', authenticate, async (req, res) => {
  try {
    const {
      asset_category_id,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_price,
      warranty_expiry,
      vendor_name,
      vendor_contact,
      location,
      notes,
      // Device-specific fields
      laptop_details,
      mobile_details,
      accessory_details
    } = req.body;
    
    if (!asset_category_id) {
      return res.status(400).json({ error: 'Asset category is required' });
    }
    
    const userId = req.user?.id;
    
    // Get employee ID for the current user
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee record not found. Please ensure your user account is linked to an employee record.' });
    }
    const employeeId = employees[0].id;
    
    // Generate asset code
    const asset_code = await generateAssetCode(asset_category_id);
    
    // Insert asset
    const [result] = await db.query(`
      INSERT INTO assets (
        asset_code, asset_category_id, brand, model, serial_number,
        purchase_date, purchase_price, warranty_expiry, vendor_name,
        vendor_contact, location, notes, created_by, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'assigned')
    `, [
      asset_code, asset_category_id, brand, model, serial_number,
      purchase_date, purchase_price, warranty_expiry, vendor_name,
      vendor_contact, location, notes, userId
    ]);
    
    const assetId = result.insertId;
    
    // Insert device-specific details
    const categoryName = req.body.category_name?.toLowerCase() || '';
    const [category] = await db.query('SELECT name FROM asset_categories WHERE id = ?', [asset_category_id]);
    const actualCategoryName = category[0]?.name?.toLowerCase() || '';
    
    if (actualCategoryName.includes('laptop') && laptop_details) {
      await db.query(`
        INSERT INTO asset_laptop_details (
          asset_id, os_type, mac_address, processor, ram_gb,
          storage_gb, storage_type, screen_size, graphics_card
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assetId,
        laptop_details.os_type,
        laptop_details.mac_address,
        laptop_details.processor,
        laptop_details.ram_gb,
        laptop_details.storage_gb,
        laptop_details.storage_type,
        laptop_details.screen_size,
        laptop_details.graphics_card
      ]);
    } else if (actualCategoryName.includes('mobile') && mobile_details) {
      await db.query(`
        INSERT INTO asset_mobile_details (
          asset_id, device_type, imei_1, imei_2, storage_gb,
          screen_size, battery_capacity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        assetId,
        mobile_details.device_type,
        mobile_details.imei_1,
        mobile_details.imei_2,
        mobile_details.storage_gb,
        mobile_details.screen_size,
        mobile_details.battery_capacity
      ]);
    } else if (accessory_details) {
      await db.query(`
        INSERT INTO asset_accessory_details (
          asset_id, specification, compatibility
        ) VALUES (?, ?, ?)
      `, [
        assetId,
        accessory_details.specification,
        accessory_details.compatibility
      ]);
    }
    
    // Auto-assign to the current employee
    const assignedDate = new Date().toISOString().split('T')[0];
    await db.query(`
      INSERT INTO asset_assignments (
        asset_id, employee_id, assigned_date, condition_on_assign,
        status, assigned_by, notes
      ) VALUES (?, ?, ?, 'good', 'active', ?, ?)
    `, [assetId, employeeId, assignedDate, userId, notes || 'Auto-assigned when device was added by employee']);
    
    // Log audit
    await db.query(`
      INSERT INTO asset_audit_logs (
        asset_id, action, performed_by, remarks, ip_address, user_agent
      ) VALUES (?, 'created', ?, ?, ?, ?)
    `, [assetId, userId, `Asset created and auto-assigned to employee ID: ${employeeId}`, getClientIp(req), getUserAgent(req)]);
    
    res.status(201).json({
      data: { id: assetId, asset_code },
      message: 'Device added and assigned to you successfully'
    });
  } catch (error) {
    logger.error('Error creating employee asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create asset (Admin only)
router.post('/', requireAdmin, async (req, res) => {
  try {
    const {
      asset_category_id,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_price,
      warranty_expiry,
      vendor_name,
      vendor_contact,
      location,
      notes,
      // Device-specific fields
      laptop_details,
      mobile_details,
      accessory_details
    } = req.body;
    
    if (!asset_category_id) {
      return res.status(400).json({ error: 'Asset category is required' });
    }
    
    const userId = req.user?.id;
    
    // Generate asset code
    const asset_code = await generateAssetCode(asset_category_id);
    
    // Insert asset
    const [result] = await db.query(`
      INSERT INTO assets (
        asset_code, asset_category_id, brand, model, serial_number,
        purchase_date, purchase_price, warranty_expiry, vendor_name,
        vendor_contact, location, notes, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      asset_code, asset_category_id, brand, model, serial_number,
      purchase_date, purchase_price, warranty_expiry, vendor_name,
      vendor_contact, location, notes, userId
    ]);
    
    const assetId = result.insertId;
    
    // Insert device-specific details
    const categoryName = req.body.category_name?.toLowerCase() || '';
    const [category] = await db.query('SELECT name FROM asset_categories WHERE id = ?', [asset_category_id]);
    const actualCategoryName = category[0]?.name?.toLowerCase() || '';
    
    if (actualCategoryName.includes('laptop') && laptop_details) {
      await db.query(`
        INSERT INTO asset_laptop_details (
          asset_id, os_type, mac_address, processor, ram_gb,
          storage_gb, storage_type, screen_size, graphics_card
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        assetId,
        laptop_details.os_type,
        laptop_details.mac_address,
        laptop_details.processor,
        laptop_details.ram_gb,
        laptop_details.storage_gb,
        laptop_details.storage_type,
        laptop_details.screen_size,
        laptop_details.graphics_card
      ]);
    } else if (actualCategoryName.includes('mobile') && mobile_details) {
      await db.query(`
        INSERT INTO asset_mobile_details (
          asset_id, device_type, imei_1, imei_2, storage_gb,
          screen_size, battery_capacity
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `, [
        assetId,
        mobile_details.device_type,
        mobile_details.imei_1,
        mobile_details.imei_2,
        mobile_details.storage_gb,
        mobile_details.screen_size,
        mobile_details.battery_capacity
      ]);
    } else if (accessory_details) {
      await db.query(`
        INSERT INTO asset_accessory_details (
          asset_id, specification, compatibility
        ) VALUES (?, ?, ?)
      `, [
        assetId,
        accessory_details.specification,
        accessory_details.compatibility
      ]);
    }
    
    // Log audit
    await db.query(`
      INSERT INTO asset_audit_logs (
        asset_id, action, performed_by, remarks, ip_address, user_agent
      ) VALUES (?, 'created', ?, ?, ?, ?)
    `, [assetId, userId, 'Asset created', getClientIp(req), getUserAgent(req)]);
    
    res.status(201).json({
      data: { id: assetId, asset_code },
      message: 'Asset created successfully'
    });
  } catch (error) {
    logger.error('Error creating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update asset (Admin only)
router.put('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if asset exists
    const [assets] = await db.query('SELECT * FROM assets WHERE id = ?', [id]);
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const oldAsset = assets[0];
    
    const {
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_price,
      warranty_expiry,
      vendor_name,
      vendor_contact,
      location,
      notes,
      status,
      laptop_details,
      mobile_details,
      accessory_details
    } = req.body;
    
    // Update asset
    await db.query(`
      UPDATE assets SET
        brand = ?, model = ?, serial_number = ?,
        purchase_date = ?, purchase_price = ?, warranty_expiry = ?,
        vendor_name = ?, vendor_contact = ?, location = ?,
        notes = ?, status = ?
      WHERE id = ?
    `, [
      brand, model, serial_number,
      purchase_date, purchase_price, warranty_expiry,
      vendor_name, vendor_contact, location,
      notes, status || oldAsset.status,
      id
    ]);
    
    // Update device-specific details
    const [category] = await db.query('SELECT name FROM asset_categories WHERE id = ?', [oldAsset.asset_category_id]);
    const categoryName = category[0]?.name?.toLowerCase() || '';
    
    if (categoryName.includes('laptop') && laptop_details) {
      await db.query(`
        UPDATE asset_laptop_details SET
          os_type = ?, mac_address = ?, processor = ?,
          ram_gb = ?, storage_gb = ?, storage_type = ?,
          screen_size = ?, graphics_card = ?
        WHERE asset_id = ?
      `, [
        laptop_details.os_type,
        laptop_details.mac_address,
        laptop_details.processor,
        laptop_details.ram_gb,
        laptop_details.storage_gb,
        laptop_details.storage_type,
        laptop_details.screen_size,
        laptop_details.graphics_card,
        id
      ]);
    } else if (categoryName.includes('mobile') && mobile_details) {
      await db.query(`
        UPDATE asset_mobile_details SET
          device_type = ?, imei_1 = ?, imei_2 = ?,
          storage_gb = ?, screen_size = ?, battery_capacity = ?
        WHERE asset_id = ?
      `, [
        mobile_details.device_type,
        mobile_details.imei_1,
        mobile_details.imei_2,
        mobile_details.storage_gb,
        mobile_details.screen_size,
        mobile_details.battery_capacity,
        id
      ]);
    } else if (accessory_details) {
      await db.query(`
        UPDATE asset_accessory_details SET
          specification = ?, compatibility = ?
        WHERE asset_id = ?
      `, [
        accessory_details.specification,
        accessory_details.compatibility,
        id
      ]);
    }
    
    // Log audit
    const statusChanged = status && status !== oldAsset.status;
    await db.query(`
      INSERT INTO asset_audit_logs (
        asset_id, action, performed_by, old_value, new_value,
        remarks, ip_address, user_agent
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      statusChanged ? 'status_changed' : 'updated',
      userId,
      JSON.stringify(oldAsset),
      JSON.stringify({ ...oldAsset, ...req.body }),
      statusChanged ? `Status changed from ${oldAsset.status} to ${status}` : 'Asset updated',
      getClientIp(req),
      getUserAgent(req)
    ]);
    
    res.json({ message: 'Asset updated successfully' });
  } catch (error) {
    logger.error('Error updating asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete asset (Admin only)
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    
    // Check if asset exists
    const [assets] = await db.query('SELECT * FROM assets WHERE id = ?', [id]);
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const asset = assets[0];
    
    // Check if asset is assigned
    const [assignments] = await db.query(
      'SELECT * FROM asset_assignments WHERE asset_id = ? AND status = "active"',
      [id]
    );
    if (assignments.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete asset. Asset is currently assigned to an employee. Please return it first.' 
      });
    }
    
    // Check if asset has pending maintenance
    const [maintenance] = await db.query(
      'SELECT * FROM asset_maintenance WHERE asset_id = ? AND status IN ("scheduled", "in_progress")',
      [id]
    );
    if (maintenance.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete asset. Asset has pending maintenance records.' 
      });
    }
    
    // Log before deletion
    logDelete('assets', id, userId, {
      asset_code: asset.asset_code,
      brand: asset.brand,
      model: asset.model
    });
    
    // Delete asset (cascade will handle related records)
    await db.query('DELETE FROM assets WHERE id = ?', [id]);
    
    res.json({ message: 'Asset deleted successfully' });
  } catch (error) {
    logger.error('Error deleting asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSET ASSIGNMENTS
// ============================================

// Get all assignments
router.get('/assignments/list', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, employee_id } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let query = `
      SELECT 
        aa.*,
        a.asset_code, a.brand, a.model, a.serial_number,
        ac.name as category_name,
        e.emp_code,
        u.name as employee_name,
        u2.name as assigned_by_name,
        u3.name as returned_to_name
      FROM asset_assignments aa
      LEFT JOIN assets a ON aa.asset_id = a.id
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON aa.assigned_by = u2.id
      LEFT JOIN users u3 ON aa.returned_to = u3.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // If not admin, show only own assignments
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ' AND aa.employee_id = ?';
        params.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    } else if (employee_id) {
      query += ' AND aa.employee_id = ?';
      params.push(employee_id);
    }
    
    if (status) {
      query += ' AND aa.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY aa.assigned_date DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [assignments] = await db.query(query, params);
    
    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM asset_assignments aa WHERE 1=1';
    const countParams = [];
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        countQuery += ' AND aa.employee_id = ?';
        countParams.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    } else if (employee_id) {
      countQuery += ' AND aa.employee_id = ?';
      countParams.push(employee_id);
    }
    
    if (status) {
      countQuery += ' AND aa.status = ?';
      countParams.push(status);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: assignments,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching assignments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Assign asset to employee (Admin only)
router.post('/assign', requireAdmin, async (req, res) => {
  try {
    const { asset_id, employee_id, assigned_date, condition_on_assign, notes } = req.body;
    
    if (!asset_id || !employee_id || !assigned_date) {
      return res.status(400).json({ error: 'Asset ID, Employee ID, and Assigned Date are required' });
    }
    
    const userId = req.user?.id;
    
    // Check if asset exists and is available
    const [assets] = await db.query('SELECT * FROM assets WHERE id = ?', [asset_id]);
    if (assets.length === 0) {
      return res.status(404).json({ error: 'Asset not found' });
    }
    
    const asset = assets[0];
    if (asset.status !== 'available') {
      return res.status(400).json({ error: `Asset is not available. Current status: ${asset.status}` });
    }
    
    // Check if employee exists
    const [employees] = await db.query('SELECT * FROM employees WHERE id = ?', [employee_id]);
    if (employees.length === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    
    // Check for active assignment
    const [existing] = await db.query(
      'SELECT * FROM asset_assignments WHERE asset_id = ? AND status = "active"',
      [asset_id]
    );
    if (existing.length > 0) {
      return res.status(400).json({ error: 'Asset is already assigned to another employee' });
    }
    
    // Create assignment
    const [result] = await db.query(`
      INSERT INTO asset_assignments (
        asset_id, employee_id, assigned_date, condition_on_assign,
        status, assigned_by, notes
      ) VALUES (?, ?, ?, ?, 'active', ?, ?)
    `, [asset_id, employee_id, assigned_date, condition_on_assign || 'good', userId, notes]);
    
    // Update asset status
    await db.query('UPDATE assets SET status = "assigned" WHERE id = ?', [asset_id]);
    
    // Reduce inventory quantity if asset category exists in inventory
    try {
      const [inventoryItems] = await db.query(
        'SELECT id, current_stock FROM inventory_items WHERE asset_category_id = ? AND current_stock > 0 LIMIT 1',
        [asset.asset_category_id]
      );
      
      if (inventoryItems.length > 0) {
        const inventoryItem = inventoryItems[0];
        const newStock = Math.max(0, inventoryItem.current_stock - 1);
        
        // Update inventory stock
        await db.query(
          'UPDATE inventory_items SET current_stock = ? WHERE id = ?',
          [newStock, inventoryItem.id]
        );
        
        // Create inventory transaction record
        await db.query(`
          INSERT INTO inventory_transactions (
            inventory_item_id, type, quantity_change, previous_stock, new_stock,
            reason, notes, created_by
          ) VALUES (?, 'reduction', -1, ?, ?, 'Asset assigned', ?, ?)
        `, [inventoryItem.id, inventoryItem.current_stock, newStock, `Asset ID: ${asset_id} assigned to employee ID: ${employee_id}`, userId]);
      }
    } catch (inventoryError) {
      // Log error but don't fail the assignment
      logger.warn('Error updating inventory for asset assignment:', inventoryError);
    }
    
    // Log audit
    await db.query(`
      INSERT INTO asset_audit_logs (
        asset_id, action, performed_by, remarks, ip_address, user_agent
      ) VALUES (?, 'assigned', ?, ?, ?, ?)
    `, [asset_id, userId, `Assigned to employee ID: ${employee_id}`, getClientIp(req), getUserAgent(req)]);
    
    res.status(201).json({
      data: { id: result.insertId },
      message: 'Asset assigned successfully'
    });
  } catch (error) {
    logger.error('Error assigning asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Return asset (Admin only)
router.post('/assignments/:id/return', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { returned_date, condition_on_return, notes } = req.body;
    const userId = req.user?.id;
    
    // Get assignment
    const [assignments] = await db.query('SELECT * FROM asset_assignments WHERE id = ?', [id]);
    if (assignments.length === 0) {
      return res.status(404).json({ error: 'Assignment not found' });
    }
    
    const assignment = assignments[0];
    if (assignment.status !== 'active') {
      return res.status(400).json({ error: 'Assignment is not active' });
    }
    
    // Update assignment
    await db.query(`
      UPDATE asset_assignments SET
        returned_date = ?,
        condition_on_return = ?,
        status = 'returned',
        returned_to = ?,
        notes = ?
      WHERE id = ?
    `, [returned_date || new Date(), condition_on_return || 'good', userId, notes, id]);
    
    // Update asset status
    await db.query('UPDATE assets SET status = "available" WHERE id = ?', [assignment.asset_id]);
    
    // Log audit
    await db.query(`
      INSERT INTO asset_audit_logs (
        asset_id, action, performed_by, remarks, ip_address, user_agent
      ) VALUES (?, 'returned', ?, ?, ?, ?)
    `, [assignment.asset_id, userId, 'Asset returned', getClientIp(req), getUserAgent(req)]);
    
    res.json({ message: 'Asset returned successfully' });
  } catch (error) {
    logger.error('Error returning asset:', error);
    res.status(500).json({ error: error.message });
  }
});

// Bulk return assets (Admin only)
router.post('/assignments/bulk-return', requireAdmin, async (req, res) => {
  try {
    const { assignment_ids, returned_date, condition_on_return, notes } = req.body;
    const userId = req.user?.id;
    
    if (!assignment_ids || !Array.isArray(assignment_ids) || assignment_ids.length === 0) {
      return res.status(400).json({ error: 'Assignment IDs array is required' });
    }
    
    const results = [];
    const errors = [];
    
    for (const assignmentId of assignment_ids) {
      try {
        const [assignments] = await db.query('SELECT * FROM asset_assignments WHERE id = ?', [assignmentId]);
        if (assignments.length === 0) {
          errors.push({ id: assignmentId, error: 'Assignment not found' });
          continue;
        }
        
        const assignment = assignments[0];
        if (assignment.status !== 'active') {
          errors.push({ id: assignmentId, error: 'Assignment is not active' });
          continue;
        }
        
        // Update assignment
        await db.query(`
          UPDATE asset_assignments SET
            returned_date = ?,
            condition_on_return = ?,
            status = 'returned',
            returned_to = ?,
            notes = ?
          WHERE id = ?
        `, [returned_date || new Date(), condition_on_return || 'good', userId, notes, assignmentId]);
        
        // Update asset status
        await db.query('UPDATE assets SET status = "available" WHERE id = ?', [assignment.asset_id]);
        
        // Log audit
        await db.query(`
          INSERT INTO asset_audit_logs (
            asset_id, action, performed_by, remarks, ip_address, user_agent
          ) VALUES (?, 'returned', ?, ?, ?, ?)
        `, [assignment.asset_id, userId, 'Asset returned (bulk)', getClientIp(req), getUserAgent(req)]);
        
        results.push({ id: assignmentId, success: true });
      } catch (error) {
        errors.push({ id: assignmentId, error: error.message });
      }
    }
    
    res.json({
      message: `Processed ${results.length} returns${errors.length > 0 ? `, ${errors.length} errors` : ''}`,
      results,
      errors
    });
  } catch (error) {
    logger.error('Error bulk returning assets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignment analytics
router.get('/assignments/analytics', requireAdmin, async (req, res) => {
  try {
    const { date_from, date_to } = req.query;
    
    let dateFilter = '';
    const params = [];
    
    if (date_from && date_to) {
      dateFilter = ' AND aa.assigned_date BETWEEN ? AND ?';
      params.push(date_from, date_to);
    }
    
    // Total assignments
    const [totalAssignments] = await db.query(`
      SELECT COUNT(*) as total FROM asset_assignments aa WHERE 1=1 ${dateFilter}
    `, params);
    
    // Active assignments
    const [activeAssignments] = await db.query(`
      SELECT COUNT(*) as total FROM asset_assignments aa 
      WHERE aa.status = 'active' ${dateFilter}
    `, params);
    
    // Returned assignments
    const [returnedAssignments] = await db.query(`
      SELECT COUNT(*) as total FROM asset_assignments aa 
      WHERE aa.status = 'returned' ${dateFilter}
    `, params);
    
    // Assignments by category
    const [byCategory] = await db.query(`
      SELECT 
        ac.name as category,
        COUNT(*) as count
      FROM asset_assignments aa
      LEFT JOIN assets a ON aa.asset_id = a.id
      LEFT JOIN asset_categories ac ON a.asset_category_id = ac.id
      WHERE 1=1 ${dateFilter}
      GROUP BY ac.name
      ORDER BY count DESC
    `, params);
    
    // Assignments by employee
    const [byEmployee] = await db.query(`
      SELECT 
        e.emp_code,
        u.name as employee_name,
        COUNT(*) as count
      FROM asset_assignments aa
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE aa.status = 'active' ${dateFilter}
      GROUP BY e.id, e.emp_code, u.name
      ORDER BY count DESC
      LIMIT 10
    `, params);
    
    // Average assignment duration
    const [avgDuration] = await db.query(`
      SELECT 
        AVG(DATEDIFF(returned_date, assigned_date)) as avg_days
      FROM asset_assignments
      WHERE status = 'returned' AND returned_date IS NOT NULL ${dateFilter}
    `, params);
    
    res.json({
      data: {
        total: totalAssignments[0].total,
        active: activeAssignments[0].total,
        returned: returnedAssignments[0].total,
        by_category: byCategory,
        by_employee: byEmployee,
        avg_duration_days: avgDuration[0].avg_days || 0
      }
    });
  } catch (error) {
    logger.error('Error fetching assignment analytics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get assignment history for asset
router.get('/assignments/history/:asset_id', async (req, res) => {
  try {
    const { asset_id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    // Check access
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        const [assignment] = await db.query(
          'SELECT * FROM asset_assignments WHERE asset_id = ? AND employee_id = ?',
          [asset_id, employee[0].id]
        );
        if (assignment.length === 0) {
          return res.status(403).json({ error: 'Access denied' });
        }
      } else {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const [history] = await db.query(`
      SELECT 
        aa.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as assigned_by_name,
        u3.name as returned_to_name
      FROM asset_assignments aa
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON aa.assigned_by = u2.id
      LEFT JOIN users u3 ON aa.returned_to = u3.id
      WHERE aa.asset_id = ?
      ORDER BY aa.assigned_date DESC
    `, [asset_id]);
    
    res.json({ data: history });
  } catch (error) {
    logger.error('Error fetching assignment history:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// ASSET TICKETS
// ============================================

// Generate ticket number
async function generateTicketNumber() {
  const prefix = 'TKT';
  try {
    const [existing] = await db.query(
      'SELECT ticket_number FROM asset_tickets WHERE ticket_number LIKE ? ORDER BY ticket_number DESC LIMIT 1',
      [`${prefix}%`]
    );
    
    let num = 1;
    if (existing.length > 0 && existing[0].ticket_number) {
      const lastTicket = existing[0].ticket_number;
      // Extract number from ticket (e.g., "TKT000001" -> 1)
      const lastNumStr = lastTicket.replace(prefix, '').replace(/^0+/, '') || '0';
      const lastNum = parseInt(lastNumStr, 10);
      if (!isNaN(lastNum) && lastNum > 0) {
        num = lastNum + 1;
      }
    }
    
    return `${prefix}${String(num).padStart(6, '0')}`;
  } catch (error) {
    logger.error('Error generating ticket number:', error);
    // Fallback: use timestamp-based number
    const timestamp = Date.now().toString().slice(-6);
    return `${prefix}${timestamp}`;
  }
}

// Get all tickets
router.get('/tickets/list', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, ticket_type, my_tickets } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let query = `
      SELECT 
        t.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as resolved_by_name,
        a.asset_code, a.brand, a.model
      FROM asset_tickets t
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON t.resolved_by = u2.id
      LEFT JOIN assets a ON t.asset_id = a.id
      WHERE 1=1
    `;
    
    const params = [];
    
    // Filter by my tickets if requested
    if (my_tickets === 'true' || (!isAdmin && my_tickets !== 'false')) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        query += ' AND t.employee_id = ?';
        params.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      query += ' AND t.status = ?';
      params.push(status);
    }
    
    if (ticket_type) {
      query += ' AND t.ticket_type = ?';
      params.push(ticket_type);
    }
    
    query += ' ORDER BY t.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [tickets] = await db.query(query, params);
    
    // Count
    let countQuery = 'SELECT COUNT(*) as total FROM asset_tickets t WHERE 1=1';
    const countParams = [];
    
    if (my_tickets === 'true' || (!isAdmin && my_tickets !== 'false')) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        countQuery += ' AND t.employee_id = ?';
        countParams.push(employee[0].id);
      } else {
        return res.json({ data: [], total: 0, page: 1, limit: parseInt(limit) });
      }
    }
    
    if (status) {
      countQuery += ' AND t.status = ?';
      countParams.push(status);
    }
    
    if (ticket_type) {
      countQuery += ' AND t.ticket_type = ?';
      countParams.push(ticket_type);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    const total = countResult[0].total;
    
    res.json({
      data: tickets,
      total,
      page: parseInt(page),
      limit: parseInt(limit)
    });
  } catch (error) {
    logger.error('Error fetching tickets:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create ticket (All users)
router.post('/tickets', async (req, res) => {
  try {
    const {
      asset_id,
      ticket_type,
      category,
      subject,
      description,
      priority
    } = req.body;
    
    logger.debug('=== CREATE TICKET REQUEST ===');
    logger.debug('User ID:', req.user?.id);
    logger.debug('User Role:', req.user?.role);
    logger.debug('Request Body:', req.body);
    
    if (!ticket_type || !subject || !description) {
      return res.status(400).json({ error: 'Ticket type, subject, and description are required' });
    }
    
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({ error: 'User not authenticated' });
    }
    
    // Get employee ID
    const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employees.length === 0) {
      logger.warn('Employee record not found for user ID:', userId);
      return res.status(404).json({ error: 'Employee record not found. Please ensure your user account is linked to an employee record.' });
    }
    
    const employeeId = employees[0].id;
    
    // Generate ticket number
    const ticket_number = await generateTicketNumber();
    logger.debug('Generated ticket number:', ticket_number);
    
    // Create ticket
    const [result] = await db.query(`
      INSERT INTO asset_tickets (
        ticket_number, employee_id, asset_id, ticket_type,
        category, subject, description, priority
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      ticket_number, employeeId, asset_id || null, ticket_type,
      category || null, subject, description, priority || 'medium'
    ]);
    
    logger.info('Ticket created successfully:', ticket_number, 'ID:', result.insertId);
    
    // Automatically create approval request for the ticket
    // Map ticket types to approval request types
    const approvalRequestTypeMap = {
      'new_request': 'purchase',
      'repair': 'maintenance',
      'replacement': 'purchase',
      'return': 'return',
      'accessory_request': 'purchase',
      'damage_report': 'maintenance'
    };
    
    const approvalRequestType = approvalRequestTypeMap[ticket_type] || 'purchase';
    
    try {
      const [approvalResult] = await db.query(`
        INSERT INTO asset_approvals (
          request_type, asset_id, ticket_id,
          requested_by, status, comments
        ) VALUES (?, ?, ?, ?, 'pending', ?)
      `, [
        approvalRequestType,
        asset_id || null,
        result.insertId,
        userId,
        `Auto-generated from ticket ${ticket_number}: ${subject}`
      ]);
      
      logger.info('Approval request created automatically for ticket:', ticket_number, 'Approval ID:', approvalResult.insertId);
      
      // Log audit
      logCreate('asset_approvals', approvalResult.insertId, userId, {
        request_type: approvalRequestType,
        ticket_id: result.insertId,
        status: 'pending'
      });
    } catch (approvalError) {
      // Log error but don't fail ticket creation
      logger.error('Error creating automatic approval request for ticket:', approvalError);
      logger.error('Ticket was still created successfully:', ticket_number);
    }
    
    res.status(201).json({
      data: { id: result.insertId, ticket_number },
      message: 'Ticket created successfully'
    });
  } catch (error) {
    logger.error('Error creating ticket:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      // If ticket number already exists, try generating a new one
      try {
        const ticket_number = await generateTicketNumber();
        logger.warn('Retrying with new ticket number:', ticket_number);
        // Retry the insert (this is a fallback, should rarely happen)
        const [employees] = await db.query('SELECT id FROM employees WHERE user_id = ?', [req.user?.id]);
        if (employees.length > 0) {
          const [result] = await db.query(`
            INSERT INTO asset_tickets (
              ticket_number, employee_id, asset_id, ticket_type,
              category, subject, description, priority
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          `, [
            ticket_number, employees[0].id, req.body.asset_id || null, req.body.ticket_type,
            req.body.category || null, req.body.subject, req.body.description, req.body.priority || 'medium'
          ]);
          
          // Also create approval request for retry case
          const approvalRequestTypeMap = {
            'new_request': 'purchase',
            'repair': 'maintenance',
            'replacement': 'purchase',
            'return': 'return',
            'accessory_request': 'purchase',
            'damage_report': 'maintenance'
          };
          
          const approvalRequestType = approvalRequestTypeMap[req.body.ticket_type] || 'purchase';
          
          try {
            await db.query(`
              INSERT INTO asset_approvals (
                request_type, asset_id, ticket_id,
                requested_by, status, comments
              ) VALUES (?, ?, ?, ?, 'pending', ?)
            `, [
              approvalRequestType,
              req.body.asset_id || null,
              result.insertId,
              req.user?.id,
              `Auto-generated from ticket ${ticket_number}: ${req.body.subject}`
            ]);
          } catch (approvalError) {
            logger.error('Error creating automatic approval request (retry case):', approvalError);
          }
          
          return res.status(201).json({
            data: { id: result.insertId, ticket_number },
            message: 'Ticket created successfully'
          });
        }
      } catch (retryError) {
        logger.error('Retry also failed:', retryError);
      }
      return res.status(500).json({ error: 'Failed to create ticket. Please try again.' });
    }
    res.status(500).json({ error: error.message || 'Failed to create ticket' });
  }
});

// Get single ticket by ID
router.get('/tickets/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    const [tickets] = await db.query(`
      SELECT 
        t.*,
        e.emp_code,
        u.name as employee_name,
        u2.name as resolved_by_name,
        a.asset_code, a.brand, a.model, a.id as asset_id
      FROM asset_tickets t
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      LEFT JOIN users u2 ON t.resolved_by = u2.id
      LEFT JOIN assets a ON t.asset_id = a.id
      WHERE t.id = ?
    `, [id]);
    
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
    // Check if non-admin user has access to this ticket
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || ticket.employee_id !== employee[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ data: ticket });
  } catch (error) {
    logger.error('Error fetching ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ticket comments
router.get('/tickets/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    // Check ticket access
    const [tickets] = await db.query('SELECT employee_id FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || tickets[0].employee_id !== employee[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const [comments] = await db.query(`
      SELECT 
        c.*,
        u.name as user_name,
        r.name as user_role,
        CASE WHEN r.name IN ('Admin', 'Super Admin') THEN 1 ELSE 0 END as is_admin
      FROM asset_ticket_comments c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE c.ticket_id = ?
      ORDER BY c.created_at ASC
    `, [id]);
    
    // Filter out internal comments for non-admins
    const filteredComments = isAdmin 
      ? comments 
      : comments.filter((c) => !c.is_internal);
    
    res.json({ data: filteredComments });
  } catch (error) {
    logger.error('Error fetching ticket comments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add ticket comment
router.post('/tickets/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment, is_internal } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    if (!comment) {
      return res.status(400).json({ error: 'Comment is required' });
    }
    
    // Check ticket access
    const [tickets] = await db.query('SELECT employee_id FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || tickets[0].employee_id !== employee[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Only admins can add internal comments
    const finalIsInternal = isAdmin && is_internal ? 1 : 0;
    
    const [result] = await db.query(`
      INSERT INTO asset_ticket_comments (
        ticket_id, comment, is_internal, created_by
      ) VALUES (?, ?, ?, ?)
    `, [id, comment, finalIsInternal, userId]);
    
    const [newComment] = await db.query(`
      SELECT 
        c.*,
        u.name as user_name,
        r.name as user_role,
        CASE WHEN r.name IN ('Admin', 'Super Admin') THEN 1 ELSE 0 END as is_admin
      FROM asset_ticket_comments c
      LEFT JOIN users u ON c.created_by = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE c.id = ?
    `, [result.insertId]);
    
    // Get ticket info for notification
    const [ticketInfo] = await db.query(`
      SELECT t.ticket_number, t.employee_id
      FROM asset_tickets t
      WHERE t.id = ?
    `, [id]);
    
    // Notify about comment
    if (ticketInfo.length > 0) {
      const { notifyTicketComment } = await import('../utils/notificationService.js');
      await notifyTicketComment(
        parseInt(id),
        result.insertId,
        userId,
        newComment[0].user_name || 'Someone',
        comment,
        ticketInfo[0].ticket_number,
        ticketInfo[0].employee_id,
        false,
        null
      );
    }
    
    res.status(201).json({
      data: newComment[0],
      message: 'Comment added successfully'
    });
  } catch (error) {
    logger.error('Error adding ticket comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get ticket attachments
router.get('/tickets/:id/attachments', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    // Check ticket access
    const [tickets] = await db.query('SELECT employee_id FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || tickets[0].employee_id !== employee[0].id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    const [attachments] = await db.query(`
      SELECT 
        a.*,
        u.name as uploaded_by_name
      FROM asset_ticket_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.ticket_id = ?
      ORDER BY a.created_at DESC
    `, [id]);
    
    res.json({ data: attachments });
  } catch (error) {
    logger.error('Error fetching ticket attachments:', error);
    res.status(500).json({ error: error.message });
  }
});

// Upload ticket attachment
router.post('/tickets/:id/attachments', uploadTicketAttachment.single('file'), async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    const comment = req.body.comment || null;
    
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    // Check ticket access
    const [tickets] = await db.query('SELECT employee_id FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      // Delete uploaded file if ticket not found
      if (req.file.path) {
        fs.unlinkSync(req.file.path).catch(() => {});
      }
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length === 0 || tickets[0].employee_id !== employee[0].id) {
        // Delete uploaded file if access denied
        if (req.file.path) {
          fs.unlinkSync(req.file.path).catch(() => {});
        }
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    // Save attachment to database
    const fileUrl = `/uploads/ticket-attachments/${req.file.filename}`;
    const [result] = await db.query(`
      INSERT INTO asset_ticket_attachments 
        (ticket_id, filename, file_path, file_url, file_size, file_type, comment, uploaded_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      req.file.originalname,
      req.file.path,
      fileUrl,
      req.file.size,
      req.file.mimetype,
      comment,
      userId
    ]);
    
    // Fetch the created attachment with user info
    const [attachments] = await db.query(`
      SELECT 
        a.*,
        u.name as uploaded_by_name
      FROM asset_ticket_attachments a
      LEFT JOIN users u ON a.uploaded_by = u.id
      WHERE a.id = ?
    `, [result.insertId]);
    
    // Log the action
    logCreate('asset_ticket_attachments', result.insertId, userId, {
      ticket_id: id,
      filename: req.file.originalname,
      file_size: req.file.size
    });
    
    res.status(201).json({
      data: attachments[0],
      message: 'File uploaded successfully'
    });
  } catch (error) {
    // Delete uploaded file on error
    if (req.file?.path) {
      fs.unlinkSync(req.file.path).catch(() => {});
    }
    logger.error('Error uploading ticket attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete ticket attachment
router.delete('/tickets/:id/attachments/:attachmentId', async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    // Check ticket access
    const [tickets] = await db.query('SELECT employee_id FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    // Check attachment exists and belongs to ticket
    const [attachments] = await db.query(
      'SELECT * FROM asset_ticket_attachments WHERE id = ? AND ticket_id = ?',
      [attachmentId, id]
    );
    if (attachments.length === 0) {
      return res.status(404).json({ error: 'Attachment not found' });
    }
    
    const attachment = attachments[0];
    
    // Only admins or the uploader can delete
    if (!isAdmin && attachment.uploaded_by !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Delete file from disk
    if (attachment.file_path && fs.existsSync(attachment.file_path)) {
      try {
        fs.unlinkSync(attachment.file_path);
      } catch (fileError) {
        logger.warn('Error deleting file from disk:', fileError);
        // Continue with database deletion even if file deletion fails
      }
    }
    
    // Delete from database
    await db.query('DELETE FROM asset_ticket_attachments WHERE id = ?', [attachmentId]);
    
    // Log the action
    logDelete('asset_ticket_attachments', attachmentId, userId, {
      ticket_id: id,
      filename: attachment.filename
    });
    
    res.json({ message: 'Attachment deleted successfully' });
  } catch (error) {
    logger.error('Error deleting ticket attachment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update ticket status (Admin only for approval/rejection)
router.put('/tickets/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, admin_comment } = req.body;
    const userId = req.user?.id;
    
    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }
    
    // Get ticket
    const [tickets] = await db.query(`
      SELECT t.*, e.user_id as employee_user_id
      FROM asset_tickets t
      LEFT JOIN employees e ON t.employee_id = e.id
      WHERE t.id = ?
    `, [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    const oldStatus = ticket.status;
    
    // Update ticket
    await db.query(`
      UPDATE asset_tickets SET
        status = ?,
        admin_comment = ?,
        resolved_by = ?,
        resolved_at = ?
      WHERE id = ?
    `, [
      status,
      admin_comment,
      userId,
      ['resolved', 'closed'].includes(status) ? new Date() : null,
      id
    ]);
    
    // Notify ticket owner if status changed
    if (oldStatus !== status && ticket.employee_user_id) {
      const { notifyTicketStatusUpdated } = await import('../utils/notificationService.js');
      await notifyTicketStatusUpdated(
        ticket.employee_user_id,
        ticket.id,
        ticket.ticket_number,
        oldStatus,
        status,
        userId
      );
    }
    
    res.json({ message: 'Ticket updated successfully' });
  } catch (error) {
    logger.error('Error updating ticket:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// DASHBOARD STATS
// ============================================

router.get('/dashboard/stats', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isAdmin = userRole === 'Admin' || userRole === 'Super Admin';
    
    let assetQuery = 'SELECT COUNT(*) as total FROM assets';
    let assignedQuery = 'SELECT COUNT(*) as total FROM assets WHERE status = "assigned"';
    let availableQuery = 'SELECT COUNT(*) as total FROM assets WHERE status = "available"';
    let repairQuery = 'SELECT COUNT(*) as total FROM assets WHERE status = "repair"';
    let ticketsQuery = 'SELECT COUNT(*) as total FROM asset_tickets WHERE status IN ("open", "approved", "in_progress")';
    let warrantyQuery = 'SELECT COUNT(*) as total FROM assets WHERE warranty_expiry IS NOT NULL AND warranty_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
    
    const params = [];
    
    // If not admin, filter by employee's assigned assets
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        const empId = employee[0].id;
        assetQuery = 'SELECT COUNT(*) as total FROM assets a INNER JOIN asset_assignments aa ON a.id = aa.asset_id WHERE aa.employee_id = ?';
        assignedQuery = assetQuery + ' AND a.status = "assigned"';
        availableQuery = 'SELECT 0 as total'; // Employees don't see available assets
        repairQuery = assetQuery + ' AND a.status = "repair"';
        ticketsQuery = 'SELECT COUNT(*) as total FROM asset_tickets WHERE employee_id = ? AND status IN ("open", "approved", "in_progress")';
        warrantyQuery = assetQuery + ' AND a.warranty_expiry IS NOT NULL AND a.warranty_expiry <= DATE_ADD(CURDATE(), INTERVAL 30 DAY)';
        params.push(empId, empId, empId);
      }
    }
    
    const [totalAssets] = await db.query(assetQuery, params.slice(0, 1));
    const [assignedAssets] = await db.query(assignedQuery, params.slice(0, 1));
    const [availableAssets] = await db.query(availableQuery, isAdmin ? [] : []);
    const [repairAssets] = await db.query(repairQuery, params.slice(0, 1));
    const [pendingTickets] = await db.query(ticketsQuery, params.slice(-1));
    const [warrantyExpiring] = await db.query(warrantyQuery, params.slice(0, 1));
    
    // Recent assignments (last 10)
    let recentAssignmentsQuery = `
      SELECT 
        aa.*,
        a.asset_code, a.brand, a.model,
        e.emp_code,
        u.name as employee_name
      FROM asset_assignments aa
      LEFT JOIN assets a ON aa.asset_id = a.id
      LEFT JOIN employees e ON aa.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE aa.status = 'active'
    `;
    
    if (!isAdmin) {
      const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employee.length > 0) {
        recentAssignmentsQuery += ' AND aa.employee_id = ?';
      }
    }
    
    recentAssignmentsQuery += ' ORDER BY aa.assigned_date DESC LIMIT 10';
    
    const [recentAssignments] = await db.query(
      recentAssignmentsQuery,
      !isAdmin ? [params[0]] : []
    );
    
    res.json({
      data: {
        total_assets: totalAssets[0].total,
        assigned_assets: assignedAssets[0].total,
        available_assets: availableAssets[0].total || 0,
        repair_assets: repairAssets[0].total,
        pending_tickets: pendingTickets[0].total,
        warranty_expiring: warrantyExpiring[0].total,
        recent_assignments: recentAssignments
      }
    });
  } catch (error) {
    logger.error('Error fetching dashboard stats:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

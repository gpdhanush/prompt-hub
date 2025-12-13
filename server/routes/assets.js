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
    const [tickets] = await db.query('SELECT * FROM asset_tickets WHERE id = ?', [id]);
    if (tickets.length === 0) {
      return res.status(404).json({ error: 'Ticket not found' });
    }
    
    const ticket = tickets[0];
    
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

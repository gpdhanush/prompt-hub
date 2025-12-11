import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, my_projects } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    let query = `
      SELECT DISTINCT
        p.*,
        u1.name as created_by_name,
        u1.email as created_by_email,
        u2.name as updated_by_name,
        u2.email as updated_by_email,
        tl.name as team_lead_name,
        tl.email as team_lead_email,
        (SELECT COUNT(*) FROM project_users WHERE project_id = p.id) as member_count
      FROM projects p
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN users tl ON p.team_lead_id = tl.id
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by user's projects
    if (my_projects && userId) {
      // Show projects where user is team lead, project admin, creator, or assigned member
      query += ` AND (
        p.team_lead_id = ? OR 
        p.project_admin_id = ? OR 
        p.created_by = ? OR
        pu.user_id = ?
      )`;
      params.push(userId, userId, userId, userId);
    } else {
      // For "all" view, show projects based on role
      if (userRole === 'Super Admin' || userRole === 'Admin') {
        // Super Admin and Admin see all projects - no filter needed
      } else if (userRole === 'Team Lead') {
        // Team Lead sees projects where they are team lead or creator
        query += ` AND (p.team_lead_id = ? OR p.created_by = ?)`;
        params.push(userId, userId);
      } else if (userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester') {
        // Employees see projects where their team lead is the project team lead OR projects they're assigned to
        // Get their team lead's user ID from employees table
        const [employeeData] = await db.query(`
          SELECT tl_emp.user_id as team_lead_user_id
          FROM employees e
          LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
          WHERE e.user_id = ?
        `, [userId]);
        
        if (employeeData.length > 0 && employeeData[0].team_lead_user_id) {
          const teamLeadUserId = employeeData[0].team_lead_user_id;
          query += ` AND (
            p.team_lead_id = ? OR
            p.created_by = ? OR
            pu.user_id = ?
          )`;
          params.push(teamLeadUserId, teamLeadUserId, userId);
        } else {
          // If no team lead, show projects they're assigned to
          query += ` AND pu.user_id = ?`;
          params.push(userId);
        }
      }
    }
    
    query += ' ORDER BY p.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [projects] = await db.query(query, params);
    
    // Count query
    let countQuery = `
      SELECT COUNT(DISTINCT p.id) as total 
      FROM projects p
      LEFT JOIN project_users pu ON p.id = pu.project_id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (my_projects && userId) {
      countQuery += ` AND (
        p.team_lead_id = ? OR 
        p.project_admin_id = ? OR 
        p.created_by = ? OR
        pu.user_id = ?
      )`;
      countParams.push(userId, userId, userId, userId);
    } else {
      if (userRole === 'Super Admin' || userRole === 'Admin') {
        // No filter for Super Admin and Admin
      } else if (userRole === 'Team Lead') {
        countQuery += ` AND (p.team_lead_id = ? OR p.created_by = ?)`;
        countParams.push(userId, userId);
      } else if (userRole === 'Developer' || userRole === 'Designer' || userRole === 'Tester') {
        const [employeeData] = await db.query(`
          SELECT tl_emp.user_id as team_lead_user_id
          FROM employees e
          LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
          WHERE e.user_id = ?
        `, [userId]);
        
        if (employeeData.length > 0 && employeeData[0].team_lead_user_id) {
          const teamLeadUserId = employeeData[0].team_lead_user_id;
          countQuery += ` AND (
            p.team_lead_id = ? OR
            p.created_by = ? OR
            pu.user_id = ?
          )`;
          countParams.push(teamLeadUserId, teamLeadUserId, userId);
        } else {
          countQuery += ` AND pu.user_id = ?`;
          countParams.push(userId);
        }
      }
    }
    
    const [countResult] = await db.query(countQuery, countParams);
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
    const [projects] = await db.query(`
      SELECT 
        p.*,
        u1.name as created_by_name,
        u1.email as created_by_email,
        u2.name as updated_by_name,
        u2.email as updated_by_email,
        tl.name as team_lead_name,
        tl.email as team_lead_email
      FROM projects p
      LEFT JOIN users u1 ON p.created_by = u1.id
      LEFT JOIN users u2 ON p.updated_by = u2.id
      LEFT JOIN users tl ON p.team_lead_id = tl.id
      WHERE p.id = ?
    `, [req.params.id]);
    if (projects.length === 0) return res.status(404).json({ error: 'Project not found' });
    
    // Fetch project members
    const [members] = await db.query(
      'SELECT user_id FROM project_users WHERE project_id = ?',
      [req.params.id]
    );
    
    const projectData = projects[0];
    projectData.member_ids = members.map((m) => m.user_id.toString());
    
    res.json({ data: projectData });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create project - only Team Lead and Super Admin
router.post('/', authorize('Team Lead', 'Super Admin'), async (req, res) => {
  try {
    const { name, description, status, start_date, end_date, team_lead_id, member_ids } = req.body;
    
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
    const created_by = req.user.id;
    // Use provided team_lead_id or default to current user if they're a Team Lead
    const final_team_lead_id = team_lead_id || (req.user.role === 'Team Lead' ? req.user.id : null);
    
    const [result] = await db.query(`
      INSERT INTO projects (project_code, name, description, status, start_date, end_date, created_by, team_lead_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `, [projectCode, name, description, normalizedStatus, start_date || null, end_date || null, created_by, final_team_lead_id || null]);
    
    // Add members to project_users table if provided
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      const memberPromises = member_ids
        .filter(id => id && id !== '')
        .map(userId => {
          return db.query(`
            INSERT INTO project_users (project_id, user_id, role_in_project)
            VALUES (?, ?, 'employee')
            ON DUPLICATE KEY UPDATE role_in_project = 'employee'
          `, [result.insertId, userId]);
        });
      await Promise.all(memberPromises);
    }
    
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
        const created_by = req.user.id;
        const final_team_lead_id = team_lead_id || (req.user.role === 'Team Lead' ? req.user.id : null);
        const [result] = await db.query(`
          INSERT INTO projects (project_code, name, description, status, start_date, end_date, created_by, team_lead_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [projectCode, name, description, normalizedStatus, start_date || null, end_date || null, created_by, final_team_lead_id || null]);
        
        // Add members to project_users table if provided
        if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
          const memberPromises = member_ids
            .filter(id => id && id !== '')
            .map(userId => {
              return db.query(`
                INSERT INTO project_users (project_id, user_id, role_in_project)
                VALUES (?, ?, 'employee')
                ON DUPLICATE KEY UPDATE role_in_project = 'employee'
              `, [result.insertId, userId]);
            });
          await Promise.all(memberPromises);
        }
        
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
    const { name, description, status, start_date, end_date, team_lead_id, member_ids } = req.body;
    
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
    const updated_by = req.user.id;
    
    // Update team_lead_id if provided
    if (team_lead_id !== undefined) {
      await db.query(`
        UPDATE projects 
        SET team_lead_id = ?
        WHERE id = ?
      `, [team_lead_id || null, id]);
    }
    
    const updateParams = [
      name,
      description,
      normalizedStatus, // Use normalized status
      start_date || null,
      end_date || null,
      updated_by,
      id
    ];
    
    console.log('Update params array:', updateParams);
    console.log('Status value being sent:', normalizedStatus);
    console.log('Status type:', typeof normalizedStatus);
    
    const [result] = await db.query(`
      UPDATE projects 
      SET name = ?, description = ?, status = ?, start_date = ?, end_date = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `, updateParams);
    
    console.log('Update result:', result);
    console.log('Affected rows:', result.affectedRows);
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Update project members if provided
    if (member_ids !== undefined && Array.isArray(member_ids)) {
      // Delete existing members
      await db.query('DELETE FROM project_users WHERE project_id = ?', [id]);
      
      // Add new members
      if (member_ids.length > 0) {
        const memberPromises = member_ids
          .filter(id => id && id !== '')
          .map(userId => {
            return db.query(`
              INSERT INTO project_users (project_id, user_id, role_in_project)
              VALUES (?, ?, 'employee')
            `, [id, userId]);
          });
        await Promise.all(memberPromises);
      }
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

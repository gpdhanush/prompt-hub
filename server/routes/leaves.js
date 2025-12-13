import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';
import { logCreate, logUpdate, logDelete } from '../utils/auditLogger.js';
import { notifyLeaveStatusUpdated } from '../utils/notificationService.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get leaves - role-based filtering
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    // Super Admin, Admin, and Team Leader can see all leaves
    // Other users can only see their own leaves
    let query = `
      SELECT 
        l.*,
        e.id as employee_record_id,
        e.emp_code,
        e.team_lead_id,
        e.user_id as employee_user_id,
        u.name as employee_name,
        u.email as employee_email,
        r.name as employee_role,
        approver.name as approved_by_name,
        tl_emp.user_id as team_lead_user_id,
        tl_user.name as team_lead_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl_user ON tl_emp.user_id = tl_user.id
      WHERE 1=1
    `;
    const params = [];
    
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      // Get employee_id for current user
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0) {
        return res.json({ data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      const employeeId = employeeData[0].id;
      query += ' AND l.employee_id = ?';
      params.push(employeeId);
    }
    
    query += ' ORDER BY l.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    const [leaves] = await db.query(query, params);
    
    // Count query
    let countQuery = `
      SELECT COUNT(*) as total
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      WHERE 1=1
    `;
    const countParams = [];
    
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0) {
        return res.json({ data: [], pagination: { page: parseInt(page), limit: parseInt(limit), total: 0, totalPages: 0 } });
      }
      const employeeId = employeeData[0].id;
      countQuery += ' AND l.employee_id = ?';
      countParams.push(employeeId);
    }
    
    const [countResult] = await db.query(countQuery, countParams);
    
    res.json({ 
      data: leaves, 
      pagination: { 
        page: parseInt(page), 
        limit: parseInt(limit), 
        total: countResult[0].total, 
        totalPages: Math.ceil(countResult[0].total / limit) 
      } 
    });
  } catch (error) {
    logger.error('Error fetching leaves:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get single leave by ID
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    const [leaves] = await db.query(`
      SELECT 
        l.*,
        e.id as employee_record_id,
        e.emp_code,
        e.team_lead_id,
        e.user_id as employee_user_id,
        u.name as employee_name,
        u.email as employee_email,
        r.name as employee_role,
        approver.name as approved_by_name,
        tl_emp.user_id as team_lead_user_id,
        tl_user.name as team_lead_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl_user ON tl_emp.user_id = tl_user.id
      WHERE l.id = ?
    `, [req.params.id]);
    
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    
    // Check if user can access this leave
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    res.json({ data: leave });
  } catch (error) {
    logger.error('Error fetching leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create leave - all users can create their own leave
router.post('/', async (req, res) => {
  try {
    const userId = req.user?.id;
    const { leave_type, start_date, end_date, reason } = req.body;
    
    // Get employee_id for current user
    const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
    if (employeeData.length === 0) {
      return res.status(404).json({ error: 'Employee record not found' });
    }
    const employeeId = employeeData[0].id;
    
    // Calculate duration
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
    
    const [result] = await db.query(`
      INSERT INTO leaves (employee_id, leave_type, start_date, end_date, reason, status, duration)
      VALUES (?, ?, ?, ?, ?, 'Pending', ?)
    `, [employeeId, leave_type, start_date, end_date, reason, duration]);
    
    const [newLeave] = await db.query(`
      SELECT 
        l.*,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      WHERE l.id = ?
    `, [result.insertId]);
    
    // Create audit log for leave creation
    await logCreate(req, 'Leaves', result.insertId, {
      id: result.insertId,
      employee_id: employeeId,
      leave_type: leave_type,
      start_date: start_date,
      end_date: end_date,
      status: 'Pending'
    }, 'Leave');
    
    res.status(201).json({ data: newLeave[0] });
  } catch (error) {
    logger.error('Error creating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update leave - users can update their own, admins can update any
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const { leave_type, start_date, end_date, reason, status, approved_by, rejection_reason } = req.body;
    
    // Get the leave first and store before data
    const [leaves] = await db.query('SELECT * FROM leaves WHERE id = ?', [id]);
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    const beforeData = leave;
    
    // Check permissions
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      // Regular users can only update their own leaves
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      // Regular users cannot change status (only admins can approve/reject)
      if (status && status !== leave.status) {
        return res.status(403).json({ error: 'You cannot change leave status' });
      }
    }
    
    // Build update query
    const updates = [];
    const params = [];
    
    if (leave_type !== undefined) {
      updates.push('leave_type = ?');
      params.push(leave_type);
    }
    if (start_date !== undefined) {
      updates.push('start_date = ?');
      params.push(start_date);
    }
    if (end_date !== undefined) {
      updates.push('end_date = ?');
      params.push(end_date);
    }
    if (reason !== undefined) {
      updates.push('reason = ?');
      params.push(reason);
    }
    // Check permissions for status changes
    if (status !== undefined && status !== leave.status) {
      // Get current user's employee record
      const [currentUserEmployee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      const currentUserEmployeeId = currentUserEmployee[0]?.id;
      
      // Get leave requester's employee record and team lead info
      const [leaveEmployee] = await db.query(`
        SELECT e.id, e.team_lead_id, e.user_id, r.name as role
        FROM employees e
        INNER JOIN users u ON e.user_id = u.id
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE e.id = ?
      `, [leave.employee_id]);
      
      if (leaveEmployee.length === 0) {
        return res.status(404).json({ error: 'Employee record not found for this leave' });
      }
      
      const leaveRequesterEmployee = leaveEmployee[0];
      const leaveRequesterRole = leaveRequesterEmployee.role;
      const leaveRequesterTeamLeadId = leaveRequesterEmployee.team_lead_id;
      
      // Check if current user is the leave requester (TL creating leave for themselves)
      const isOwnLeave = currentUserEmployeeId === leave.employee_id;
      
      // If it's their own leave, they cannot approve/reject it
      if (isOwnLeave) {
        return res.status(403).json({ error: 'You cannot approve or reject your own leave request' });
      }
      
      // Check if leave requester is a Team Lead
      const isTeamLeadLeave = leaveRequesterRole === 'Team Leader' || leaveRequesterRole === 'Team Lead';
      
      // If it's a Team Lead's leave, only their reporting person (team_lead_id) or Super Admin can approve/reject
      if (isTeamLeadLeave && userRole !== 'Super Admin') {
        // Check if current user is the reporting person (team lead) of the leave requester
        if (!currentUserEmployeeId || currentUserEmployeeId !== leaveRequesterTeamLeadId) {
          return res.status(403).json({ 
            error: 'Only the reporting person (Team Lead) or Super Admin can approve/reject Team Lead leave requests' 
          });
        }
      }
      
      // Super Admin always has permission
      if (userRole !== 'Super Admin') {
        // Get user's role_id for permission check
        const [users] = await db.query('SELECT role_id FROM users WHERE id = ?', [userId]);
        const roleId = users[0]?.role_id;
        
        if (status === 'Approved') {
          // Check for leaves.accept permission
          if (roleId) {
            const [permissions] = await db.query(`
              SELECT COUNT(*) as count
              FROM permissions p
              INNER JOIN role_permissions rp ON p.id = rp.permission_id
              WHERE rp.role_id = ? 
              AND rp.allowed = TRUE
              AND p.code = 'leaves.accept'
            `, [roleId]);
            
            if (permissions[0].count === 0) {
              // Fall back to role check for backward compatibility
              if (userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
                return res.status(403).json({ error: 'Access denied. Required permission: leaves.accept' });
              }
            }
          } else {
            // No role_id, fall back to role check
            if (userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
              return res.status(403).json({ error: 'Access denied' });
            }
          }
        } else if (status === 'Rejected') {
          // Check for leaves.reject permission
          if (roleId) {
            const [permissions] = await db.query(`
              SELECT COUNT(*) as count
              FROM permissions p
              INNER JOIN role_permissions rp ON p.id = rp.permission_id
              WHERE rp.role_id = ? 
              AND rp.allowed = TRUE
              AND p.code = 'leaves.reject'
            `, [roleId]);
            
            if (permissions[0].count === 0) {
              // Fall back to role check for backward compatibility
              if (userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
                return res.status(403).json({ error: 'Access denied. Required permission: leaves.reject' });
              }
            }
          } else {
            // No role_id, fall back to role check
            if (userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
              return res.status(403).json({ error: 'Access denied' });
            }
          }
          
          // If rejecting, require rejection_reason
          if (!rejection_reason) {
            return res.status(400).json({ error: 'Rejection reason is required when rejecting a leave request' });
          }
        }
      }
      
      // User has permission, proceed with status update
      updates.push('status = ?');
      params.push(status);
      
      // If rejecting, set rejection_reason
      if (status === 'Rejected' && rejection_reason) {
        updates.push('rejection_reason = ?');
        params.push(rejection_reason);
      }
      
      // If approving, clear rejection_reason
      if (status === 'Approved') {
        updates.push('rejection_reason = NULL');
      }
    }
    if (approved_by !== undefined && (userRole === 'Super Admin' || userRole === 'Admin' || userRole === 'Team Leader' || userRole === 'Team Lead')) {
      updates.push('approved_by = ?');
      params.push(approved_by);
    }
    
    // Recalculate duration if dates changed
    if (start_date !== undefined || end_date !== undefined) {
      const finalStartDate = start_date ? new Date(start_date) : new Date(leave.start_date);
      const finalEndDate = end_date ? new Date(end_date) : new Date(leave.end_date);
      const duration = Math.ceil((finalEndDate - finalStartDate) / (1000 * 60 * 60 * 24)) + 1;
      updates.push('duration = ?');
      params.push(duration);
    }
    
    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = CURRENT_TIMESTAMP');
    params.push(id);
    
    await db.query(`UPDATE leaves SET ${updates.join(', ')} WHERE id = ?`, params);
    
    const [updated] = await db.query(`
      SELECT 
        l.*,
        e.id as employee_record_id,
        e.emp_code,
        e.team_lead_id,
        e.user_id as employee_user_id,
        u.name as employee_name,
        u.email as employee_email,
        r.name as employee_role,
        approver.name as approved_by_name
      FROM leaves l
      INNER JOIN employees e ON l.employee_id = e.id
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN users approver ON l.approved_by = approver.id
      WHERE l.id = ?
    `, [id]);
    
    const updatedLeave = updated[0];
    
    // Create audit log for leave update
    await logUpdate(req, 'Leaves', id, beforeData, updatedLeave, 'Leave');
    
    // If leave was approved and the requester is a Team Lead, notify all employees under that TL
    if (status === 'Approved' && updatedLeave.employee_role && 
        (updatedLeave.employee_role === 'Team Leader' || updatedLeave.employee_role === 'Team Lead')) {
      try {
        // Get all employees under this Team Lead
        const [teamEmployees] = await db.query(`
          SELECT e.user_id, u.name as employee_name
          FROM employees e
          INNER JOIN users u ON e.user_id = u.id
          WHERE e.team_lead_id = ?
        `, [updatedLeave.employee_record_id]);
        
        if (teamEmployees.length > 0) {
          const approverName = req.user?.name || 'Admin';
          const leaveType = updatedLeave.leave_type || 'Leave';
          
          // Format dates to DD-MMM-YYYY format
          const formatDateDDMMMYYYY = (dateString) => {
            if (!dateString) return '';
            try {
              const date = new Date(dateString);
              if (isNaN(date.getTime())) return '';
              const day = String(date.getDate()).padStart(2, '0');
              const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
              const month = months[date.getMonth()];
              const year = date.getFullYear();
              return `${day}-${month}-${year}`;
            } catch (error) {
              return '';
            }
          };
          
          const startDate = formatDateDDMMMYYYY(updatedLeave.start_date);
          const endDate = formatDateDDMMMYYYY(updatedLeave.end_date);
          
          // Notify all employees under the TL
          const { notifyMultipleUsers } = await import('../utils/notificationService.js');
          const employeeUserIds = teamEmployees.map((emp) => emp.user_id).filter(Boolean);
          
          if (employeeUserIds.length > 0) {
            await notifyMultipleUsers(
              employeeUserIds,
              'tl_leave_approved',
              'Team Lead Leave Approved',
              `Your Team Lead ${updatedLeave.employee_name}'s ${leaveType} leave has been approved by ${approverName}.`,
              {
                leaveId: id,
                tlName: updatedLeave.employee_name,
                leaveType: leaveType,
                startDate: startDate,
                endDate: endDate,
                approvedBy: approverName,
                link: '/leaves',
              }
            );
            
            logger.info(`✅ Notified ${employeeUserIds.length} employees about TL leave approval`);
          }
        }
      } catch (notifyError) {
        logger.error('Error notifying employees about TL leave approval:', notifyError);
        // Don't fail the leave update if notification fails
      }
    }
    
    // Notify user if leave status is updated
    if (status && status !== beforeData.status) {
      // Get user_id from employee_id
      const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [leave.employee_id]);
      if (employees.length > 0) {
        const userId = employees[0].user_id;
        await notifyLeaveStatusUpdated(
          userId,
          parseInt(id),
          beforeData.status,
          status,
          approved_by || userId,
          updated[0].leave_type,
          updated[0].start_date,
          updated[0].end_date
        );
      }
    }
    
    res.json({ data: updated[0] });
  } catch (error) {
    logger.error('Error updating leave:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete leave - users can delete their own, admins can delete any
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    
    const { id } = req.params;
    
    // Get the leave first and store before data
    const [leaves] = await db.query('SELECT * FROM leaves WHERE id = ?', [id]);
    if (leaves.length === 0) {
      return res.status(404).json({ error: 'Leave not found' });
    }
    
    const leave = leaves[0];
    const beforeData = leave;
    
    // Check permissions
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      // Regular users can only delete their own leaves
      const [employeeData] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
      if (employeeData.length === 0 || employeeData[0].id !== leave.employee_id) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }
    
    await db.query('DELETE FROM leaves WHERE id = ?', [id]);
    
    // Create audit log for leave deletion
    await logDelete(req, 'Leaves', id, beforeData, 'Leave');
    
    res.json({ message: 'Leave deleted successfully' });
  } catch (error) {
    logger.error('Error deleting leave:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;

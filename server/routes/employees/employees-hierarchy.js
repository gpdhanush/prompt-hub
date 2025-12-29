import express from 'express';
import { db } from '../../config/database.js';
import { requireSuperAdmin } from '../../middleware/auth.js';
import { getSuperAdminRole } from '../../utils/roleHelpers.js';
import { logger } from '../../utils/logger.js';

const router = express.Router();

// Get user hierarchy (Super Admin only)
router.get('/hierarchy', requireSuperAdmin, async (req, res) => {
  try {
    // Get Super Admin role first to exclude from employee list
    const superAdminRole = await getSuperAdminRole();
    const superAdminRoleName = superAdminRole ? superAdminRole.name : 'Super Admin';
    
    // Get all employees with their position level and team lead info
    // Exclude Super Admin users
    const [employees] = await db.query(`
      SELECT 
        e.id,
        e.emp_code,
        e.team_lead_id,
        e.profile_photo_url,
        u.id as user_id,
        u.name,
        u.email,
        r.name as role,
        r.level as role_level,
        u.position_id,
        p.name as position_name,
        p.level as position_level,
        tl_emp.id as team_lead_emp_id,
        tl_user.name as team_lead_name,
        tl_user.email as team_lead_email
      FROM employees e
      INNER JOIN users u ON e.user_id = u.id
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN positions p ON u.position_id = p.id
      LEFT JOIN employees tl_emp ON e.team_lead_id = tl_emp.id
      LEFT JOIN users tl_user ON tl_emp.user_id = tl_user.id
      WHERE (r.name IS NULL OR r.name != ?)
      ORDER BY COALESCE(p.level, r.level, 2) ASC, u.name ASC
    `, [superAdminRoleName]);

    // Organize by hierarchy
    const hierarchy = {
      superAdmin: {
        level: 0,
        users: []
      },
      level1: [],
      level2: []
    };

    // Get Super Admin (already fetched above)
    if (superAdminRole) {
      const [superAdmins] = await db.query(`
        SELECT 
          u.id, 
          u.name, 
          u.email, 
          r.name as role,
          e.profile_photo_url
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        LEFT JOIN employees e ON u.id = e.user_id
        WHERE r.name = ?
        ORDER BY u.name ASC
      `, [superAdminRole.name]);
      hierarchy.superAdmin.users = superAdmins;
    } else {
      // If no Super Admin role found, return empty array
      hierarchy.superAdmin.users = [];
    }

    // Organize employees by level
    // Use role_level as primary, fallback to position_level, then default to 2
    employees.forEach((emp) => {
      // Determine level: role_level > position_level > default 2
      const level = emp.role_level !== null && emp.role_level !== undefined 
        ? emp.role_level 
        : (emp.position_level !== null && emp.position_level !== undefined 
          ? emp.position_level 
          : 2);
      
      logger.debug(`Processing employee: ${emp.name}, role: ${emp.role}, role_level: ${emp.role_level}, position_level: ${emp.position_level}, final_level: ${level}`);
      
      if (level === 1) {
        // Level 1 user - find their level 2 users
        // Check by team_lead_id relationship
        const level2Users = employees.filter((e) => {
          const eLevel = e.role_level !== null && e.role_level !== undefined 
            ? e.role_level 
            : (e.position_level !== null && e.position_level !== undefined 
              ? e.position_level 
              : 2);
          return e.team_lead_id === emp.id && eLevel === 2;
        });
        
        logger.debug(`Level 1 user ${emp.name} has ${level2Users.length} level 2 employees`);
        
        hierarchy.level1.push({
          id: emp.id,
          user_id: emp.user_id,
          name: emp.name,
          email: emp.email,
          role: emp.role,
          position: emp.position_name,
          emp_code: emp.emp_code,
          profile_photo_url: emp.profile_photo_url,
          level2Users: level2Users.map((e) => ({
            id: e.id,
            user_id: e.user_id,
            name: e.name,
            email: e.email,
            role: e.role,
            position: e.position_name,
            emp_code: e.emp_code,
            team_lead_id: e.team_lead_id,
            profile_photo_url: e.profile_photo_url
          }))
        });
      } else if (level === 2) {
        // Level 2 user - only add if not already added under a level 1 user
        const alreadyAdded = hierarchy.level1.some((l1) => 
          l1.level2Users.some((l2) => l2.id === emp.id)
        );
        
        if (!alreadyAdded) {
          // Orphaned level 2 user (no team lead or team lead not in level 1)
          if (!hierarchy.level2) {
            hierarchy.level2 = [];
          }
          hierarchy.level2.push({
            id: emp.id,
            user_id: emp.user_id,
            name: emp.name,
            email: emp.email,
            role: emp.role,
            position: emp.position_name,
            emp_code: emp.emp_code,
            team_lead_id: emp.team_lead_id,
            team_lead_name: emp.team_lead_name,
            profile_photo_url: emp.profile_photo_url
          });
        }
      } else {
        // Handle level 0 or other levels - shouldn't happen but log it
        logger.debug(`Employee ${emp.name} has unexpected level: ${level}`);
      }
    });
    
    logger.debug(`Hierarchy organized: Super Admin: ${hierarchy.superAdmin.users.length}, Level 1: ${hierarchy.level1.length}, Level 2: ${hierarchy.level2.length}, Total employees processed: ${employees.length}`);

    res.json({ data: hierarchy });
  } catch (error) {
    logger.error('Error fetching user hierarchy:', error);
    logger.error('Error stack:', error.stack);
    res.status(500).json({ 
      error: error.message || 'Failed to fetch user hierarchy',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;


import express from 'express';
import { db } from '../config/database.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Get task metrics
router.get('/tasks', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let dateFilter = '';
    const params = [];
    
    if (period === 'week') {
      dateFilter = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (period === 'quarter') {
      dateFilter = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
    } else if (period === 'year') {
      dateFilter = 'AND t.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    
    // Get task counts by status
    const [taskCounts] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Completed', 'Done', 'Closed') THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status IN ('In Progress', 'Development', 'Testing') THEN 1 ELSE 0 END) as inProgress,
        SUM(CASE WHEN status IN ('Open', 'Pending', 'To Do', 'Analysis') THEN 1 ELSE 0 END) as pending
      FROM tasks t
      WHERE 1=1 ${dateFilter}
    `, params);
    
    const metrics = taskCounts[0];
    const completionRate = metrics.total > 0 
      ? ((metrics.completed / metrics.total) * 100).toFixed(1) 
      : 0;
    
    // Calculate average resolution time (for completed tasks)
    const [avgTime] = await db.query(`
      SELECT 
        AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avgDays
      FROM tasks
      WHERE status IN ('Completed', 'Done', 'Closed')
      ${dateFilter.replace('t.created_at', 'created_at')}
    `);
    
    const avgDaysValue = avgTime[0]?.avgDays;
    const avgResolutionTime = avgDaysValue !== null && avgDaysValue !== undefined && !isNaN(avgDaysValue)
      ? `${parseFloat(avgDaysValue).toFixed(1)} days` 
      : '0 days';
    
    res.json({
      data: {
        total: parseInt(metrics.total) || 0,
        completed: parseInt(metrics.completed) || 0,
        inProgress: parseInt(metrics.inProgress) || 0,
        pending: parseInt(metrics.pending) || 0,
        completionRate: parseFloat(completionRate),
        avgResolutionTime
      }
    });
  } catch (error) {
    console.error('Error fetching task metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get bug metrics
router.get('/bugs', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let dateFilter = '';
    let avgDateFilter = '';
    
    if (period === 'week') {
      dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      avgDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
      avgDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (period === 'quarter') {
      dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
      avgDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
    } else if (period === 'year') {
      dateFilter = 'AND b.created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      avgDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    
    // Get bug counts by status
    const [bugCounts] = await db.query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status IN ('Open', 'New') THEN 1 ELSE 0 END) as open,
        SUM(CASE WHEN status IN ('Fixed', 'Resolved', 'Completed') THEN 1 ELSE 0 END) as fixed,
        SUM(CASE WHEN status IN ('Rejected', 'Won''t Fix', 'Duplicate') THEN 1 ELSE 0 END) as rejected
      FROM bugs b
      WHERE 1=1 ${dateFilter}
    `);
    
    const metrics = bugCounts[0];
    const fixRate = metrics.total > 0 
      ? ((metrics.fixed / metrics.total) * 100).toFixed(1) 
      : 0;
    
    // Calculate average fix time (for fixed bugs)
    const [avgTime] = await db.query(`
      SELECT 
        AVG(DATEDIFF(COALESCE(updated_at, NOW()), created_at)) as avgDays
      FROM bugs
      WHERE status IN ('Fixed', 'Resolved', 'Completed')
      ${avgDateFilter}
    `);
    
    const avgFixTime = avgTime[0].avgDays !== null && avgTime[0].avgDays !== undefined
      ? `${avgTime[0].avgDays.toFixed(1)} days` 
      : '0 days';
    
    res.json({
      data: {
        total: parseInt(metrics.total) || 0,
        open: parseInt(metrics.open) || 0,
        fixed: parseInt(metrics.fixed) || 0,
        rejected: parseInt(metrics.rejected) || 0,
        fixRate: parseFloat(fixRate),
        avgFixTime
      }
    });
  } catch (error) {
    console.error('Error fetching bug metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get leaderboard (top performers)
router.get('/leaderboard', async (req, res) => {
  try {
    const { period = 'month', limit = 10 } = req.query;
    
    // Calculate date range based on period
    let taskDateFilter = '';
    let bugDateFilter = '';
    
    if (period === 'week') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (period === 'quarter') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
    } else if (period === 'year') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    
    // Get top performers based on tasks completed and bugs fixed
    const [leaderboard] = await db.query(`
      SELECT 
        u.id,
        u.name,
        u.email,
        COALESCE(task_stats.tasks_completed, 0) as tasks,
        COALESCE(bug_stats.bugs_fixed, 0) as bugs,
        COALESCE(task_stats.tasks_completed, 0) * 2 + COALESCE(bug_stats.bugs_fixed, 0) * 3 as score,
        CASE 
          WHEN COALESCE(task_stats.tasks_total, 0) > 0 
          THEN ROUND((COALESCE(task_stats.tasks_completed, 0) * 100.0 / task_stats.tasks_total), 1)
          ELSE 0 
        END as productivity
      FROM users u
      LEFT JOIN (
        SELECT 
          COALESCE(assigned_to, developer_id, designer_id, tester_id) as user_id,
          SUM(CASE WHEN status IN ('Completed', 'Done', 'Closed') THEN 1 ELSE 0 END) as tasks_completed,
          COUNT(*) as tasks_total
        FROM tasks
        WHERE 1=1 ${taskDateFilter}
        GROUP BY COALESCE(assigned_to, developer_id, designer_id, tester_id)
      ) task_stats ON u.id = task_stats.user_id
      LEFT JOIN (
        SELECT 
          assigned_to as user_id,
          COUNT(*) as bugs_fixed
        FROM bugs
        WHERE status IN ('Fixed', 'Resolved', 'Completed')
        ${bugDateFilter}
        GROUP BY assigned_to
      ) bug_stats ON u.id = bug_stats.user_id
      WHERE u.role_id IN (
        SELECT id FROM roles WHERE name IN ('Developer', 'Designer', 'Tester')
      )
      AND (COALESCE(task_stats.tasks_completed, 0) > 0 OR COALESCE(bug_stats.bugs_fixed, 0) > 0)
      ORDER BY score DESC, tasks DESC, bugs DESC
      LIMIT ?
    `, [parseInt(limit)]);
    
    // Add rank to each entry
    const leaderboardWithRank = leaderboard.map((entry, index) => ({
      rank: index + 1,
      name: entry.name,
      email: entry.email,
      tasks: parseInt(entry.tasks) || 0,
      bugs: parseInt(entry.bugs) || 0,
      score: parseInt(entry.score) || 0,
      productivity: parseFloat(entry.productivity) || 0
    }));
    
    res.json({ data: leaderboardWithRank });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get project stats
router.get('/projects', async (req, res) => {
  try {
    const [projectStats] = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.status,
        p.start_date,
        p.end_date,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as tasks_count,
        (SELECT COUNT(*) FROM bugs b 
         INNER JOIN tasks t ON b.task_id = t.id 
         WHERE t.project_id = p.id) as bugs_count,
        (SELECT COUNT(*) FROM project_users WHERE project_id = p.id) as members_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id AND status IN ('Completed', 'Done', 'Closed')) as tasks_completed,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) as tasks_total
      FROM projects p
      WHERE p.status != 'Archived'
      ORDER BY p.created_at DESC
    `);
    
    const stats = projectStats.map((project) => {
      const progress = project.tasks_total > 0 
        ? Math.round((project.tasks_completed / project.tasks_total) * 100)
        : 0;
      
      return {
        id: project.id,
        name: project.name,
        progress,
        tasks: parseInt(project.tasks_count) || 0,
        bugs: parseInt(project.bugs_count) || 0,
        members: parseInt(project.members_count) || 0,
        status: project.status
      };
    });
    
    res.json({ data: stats });
  } catch (error) {
    console.error('Error fetching project stats:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get top performer for quick stats
router.get('/top-performer', async (req, res) => {
  try {
    const { period = 'month' } = req.query;
    
    // Calculate date range based on period
    let taskDateFilter = '';
    let bugDateFilter = '';
    
    if (period === 'week') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)';
    } else if (period === 'month') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 MONTH)';
    } else if (period === 'quarter') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 3 MONTH)';
    } else if (period === 'year') {
      taskDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
      bugDateFilter = 'AND created_at >= DATE_SUB(NOW(), INTERVAL 1 YEAR)';
    }
    
    const [topPerformer] = await db.query(`
      SELECT 
        u.id,
        u.name,
        COALESCE(task_stats.tasks_completed, 0) * 2 + COALESCE(bug_stats.bugs_fixed, 0) * 3 as score,
        CASE 
          WHEN COALESCE(task_stats.tasks_total, 0) > 0 
          THEN ROUND((COALESCE(task_stats.tasks_completed, 0) * 100.0 / task_stats.tasks_total), 1)
          ELSE 0 
        END as productivity
      FROM users u
      LEFT JOIN (
        SELECT 
          COALESCE(assigned_to, developer_id, designer_id, tester_id) as user_id,
          SUM(CASE WHEN status IN ('Completed', 'Done', 'Closed') THEN 1 ELSE 0 END) as tasks_completed,
          COUNT(*) as tasks_total
        FROM tasks
        WHERE 1=1 ${taskDateFilter}
        GROUP BY COALESCE(assigned_to, developer_id, designer_id, tester_id)
      ) task_stats ON u.id = task_stats.user_id
      LEFT JOIN (
        SELECT 
          assigned_to as user_id,
          COUNT(*) as bugs_fixed
        FROM bugs
        WHERE status IN ('Fixed', 'Resolved', 'Completed')
        ${bugDateFilter}
        GROUP BY assigned_to
      ) bug_stats ON u.id = bug_stats.user_id
      WHERE u.role_id IN (
        SELECT id FROM roles WHERE name IN ('Developer', 'Designer', 'Tester')
      )
      AND (COALESCE(task_stats.tasks_completed, 0) > 0 OR COALESCE(bug_stats.bugs_fixed, 0) > 0)
      ORDER BY score DESC
      LIMIT 1
    `);
    
    if (topPerformer.length === 0) {
      return res.json({ data: null });
    }
    
    res.json({
      data: {
        name: topPerformer[0].name,
        score: parseInt(topPerformer[0].score) || 0,
        productivity: parseFloat(topPerformer[0].productivity) || 0
      }
    });
  } catch (error) {
    console.error('Error fetching top performer:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dashboard stats endpoint (keep for backward compatibility)
router.get('/dashboard', async (req, res) => {
  try {
    const [userCount] = await db.query('SELECT COUNT(*) as count FROM users');
    const [employeeCount] = await db.query('SELECT COUNT(*) as count FROM employees');
    const [projectCount] = await db.query('SELECT COUNT(*) as count FROM projects');
    const [taskCount] = await db.query('SELECT COUNT(*) as count FROM tasks');
    res.json({
      data: {
        users: userCount[0].count,
        employees: employeeCount[0].count,
        projects: projectCount[0].count,
        tasks: taskCount[0].count
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;

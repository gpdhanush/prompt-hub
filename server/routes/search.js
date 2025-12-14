import express from 'express';
import { db } from '../config/database.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { logger } from '../utils/logger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Global search across multiple entities
router.get('/', authorize('Super Admin', 'Admin', 'Team Lead', 'Team Leader', 'Developer', 'Designer', 'Tester'), async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    const userId = req.user?.id;
    const userRole = req.user?.role || '';
    const isSuperAdmin = userRole === 'Super Admin';
    const isAdmin = userRole === 'Admin' || isSuperAdmin;

    if (!q || q.trim() === '') {
      return res.json({ data: { groups: [] } });
    }

    const searchTerm = `%${q.trim()}%`;
    const results = {
      tickets: [],
      bugs: [],
      tasks: [],
      projects: [],
      bug_comments: [],
      task_comments: [],
      ticket_comments: [],
    };

    // Search Tickets
    try {
      let ticketQuery = `
        SELECT 
          t.id,
          t.ticket_number,
          t.subject,
          t.status,
          t.created_at,
          'ticket' as type,
          u.name as employee_name
        FROM asset_tickets t
        LEFT JOIN employees e ON t.employee_id = e.id
        LEFT JOIN users u ON e.user_id = u.id
        WHERE (t.subject LIKE ? OR t.ticket_number LIKE ? OR t.description LIKE ?)
      `;
      const ticketParams = [searchTerm, searchTerm, searchTerm];

      if (!isAdmin) {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
        if (employee.length > 0) {
          ticketQuery += ' AND t.employee_id = ?';
          ticketParams.push(employee[0].id);
        } else {
          ticketQuery += ' AND 1=0'; // No access
        }
      }

      ticketQuery += ' ORDER BY t.created_at DESC LIMIT ?';
      ticketParams.push(parseInt(limit));

      const [tickets] = await db.query(ticketQuery, ticketParams);
      results.tickets = tickets.map(t => ({
        id: t.id,
        title: t.subject || `Ticket #${t.ticket_number}`,
        subtitle: t.employee_name || 'Unknown',
        status: t.status,
        type: 'ticket',
        link: `/it-assets/tickets/${t.id}`,
        created_at: t.created_at,
      }));
    } catch (error) {
      logger.error('Error searching tickets:', error);
    }

    // Search Bugs
    try {
      let bugQuery = `
        SELECT 
          b.id,
          b.title,
          b.status,
          b.created_at,
          'bug' as type,
          u1.name as assigned_to_name,
          u2.name as reported_by_name
        FROM bugs b
        LEFT JOIN users u1 ON b.assigned_to = u1.id
        LEFT JOIN users u2 ON b.reported_by = u2.id
        WHERE (b.title LIKE ? OR b.description LIKE ?)
      `;
      const bugParams = [searchTerm, searchTerm];

      bugQuery += ' ORDER BY b.created_at DESC LIMIT ?';
      bugParams.push(parseInt(limit));

      const [bugs] = await db.query(bugQuery, bugParams);
      results.bugs = bugs.map(b => ({
        id: b.id,
        title: b.title,
        subtitle: b.assigned_to_name || b.reported_by_name || 'Unassigned',
        status: b.status,
        type: 'bug',
        link: `/bugs/${b.id}`,
        created_at: b.created_at,
      }));
    } catch (error) {
      logger.error('Error searching bugs:', error);
    }

    // Search Tasks
    try {
      let taskQuery = `
        SELECT 
          t.id,
          t.title,
          t.status,
          t.created_at,
          'task' as type,
          u.name as assigned_to_name
        FROM tasks t
        LEFT JOIN users u ON t.assigned_to = u.id
        WHERE (t.title LIKE ? OR t.description LIKE ?)
      `;
      const taskParams = [searchTerm, searchTerm];

      taskQuery += ' ORDER BY t.created_at DESC LIMIT ?';
      taskParams.push(parseInt(limit));

      const [tasks] = await db.query(taskQuery, taskParams);
      results.tasks = tasks.map(t => ({
        id: t.id,
        title: t.title,
        subtitle: t.assigned_to_name || 'Unassigned',
        status: t.status,
        type: 'task',
        link: `/tasks?task=${t.id}`,
        created_at: t.created_at,
      }));
    } catch (error) {
      logger.error('Error searching tasks:', error);
    }

    // Search Projects
    try {
      const [projects] = await db.query(`
        SELECT 
          id,
          name,
          status,
          created_at,
          'project' as type
        FROM projects
        WHERE name LIKE ? OR description LIKE ?
        ORDER BY created_at DESC
        LIMIT ?
      `, [searchTerm, searchTerm, parseInt(limit)]);

      results.projects = projects.map(p => ({
        id: p.id,
        title: p.name,
        subtitle: p.status,
        status: p.status,
        type: 'project',
        link: `/projects/${p.id}`,
        created_at: p.created_at,
      }));
    } catch (error) {
      logger.error('Error searching projects:', error);
    }

    // Search Bug Comments
    try {
      const [bugComments] = await db.query(`
        SELECT 
          bc.id,
          bc.comment_text,
          bc.created_at,
          b.id as bug_id,
          b.title as bug_title,
          'bug_comment' as type,
          u.name as commenter_name
        FROM bug_comments bc
        INNER JOIN bugs b ON bc.bug_id = b.id
        LEFT JOIN users u ON bc.user_id = u.id
        WHERE bc.comment_text LIKE ?
        ORDER BY bc.created_at DESC
        LIMIT ?
      `, [searchTerm, parseInt(limit)]);

      results.bug_comments = bugComments.map(c => ({
        id: c.id,
        title: `Comment on: ${c.bug_title}`,
        subtitle: c.commenter_name || 'Unknown',
        type: 'bug_comment',
        link: `/bugs/${c.bug_id}`,
        created_at: c.created_at,
        preview: c.comment_text.substring(0, 100),
      }));
    } catch (error) {
      logger.error('Error searching bug comments:', error);
    }

    // Search Task Comments (if table exists)
    try {
      const [taskComments] = await db.query(`
        SELECT 
          tc.id,
          tc.comment,
          tc.created_at,
          t.id as task_id,
          t.title as task_title,
          'task_comment' as type,
          u.name as commenter_name
        FROM task_comments tc
        INNER JOIN tasks t ON tc.task_id = t.id
        LEFT JOIN users u ON tc.user_id = u.id
        WHERE tc.comment LIKE ?
        ORDER BY tc.created_at DESC
        LIMIT ?
      `, [searchTerm, parseInt(limit)]);

      results.task_comments = taskComments.map(c => ({
        id: c.id,
        title: `Comment on: ${c.task_title}`,
        subtitle: c.commenter_name || 'Unknown',
        type: 'task_comment',
        link: `/tasks?task=${c.task_id}`,
        created_at: c.created_at,
        preview: c.comment.substring(0, 100),
      }));
    } catch (error) {
      // Table might not exist, ignore
      logger.debug('Task comments table might not exist:', error.message);
    }

    // Search Ticket Comments
    try {
      let ticketCommentQuery = `
        SELECT 
          tc.id,
          tc.comment,
          tc.created_at,
          t.id as ticket_id,
          t.ticket_number,
          t.subject as ticket_subject,
          'ticket_comment' as type,
          u.name as commenter_name
        FROM asset_ticket_comments tc
        INNER JOIN asset_tickets t ON tc.ticket_id = t.id
        LEFT JOIN users u ON tc.created_by = u.id
        WHERE tc.comment LIKE ?
      `;
      const ticketCommentParams = [searchTerm];

      if (!isAdmin) {
        const [employee] = await db.query('SELECT id FROM employees WHERE user_id = ?', [userId]);
        if (employee.length > 0) {
          ticketCommentQuery += ' AND t.employee_id = ?';
          ticketCommentParams.push(employee[0].id);
        } else {
          ticketCommentQuery += ' AND 1=0'; // No access
        }
      }

      ticketCommentQuery += ' ORDER BY tc.created_at DESC LIMIT ?';
      ticketCommentParams.push(parseInt(limit));

      const [ticketComments] = await db.query(ticketCommentQuery, ticketCommentParams);
      results.ticket_comments = ticketComments.map(c => ({
        id: c.id,
        title: `Comment on: Ticket #${c.ticket_number}`,
        subtitle: c.commenter_name || 'Unknown',
        type: 'ticket_comment',
        link: `/it-assets/tickets/${c.ticket_id}`,
        created_at: c.created_at,
        preview: c.comment.substring(0, 100),
      }));
    } catch (error) {
      logger.error('Error searching ticket comments:', error);
    }

    // Group results
    const groups = [];
    if (results.tickets.length > 0) {
      groups.push({
        type: 'tickets',
        label: 'Tickets',
        count: results.tickets.length,
        items: results.tickets,
      });
    }
    if (results.bugs.length > 0) {
      groups.push({
        type: 'bugs',
        label: 'Bugs',
        count: results.bugs.length,
        items: results.bugs,
      });
    }
    if (results.tasks.length > 0) {
      groups.push({
        type: 'tasks',
        label: 'Tasks',
        count: results.tasks.length,
        items: results.tasks,
      });
    }
    if (results.projects.length > 0) {
      groups.push({
        type: 'projects',
        label: 'Projects',
        count: results.projects.length,
        items: results.projects,
      });
    }
    if (results.bug_comments.length > 0) {
      groups.push({
        type: 'bug_comments',
        label: 'Bug Comments',
        count: results.bug_comments.length,
        items: results.bug_comments,
      });
    }
    if (results.task_comments.length > 0) {
      groups.push({
        type: 'task_comments',
        label: 'Task Comments',
        count: results.task_comments.length,
        items: results.task_comments,
      });
    }
    if (results.ticket_comments.length > 0) {
      groups.push({
        type: 'ticket_comments',
        label: 'Ticket Comments',
        count: results.ticket_comments.length,
        items: results.ticket_comments,
      });
    }

    res.json({ data: { groups, query: q.trim() } });
  } catch (error) {
    logger.error('Error in global search:', error);
    // Don't expose internal errors, return a generic message
    const errorMessage = error.message || 'An error occurred during search';
    // Only return 500 for server errors, not authentication errors
    if (errorMessage.includes('Authentication') || errorMessage.includes('401')) {
      return res.status(401).json({ error: 'Authentication required. Please login again.' });
    }
    res.status(500).json({ error: 'Search failed. Please try again.' });
  }
});

export default router;

import express from 'express';
import { db } from '../config/database.js';
import { logger } from '../utils/logger.js';
import { authenticate, requirePermission } from '../middleware/auth.js';
import { validateAndSanitizeObject } from '../utils/inputValidation.js';
import { emitToBoard } from '../utils/socketService.js';
import { canTransitionTaskStatus } from '../utils/statusPermissions.js';
import { logCreate, logUpdate, getClientIp, getUserAgent } from '../utils/auditLogger.js';

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

/**
 * Get all boards
 */
router.get('/boards', async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let query = `
      SELECT 
        kb.*,
        u1.name as created_by_name,
        u2.name as updated_by_name,
        p.name as project_name,
        COUNT(DISTINCT kt.id) as task_count
      FROM kanban_boards kb
      LEFT JOIN users u1 ON kb.created_by = u1.id
      LEFT JOIN users u2 ON kb.updated_by = u2.id
      LEFT JOIN projects p ON kb.project_id = p.id
      LEFT JOIN kanban_tasks kt ON kb.id = kt.board_id
    `;

    // Filter by user access unless admin
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      query += `
        INNER JOIN kanban_board_members kbm ON kb.id = kbm.board_id
        WHERE kbm.user_id = ? AND kb.is_active = TRUE
      `;
    } else {
      query += ` WHERE kb.is_active = TRUE`;
    }

    query += ` GROUP BY kb.id ORDER BY kb.created_at DESC`;

    const params = userRole !== 'Super Admin' && userRole !== 'Admin' ? [userId] : [];

    const [boards] = await db.query(query, params);
    res.json({ data: boards });
  } catch (error) {
    logger.error('Error fetching boards:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get board by ID with columns and tasks
 */
router.get('/boards/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check access
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      const [members] = await db.query(
        'SELECT * FROM kanban_board_members WHERE board_id = ? AND user_id = ?',
        [id, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Get board
    const [boards] = await db.query(
      `SELECT kb.*, u1.name as created_by_name, u2.name as updated_by_name, p.name as project_name
       FROM kanban_boards kb
       LEFT JOIN users u1 ON kb.created_by = u1.id
       LEFT JOIN users u2 ON kb.updated_by = u2.id
       LEFT JOIN projects p ON kb.project_id = p.id
       WHERE kb.id = ? AND kb.is_active = TRUE`,
      [id]
    );

    if (boards.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    const board = boards[0];

    // Get columns
    const [columns] = await db.query(
      `SELECT kc.*, COUNT(kt.id) as task_count
       FROM kanban_columns kc
       LEFT JOIN kanban_tasks kt ON kc.id = kt.column_id AND kt.board_id = ?
       WHERE kc.board_id = ?
       GROUP BY kc.id
       ORDER BY kc.position ASC`,
      [id, id]
    );

    // Get tasks for each column
    const [tasks] = await db.query(
      `SELECT 
         kt.*,
         u.name as assigned_to_name,
         u.email as assigned_to_email,
         u1.name as created_by_name,
         u2.name as updated_by_name
       FROM kanban_tasks kt
       LEFT JOIN users u ON kt.assigned_to = u.id
       LEFT JOIN users u1 ON kt.created_by = u1.id
       LEFT JOIN users u2 ON kt.updated_by = u2.id
       WHERE kt.board_id = ?
       ORDER BY kt.column_id, kt.position ASC`,
      [id]
    );

    // Organize tasks by column
    const tasksByColumn = {};
    tasks.forEach(task => {
      if (!tasksByColumn[task.column_id]) {
        tasksByColumn[task.column_id] = [];
      }
      tasksByColumn[task.column_id].push(task);
    });

    // Attach tasks to columns
    columns.forEach(column => {
      column.tasks = tasksByColumn[column.id] || [];
    });

    board.columns = columns;

    res.json({ data: board });
  } catch (error) {
    logger.error('Error fetching board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create board
 */
router.post('/boards', requirePermission('tasks.create'), async (req, res) => {
  try {
    const { name, description, project_id } = req.body;
    const userId = req.user.id;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Board name is required' });
    }

    // Create board
    const [result] = await db.query(
      `INSERT INTO kanban_boards (name, description, project_id, created_by)
       VALUES (?, ?, ?, ?)`,
      [name.trim(), description || null, project_id || null, userId]
    );

    const boardId = result.insertId;

    // Create default columns
    const defaultColumns = [
      { name: 'To Do', status: 'Open', position: 0, color: '#94A3B8' },
      { name: 'In Progress', status: 'In Progress', position: 1, color: '#3B82F6' },
      { name: 'Review', status: 'Review', position: 2, color: '#F59E0B' },
      { name: 'Testing', status: 'Testing', position: 3, color: '#8B5CF6' },
      { name: 'Done', status: 'Done', position: 4, color: '#10B981' },
    ];

    for (const col of defaultColumns) {
      await db.query(
        `INSERT INTO kanban_columns (board_id, name, status, position, color)
         VALUES (?, ?, ?, ?, ?)`,
        [boardId, col.name, col.status, col.position, col.color]
      );
    }

    // Add creator as admin member
    await db.query(
      `INSERT INTO kanban_board_members (board_id, user_id, role)
       VALUES (?, ?, 'admin')`,
      [boardId, userId]
    );

    // Emit socket event
    emitToBoard(boardId, 'kanban:board_created', { boardId, name });

    res.status(201).json({ data: { id: boardId, name } });
  } catch (error) {
    logger.error('Error creating board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update board
 */
router.put('/boards/:id', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, project_id } = req.body;
    const userId = req.user.id;

    // Check access
    const [boards] = await db.query('SELECT * FROM kanban_boards WHERE id = ?', [id]);
    if (boards.length === 0) {
      return res.status(404).json({ error: 'Board not found' });
    }

    await db.query(
      `UPDATE kanban_boards 
       SET name = ?, description = ?, project_id = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [name, description || null, project_id || null, userId, id]
    );

    // Emit socket event
    emitToBoard(id, 'kanban:board_updated', { boardId: id, name, description });

    res.json({ data: { id, name } });
  } catch (error) {
    logger.error('Error updating board:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create task
 */
router.post('/boards/:boardId/tasks', requirePermission('tasks.create'), async (req, res) => {
  try {
    const { boardId } = req.params;
    const { title, description, column_id, priority, assigned_to, due_date, project_id, estimated_time } = req.body;
    const userId = req.user.id;

    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Task title is required' });
    }

    // Get column to determine status
    const [columns] = await db.query('SELECT * FROM kanban_columns WHERE id = ? AND board_id = ?', [column_id, boardId]);
    if (columns.length === 0) {
      return res.status(400).json({ error: 'Invalid column' });
    }

    const column = columns[0];

    // Get max position in column
    const [positions] = await db.query(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM kanban_tasks WHERE column_id = ?',
      [column_id]
    );
    const position = (positions[0]?.max_pos || 0) + 1;

    // Generate task code
    const [countResult] = await db.query('SELECT COUNT(*) as count FROM kanban_tasks');
    const taskCode = `KAN-${String(countResult[0].count + 1).padStart(4, '0')}`;

    // Map priority values to match database ENUM
    const priorityMap = {
      'Low': 'Low',
      'Med': 'Medium',
      'Medium': 'Medium',
      'High': 'High',
      'Critical': 'Critical'
    };
    const mappedPriority = priorityMap[priority] || 'Medium';

    // Create task
    const [result] = await db.query(
      `INSERT INTO kanban_tasks 
       (board_id, column_id, task_code, title, description, status, priority, position, assigned_to, due_date, project_id, estimated_time, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [boardId, column_id, taskCode, title.trim(), description || null, column.status, mappedPriority, position, assigned_to || null, due_date || null, project_id || null, estimated_time || null, userId]
    );

    const taskId = result.insertId;

    // Get created task with joins
    const [tasks] = await db.query(
      `SELECT kt.*, u.name as assigned_to_name, u.email as assigned_to_email
       FROM kanban_tasks kt
       LEFT JOIN users u ON kt.assigned_to = u.id
       WHERE kt.id = ?`,
      [taskId]
    );

    const task = tasks[0];

    // Log history
    await db.query(
      `INSERT INTO kanban_task_history 
       (task_id, source, new_status, new_column_id, new_position, changed_by)
       VALUES (?, 'manual', ?, ?, ?, ?)`,
      [taskId, column.status, column_id, position, userId]
    );

    // Audit log
    await logCreate(req, 'Kanban Tasks', taskId, task, 'Kanban Task');

    // Emit socket event
    emitToBoard(boardId, 'kanban:task_created', { task, boardId });

    res.status(201).json({ data: task });
  } catch (error) {
    logger.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Move task (update column and position)
 */
router.patch('/tasks/:id/move', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { column_id, position, old_column_id, old_position } = req.body;
    const userId = req.user.id;

    // Get task
    const [tasks] = await db.query('SELECT * FROM kanban_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];

    // Check if task is locked
    if (task.is_locked) {
      return res.status(400).json({ error: 'Task is locked and cannot be moved' });
    }

    // Get new column
    const [columns] = await db.query('SELECT * FROM kanban_columns WHERE id = ?', [column_id]);
    if (columns.length === 0) {
      return res.status(400).json({ error: 'Invalid column' });
    }

    const newColumn = columns[0];
    const oldStatus = task.status;
    const newStatus = newColumn.status;

    // Update positions of other tasks in the new column
    if (old_column_id !== column_id) {
      // Moving to different column - shift tasks in new column
      await db.query(
        'UPDATE kanban_tasks SET position = position + 1 WHERE column_id = ? AND position >= ? AND id != ?',
        [column_id, position, id]
      );

      // Shift tasks in old column
      if (old_column_id) {
        await db.query(
          'UPDATE kanban_tasks SET position = position - 1 WHERE column_id = ? AND position > ?',
          [old_column_id, old_position || 0]
        );
      }
    } else {
      // Same column - reorder
      if (position > (old_position || 0)) {
        await db.query(
          'UPDATE kanban_tasks SET position = position - 1 WHERE column_id = ? AND position > ? AND position <= ? AND id != ?',
          [column_id, old_position || 0, position, id]
        );
      } else {
        await db.query(
          'UPDATE kanban_tasks SET position = position + 1 WHERE column_id = ? AND position >= ? AND position < ? AND id != ?',
          [column_id, position, old_position || 0, id]
        );
      }
    }

    // Update task
    await db.query(
      `UPDATE kanban_tasks 
       SET column_id = ?, status = ?, position = ?, updated_by = ?, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`,
      [column_id, newStatus, position, userId, id]
    );

    // Log history
    await db.query(
      `INSERT INTO kanban_task_history 
       (task_id, source, old_status, new_status, old_column_id, new_column_id, old_position, new_position, changed_by)
       VALUES (?, 'manual', ?, ?, ?, ?, ?, ?, ?)`,
      [id, oldStatus, newStatus, old_column_id || task.column_id, column_id, old_position || task.position, position, userId]
    );

    // Get updated task
    const [updatedTasks] = await db.query(
      `SELECT kt.*, u.name as assigned_to_name, u.email as assigned_to_email
       FROM kanban_tasks kt
       LEFT JOIN users u ON kt.assigned_to = u.id
       WHERE kt.id = ?`,
      [id]
    );

    // Emit socket event
    emitToBoard(task.board_id, 'kanban:task_moved', {
      taskId: id,
      task: updatedTasks[0],
      boardId: task.board_id,
      oldColumnId: old_column_id || task.column_id,
      newColumnId: column_id,
      oldPosition: old_position || task.position,
      newPosition: position,
    });

    res.json({ data: updatedTasks[0] });
  } catch (error) {
    logger.error('Error moving task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update task
 */
router.put('/tasks/:id', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, priority, assigned_to, due_date, status, estimated_time, actual_time } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Get existing task
    const [tasks] = await db.query('SELECT * FROM kanban_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldTask = tasks[0];

    // Check status transition permissions if status is being changed
    if (status && status !== oldTask.status) {
      if (!canTransitionTaskStatus(oldTask.status, status, userRole)) {
        return res.status(403).json({ 
          error: `You do not have permission to change status from "${oldTask.status}" to "${status}"` 
        });
      }
    }

    // Map priority values to match database ENUM
    const priorityMap = {
      'Low': 'Low',
      'Med': 'Medium',
      'Medium': 'Medium',
      'High': 'High',
      'Critical': 'Critical'
    };
    const mappedPriority = priority ? (priorityMap[priority] || oldTask.priority) : oldTask.priority;

    // Build update query dynamically
    const updateFields = [];
    const updateValues = [];

    if (title !== undefined) {
      updateFields.push('title = ?');
      updateValues.push(title);
    }
    if (description !== undefined) {
      updateFields.push('description = ?');
      updateValues.push(description || null);
    }
    if (priority !== undefined) {
      updateFields.push('priority = ?');
      updateValues.push(mappedPriority);
    }
    if (assigned_to !== undefined) {
      updateFields.push('assigned_to = ?');
      updateValues.push(assigned_to || null);
    }
    if (due_date !== undefined) {
      updateFields.push('due_date = ?');
      updateValues.push(due_date || null);
    }
    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }
    if (estimated_time !== undefined) {
      updateFields.push('estimated_time = ?');
      updateValues.push(estimated_time || null);
    }
    if (actual_time !== undefined) {
      // Only TL/Admin can manually adjust actual_time
      if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
        return res.status(403).json({ error: 'Only Team Lead or Admin can manually adjust actual time' });
      }
      updateFields.push('actual_time = ?');
      updateValues.push(actual_time || null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateFields.push('updated_by = ?', 'updated_at = CURRENT_TIMESTAMP');
    updateValues.push(userId, id);

    // Update task
    await db.query(
      `UPDATE kanban_tasks SET ${updateFields.join(', ')} WHERE id = ?`,
      updateValues
    );

    // If status changed, update column and log history
    if (status && status !== oldTask.status) {
      // Find column with matching status
      const [newColumns] = await db.query(
        'SELECT id FROM kanban_columns WHERE board_id = ? AND status = ? LIMIT 1',
        [oldTask.board_id, status]
      );
      
      if (newColumns.length > 0) {
        const newColumnId = newColumns[0].id;
        // Get max position in new column
        const [positions] = await db.query(
          'SELECT COALESCE(MAX(position), 0) as max_pos FROM kanban_tasks WHERE column_id = ?',
          [newColumnId]
        );
        const newPosition = (positions[0]?.max_pos || 0) + 1;

        await db.query(
          'UPDATE kanban_tasks SET column_id = ?, position = ? WHERE id = ?',
          [newColumnId, newPosition, id]
        );

        // Log history
        await db.query(
          `INSERT INTO kanban_task_history 
           (task_id, source, old_status, new_status, old_column_id, new_column_id, old_position, new_position, changed_by)
           VALUES (?, 'manual', ?, ?, ?, ?, ?, ?, ?)`,
          [id, oldTask.status, status, oldTask.column_id, newColumnId, oldTask.position, newPosition, userId]
        );
      }
    }

    // Get updated task
    const [updatedTasks] = await db.query(
      `SELECT kt.*, u.name as assigned_to_name, u.email as assigned_to_email
       FROM kanban_tasks kt
       LEFT JOIN users u ON kt.assigned_to = u.id
       WHERE kt.id = ?`,
      [id]
    );

    const updatedTask = updatedTasks[0];

    // Audit log
    await logUpdate(req, 'Kanban Tasks', id, oldTask, updatedTask, 'Kanban Task');

    // Emit socket event
    emitToBoard(oldTask.board_id, 'kanban:task_updated', {
      taskId: id,
      task: updatedTask,
      boardId: oldTask.board_id,
    });

    res.json({ data: updatedTask });
  } catch (error) {
    logger.error('Error updating task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete task
 */
router.delete('/tasks/:id', requirePermission('tasks.delete'), async (req, res) => {
  try {
    const { id } = req.params;

    // Get task
    const [tasks] = await db.query('SELECT * FROM kanban_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const task = tasks[0];
    const boardId = task.board_id;

    // Delete task (cascade will handle history)
    await db.query('DELETE FROM kanban_tasks WHERE id = ?', [id]);

    // Emit socket event
    emitToBoard(boardId, 'kanban:task_deleted', { taskId: id, boardId });

    res.json({ data: { id } });
  } catch (error) {
    logger.error('Error deleting task:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get GitHub integration for board
 */
router.get('/boards/:id/integration', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;

    const [integrations] = await db.query(
      'SELECT * FROM kanban_integrations WHERE board_id = ?',
      [id]
    );

    if (integrations.length === 0) {
      return res.json({ data: null });
    }

    const integration = integrations[0];
    // Don't send secret to frontend
    delete integration.webhook_secret;

    res.json({ data: integration });
  } catch (error) {
    logger.error('Error fetching integration:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Create/Update GitHub integration
 */
router.post('/boards/:id/integration', requirePermission('tasks.edit'), async (req, res) => {
  try {
    const { id } = req.params;
    const { github_repo, webhook_secret, auto_status_enabled } = req.body;
    const userId = req.user.id;

    if (!github_repo || !webhook_secret) {
      return res.status(400).json({ error: 'GitHub repo and webhook secret are required' });
    }

    // Check if integration exists
    const [existing] = await db.query(
      'SELECT * FROM kanban_integrations WHERE board_id = ?',
      [id]
    );

    if (existing.length > 0) {
      // Update
      await db.query(
        `UPDATE kanban_integrations 
         SET github_repo = ?, webhook_secret = ?, auto_status_enabled = ?, updated_by = ?
         WHERE board_id = ?`,
        [github_repo, webhook_secret, auto_status_enabled !== false, userId, id]
      );
    } else {
      // Create
      await db.query(
        `INSERT INTO kanban_integrations (board_id, github_repo, webhook_secret, auto_status_enabled, created_by)
         VALUES (?, ?, ?, ?, ?)`,
        [id, github_repo, webhook_secret, auto_status_enabled !== false, userId]
      );
    }

    res.json({ data: { boardId: id, github_repo, auto_status_enabled } });
  } catch (error) {
    logger.error('Error saving integration:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Update column (list) - Admin/TL only
 */
router.put('/columns/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, position } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user is Admin or Team Lead
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Admin or Team Lead can edit columns' });
    }

    // Get column
    const [columns] = await db.query('SELECT * FROM kanban_columns WHERE id = ?', [id]);
    if (columns.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const column = columns[0];
    const boardId = column.board_id;

    // Check board access
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      const [members] = await db.query(
        'SELECT * FROM kanban_board_members WHERE board_id = ? AND user_id = ? AND role IN ("admin", "member")',
        [boardId, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied to this board' });
      }
    }

    // Update column
    const updateFields = [];
    const updateValues = [];

    if (name !== undefined) {
      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Column name is required' });
      }
      updateFields.push('name = ?');
      updateValues.push(name.trim());
    }

    if (position !== undefined) {
      updateFields.push('position = ?');
      updateValues.push(position);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updateValues.push(id);
    await db.query(
      `UPDATE kanban_columns SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      updateValues
    );

    // Get updated column
    const [updatedColumns] = await db.query('SELECT * FROM kanban_columns WHERE id = ?', [id]);
    const updatedColumn = updatedColumns[0];

    // Audit log
    await logUpdate(req, 'Kanban Columns', id, column, updatedColumn, 'Kanban Column');

    // Emit socket event
    emitToBoard(boardId, 'kanban:list_updated', {
      boardId,
      columnId: id,
      column: updatedColumn,
      action: 'update',
    });

    res.json({ data: updatedColumn });
  } catch (error) {
    logger.error('Error updating column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Delete column (list) - Admin/TL only
 */
router.delete('/columns/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user is Admin or Team Lead
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Admin or Team Lead can delete columns' });
    }

    // Get column
    const [columns] = await db.query('SELECT * FROM kanban_columns WHERE id = ?', [id]);
    if (columns.length === 0) {
      return res.status(404).json({ error: 'Column not found' });
    }

    const column = columns[0];
    const boardId = column.board_id;

    // Check board access
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      const [members] = await db.query(
        'SELECT * FROM kanban_board_members WHERE board_id = ? AND user_id = ? AND role IN ("admin", "member")',
        [boardId, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied to this board' });
      }
    }

    // Check if column has tasks
    const [tasks] = await db.query('SELECT COUNT(*) as count FROM kanban_tasks WHERE column_id = ?', [id]);
    if (tasks[0].count > 0) {
      return res.status(400).json({ error: 'Cannot delete column with tasks. Please move or delete tasks first.' });
    }

    // Audit log before deletion
    await logUpdate(req, 'Kanban Columns', id, column, { deleted: true }, 'Kanban Column');

    // Delete column
    await db.query('DELETE FROM kanban_columns WHERE id = ?', [id]);

    // Emit socket event
    emitToBoard(boardId, 'kanban:list_updated', {
      boardId,
      columnId: id,
      action: 'delete',
    });

    res.json({ data: { id } });
  } catch (error) {
    logger.error('Error deleting column:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Reorder columns - Admin/TL only
 */
router.patch('/boards/:boardId/columns/reorder', authenticate, async (req, res) => {
  try {
    const { boardId } = req.params;
    const { columnIds } = req.body; // Array of column IDs in new order
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check if user is Admin or Team Lead
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Admin or Team Lead can reorder columns' });
    }

    // Check board access
    if (userRole !== 'Super Admin' && userRole !== 'Admin') {
      const [members] = await db.query(
        'SELECT * FROM kanban_board_members WHERE board_id = ? AND user_id = ? AND role IN ("admin", "member")',
        [boardId, userId]
      );
      if (members.length === 0) {
        return res.status(403).json({ error: 'Access denied to this board' });
      }
    }

    if (!Array.isArray(columnIds) || columnIds.length === 0) {
      return res.status(400).json({ error: 'columnIds must be a non-empty array' });
    }

    // Update positions
    for (let i = 0; i < columnIds.length; i++) {
      await db.query(
        'UPDATE kanban_columns SET position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND board_id = ?',
        [i, columnIds[i], boardId]
      );
    }

    // Get updated columns
    const [updatedColumns] = await db.query(
      'SELECT * FROM kanban_columns WHERE board_id = ? ORDER BY position ASC',
      [boardId]
    );

    // Audit log
    await logUpdate(req, 'Kanban Columns', boardId, { reordered: true }, { columns: updatedColumns }, 'Kanban Board');

    // Emit socket event
    emitToBoard(boardId, 'kanban:list_updated', {
      boardId,
      columns: updatedColumns,
      action: 'reorder',
    });

    res.json({ data: updatedColumns });
  } catch (error) {
    logger.error('Error reordering columns:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Start time tracking for a task
 */
router.post('/tasks/:id/time/start', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get task
    const [tasks] = await db.query('SELECT * FROM kanban_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Check if user already has an active timer for this task
    const [activeLogs] = await db.query(
      'SELECT * FROM kanban_time_logs WHERE task_id = ? AND user_id = ? AND is_active = TRUE',
      [id, userId]
    );

    if (activeLogs.length > 0) {
      return res.status(400).json({ error: 'You already have an active timer for this task' });
    }

    // Create new time log entry
    const [result] = await db.query(
      `INSERT INTO kanban_time_logs (task_id, user_id, started_at, is_active)
       VALUES (?, ?, NOW(), TRUE)`,
      [id, userId]
    );

    // Audit log
    await logCreate(req, 'Kanban Time Tracking', result.insertId, { task_id: id, action: 'start' }, 'Time Log');

    res.json({ data: { id: result.insertId, started_at: new Date() } });
  } catch (error) {
    logger.error('Error starting time tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Stop time tracking for a task
 */
router.post('/tasks/:id/time/stop', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    // Get active time log
    const [activeLogs] = await db.query(
      'SELECT * FROM kanban_time_logs WHERE task_id = ? AND user_id = ? AND is_active = TRUE',
      [id, userId]
    );

    if (activeLogs.length === 0) {
      return res.status(400).json({ error: 'No active timer found for this task' });
    }

    const timeLog = activeLogs[0];
    const startedAt = new Date(timeLog.started_at);
    const endedAt = new Date();
    const durationMinutes = Math.round((endedAt - startedAt) / 1000 / 60);

    // Update time log
    await db.query(
      `UPDATE kanban_time_logs 
       SET ended_at = NOW(), duration_minutes = ?, is_active = FALSE
       WHERE id = ?`,
      [durationMinutes, timeLog.id]
    );

    // Update task's actual_time
    const [tasks] = await db.query('SELECT actual_time FROM kanban_tasks WHERE id = ?', [id]);
    const currentActualTime = tasks[0]?.actual_time || 0;
    const newActualTime = currentActualTime + (durationMinutes / 60);

    await db.query(
      'UPDATE kanban_tasks SET actual_time = ? WHERE id = ?',
      [newActualTime, id]
    );

    // Audit log
    await logUpdate(req, 'Kanban Time Tracking', timeLog.id, timeLog, { ...timeLog, ended_at: endedAt, duration_minutes: durationMinutes, is_active: false }, 'Time Log');

    res.json({ 
      data: { 
        id: timeLog.id, 
        duration_minutes: durationMinutes,
        actual_time: newActualTime
      } 
    });
  } catch (error) {
    logger.error('Error stopping time tracking:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get time tracking logs for a task
 */
router.get('/tasks/:id/time', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    const [logs] = await db.query(
      `SELECT 
         ktl.*,
         u.name as user_name,
         u.email as user_email
       FROM kanban_time_logs ktl
       LEFT JOIN users u ON ktl.user_id = u.id
       WHERE ktl.task_id = ?
       ORDER BY ktl.started_at DESC`,
      [id]
    );

    res.json({ data: logs });
  } catch (error) {
    logger.error('Error fetching time logs:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Manually adjust actual time (TL/Admin only)
 */
router.patch('/tasks/:id/time', authenticate, async (req, res) => {
  try {
    const { id } = req.params;
    const { actual_time } = req.body;
    const userId = req.user.id;
    const userRole = req.user.role;

    // Check permissions
    if (userRole !== 'Super Admin' && userRole !== 'Admin' && userRole !== 'Team Leader' && userRole !== 'Team Lead') {
      return res.status(403).json({ error: 'Only Team Lead or Admin can manually adjust actual time' });
    }

    // Get task
    const [tasks] = await db.query('SELECT actual_time FROM kanban_tasks WHERE id = ?', [id]);
    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    const oldActualTime = tasks[0].actual_time;

    // Update actual time
    await db.query(
      'UPDATE kanban_tasks SET actual_time = ? WHERE id = ?',
      [actual_time || 0, id]
    );

    // Audit log
    await logUpdate(req, 'Kanban Tasks', id, { actual_time: oldActualTime }, { actual_time }, 'Kanban Task');

    res.json({ data: { actual_time: actual_time || 0 } });
  } catch (error) {
    logger.error('Error updating actual time:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;


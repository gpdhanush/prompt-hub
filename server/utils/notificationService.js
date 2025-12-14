import { db } from '../config/database.js';
import { sendNotificationToUser } from './fcmService.js';
import { logger } from './logger.js';

/**
 * Notification Service
 * Handles creating notifications in database and sending push notifications
 */

/**
 * Format date to DD-MMM-YYYY format (e.g., "04-Dec-2025")
 */
function formatDateDDMMMYYYY(dateString) {
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
    logger.error('Error formatting date:', error);
    return '';
  }
}

/**
 * Create and send notification to a user
 * @param {number} userId - User ID to send notification to
 * @param {string} type - Notification type (e.g., 'user_updated', 'project_assigned', 'task_assigned', etc.)
 * @param {string} title - Notification title
 * @param {string} message - Notification message
 * @param {Object} payload - Additional data (optional)
 * @param {boolean} sendPush - Whether to send push notification (default: true)
 * @returns {Promise<Object>} Created notification
 */
export async function createNotification(
  userId,
  type,
  title,
  message,
  payload = null,
  sendPush = true
) {
  try {
    // Create notification in database
    const [result] = await db.query(
      `INSERT INTO notifications (user_id, type, title, message, payload, is_read, created_at)
       VALUES (?, ?, ?, ?, ?, FALSE, NOW())`,
      [
        userId,
        type,
        title,
        message,
        payload ? JSON.stringify(payload) : null,
      ]
    );

    const notificationId = result.insertId;

    // Get created notification
    const [notifications] = await db.query(
      'SELECT * FROM notifications WHERE id = ?',
      [notificationId]
    );

    const notification = notifications[0];

    // Send push notification if enabled
    if (sendPush) {
      try {
        await sendNotificationToUser(userId, {
          title,
          body: message,
          type,
          link: payload?.link || '/notifications',
        }, {
          notificationId: notificationId.toString(),
          type,
          ...payload,
        });
      } catch (pushError) {
        logger.error(`Error sending push notification to user ${userId}:`, pushError);
        // Don't fail the notification creation if push fails
      }
    }

    return notification;
  } catch (error) {
    logger.error('Error creating notification:', error);
    throw error;
  }
}

/**
 * Notify user when their details are updated by admin/TL
 */
export async function notifyUserUpdated(userId, updatedBy, changes = {}) {
  try {
    // Get updater info
    const [updaters] = await db.query(
      'SELECT name, role FROM users WHERE id = ?',
      [updatedBy]
    );
    const updater = updaters[0];

    if (!updater) return;

    const title = 'Profile Updated';
    const message = `${updater.name} (${updater.role}) has updated your profile details.`;
    
    return await createNotification(
      userId,
      'user_updated',
      title,
      message,
      {
        updatedBy: updater.name,
        updatedByRole: updater.role,
        changes: changes,
        link: '/profile-setup',
      }
    );
  } catch (error) {
    logger.error('Error notifying user update:', error);
  }
}

/**
 * Notify user when project is assigned to them
 */
export async function notifyProjectAssigned(userId, projectId, projectName, assignedBy) {
  try {
    // Get assigner info
    const [assigners] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [assignedBy]
    );
    const assigner = assigners[0]?.name || 'Admin';

    const title = 'New Project Assigned';
    const message = `You have been assigned to project: ${projectName}`;
    
    return await createNotification(
      userId,
      'project_assigned',
      title,
      message,
      {
        projectId: projectId,
        projectName: projectName,
        assignedBy: assigner,
        link: `/projects/${projectId}`,
      }
    );
  } catch (error) {
    logger.error('Error notifying project assignment:', error);
  }
}

/**
 * Notify user when task is assigned to them
 */
export async function notifyTaskAssigned(userId, taskId, taskTitle, assignedBy) {
  try {
    // Get assigner info
    const [assigners] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [assignedBy]
    );
    const assigner = assigners[0]?.name || 'Admin';

    const title = 'New Task Assigned';
    const message = `You have been assigned a new task: ${taskTitle}`;
    
    return await createNotification(
      userId,
      'task_assigned',
      title,
      message,
      {
        taskId: taskId,
        taskTitle: taskTitle,
        assignedBy: assigner,
        link: `/tasks`,
      }
    );
  } catch (error) {
    logger.error('Error notifying task assignment:', error);
  }
}

/**
 * Notify user when bug is assigned to them
 */
export async function notifyBugAssigned(userId, bugId, bugTitle, assignedBy) {
  try {
    // Get assigner info
    const [assigners] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [assignedBy]
    );
    const assigner = assigners[0]?.name || 'Admin';

    const title = 'New Bug Assigned';
    const message = `You have been assigned a bug: ${bugTitle}`;
    
    return await createNotification(
      userId,
      'bug_assigned',
      title,
      message,
      {
        bugId: bugId,
        bugTitle: bugTitle,
        assignedBy: assigner,
        link: `/bugs/${bugId}`,
      }
    );
  } catch (error) {
    logger.error('Error notifying bug assignment:', error);
  }
}

/**
 * Notify user when their assigned bug status is updated
 */
export async function notifyBugStatusUpdated(userId, bugId, bugTitle, oldStatus, newStatus, updatedBy) {
  try {
    // Get updater info
    const [updaters] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [updatedBy]
    );
    const updater = updaters[0]?.name || 'Admin';

    const title = 'Bug Status Updated';
    const message = `Bug "${bugTitle}" status changed from ${oldStatus} to ${newStatus}`;
    
    return await createNotification(
      userId,
      'bug_status_updated',
      title,
      message,
      {
        bugId: bugId,
        bugTitle: bugTitle,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedBy: updater,
        link: `/bugs/${bugId}`,
      }
    );
  } catch (error) {
    logger.error('Error notifying bug status update:', error);
  }
}

/**
 * Notify user when their leave request status is updated
 */
export async function notifyLeaveStatusUpdated(userId, leaveId, oldStatus, newStatus, updatedBy, leaveType, startDate, endDate) {
  try {
    // Get updater info
    const [updaters] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [updatedBy]
    );
    const updater = updaters[0]?.name || 'Admin';

    // Format dates to DD-MMM-YYYY format
    const formattedStartDate = formatDateDDMMMYYYY(startDate);
    const formattedEndDate = formatDateDDMMMYYYY(endDate);

    let title = 'Leave Request Updated';
    let message = '';

    if (newStatus === 'Approved') {
      title = 'Leave Request Approved';
      message = `Your ${leaveType} leave request has been approved by ${updater}.`;
    } else if (newStatus === 'Rejected') {
      title = 'Leave Request Rejected';
      message = `Your ${leaveType} leave request has been rejected by ${updater}.`;
    } else {
      message = `Your leave request status has been changed from ${oldStatus} to ${newStatus} by ${updater}.`;
    }
    
    return await createNotification(
      userId,
      'leave_status_updated',
      title,
      message,
      {
        leaveId: leaveId,
        leaveType: leaveType,
        oldStatus: oldStatus,
        newStatus: newStatus,
        startDate: formattedStartDate,
        endDate: formattedEndDate,
        updatedBy: updater,
        link: '/leaves',
      }
    );
  } catch (error) {
    logger.error('Error notifying leave status update:', error);
  }
}

/**
 * Notify user when their reimbursement status is updated
 */
export async function notifyReimbursementStatusUpdated(userId, reimbursementId, oldStatus, newStatus, updatedBy, amount, category) {
  try {
    // Get updater info
    const [updaters] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [updatedBy]
    );
    const updater = updaters[0]?.name || 'Admin';

    let title = 'Reimbursement Updated';
    let message = '';

    if (newStatus === 'Approved') {
      title = 'Reimbursement Approved';
      message = `Your reimbursement request for ${category} (Amount: ${amount}) has been approved by ${updater}.`;
    } else if (newStatus === 'Rejected') {
      title = 'Reimbursement Rejected';
      message = `Your reimbursement request for ${category} (Amount: ${amount}) has been rejected by ${updater}.`;
    } else {
      message = `Your reimbursement request status has been changed from ${oldStatus} to ${newStatus} by ${updater}.`;
    }
    
    return await createNotification(
      userId,
      'reimbursement_status_updated',
      title,
      message,
      {
        reimbursementId: reimbursementId,
        category: category,
        amount: amount,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedBy: updater,
        link: '/reimbursements',
      }
    );
  } catch (error) {
    logger.error('Error notifying reimbursement status update:', error);
  }
}

/**
 * Notify multiple users
 */
export async function notifyMultipleUsers(userIds, type, title, message, payload = null) {
  if (!userIds || userIds.length === 0) return;

  const promises = userIds.map(userId => 
    createNotification(userId, type, title, message, payload)
  );

  await Promise.allSettled(promises);
}

/**
 * Notify project members when someone comments on a project
 */
export async function notifyProjectComment(projectId, commentId, commenterId, commenterName, commentText, projectName) {
  try {
    // Get all project members (excluding the commenter)
    const [members] = await db.query(`
      SELECT DISTINCT pu.user_id
      FROM project_users pu
      WHERE pu.project_id = ? AND pu.user_id != ?
      UNION
      SELECT DISTINCT p.team_lead_id as user_id
      FROM projects p
      WHERE p.id = ? AND p.team_lead_id IS NOT NULL AND p.team_lead_id != ?
    `, [projectId, commenterId, projectId, commenterId]);

    const memberIds = members
      .map(m => m.user_id)
      .filter(id => id && id !== commenterId);

    if (memberIds.length === 0) return;

    const title = 'New Comment on Project';
    const message = `${commenterName} commented on project "${projectName}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`;

    const promises = memberIds.map(userId =>
      createNotification(
        userId,
        'project_comment',
        title,
        message,
        {
          projectId: projectId,
          projectName: projectName,
          commentId: commentId,
          commenterId: commenterId,
          commenterName: commenterName,
          link: `/projects/${projectId}`,
        }
      )
    );

    await Promise.allSettled(promises);
  } catch (error) {
    logger.error('Error notifying project comment:', error);
  }
}

/**
 * Notify users when someone comments on a bug
 */
export async function notifyBugComment(bugId, commentId, commenterId, commenterName, commentText, bugTitle, parentCommentId = null, assignedTo = null, reportedBy = null) {
  try {
    const userIdsToNotify = [];

    if (parentCommentId) {
      // This is a reply - notify the parent comment author
      const [parentComments] = await db.query(`
        SELECT user_id
        FROM bug_comments
        WHERE id = ?
      `, [parentCommentId]);

      if (parentComments.length > 0) {
        const parentAuthorId = parentComments[0].user_id;
        if (parentAuthorId !== commenterId) {
          userIdsToNotify.push(parentAuthorId);
        }
      }
    } else {
      // This is a new comment - notify bug assignee and reporter (excluding commenter)
      if (assignedTo && assignedTo !== commenterId) {
        userIdsToNotify.push(assignedTo);
      }
      if (reportedBy && reportedBy !== commenterId && reportedBy !== assignedTo) {
        userIdsToNotify.push(reportedBy);
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    if (uniqueUserIds.length === 0) return;

    const title = parentCommentId ? 'Reply to Your Comment' : 'New Comment on Bug';
    const message = parentCommentId
      ? `${commenterName} replied to your comment on bug "${bugTitle}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`
      : `${commenterName} commented on bug "${bugTitle}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`;

    const promises = uniqueUserIds.map(userId =>
      createNotification(
        userId,
        parentCommentId ? 'bug_comment_reply' : 'bug_comment',
        title,
        message,
        {
          bugId: bugId,
          bugTitle: bugTitle,
          commentId: commentId,
          commenterId: commenterId,
          commenterName: commenterName,
          parentCommentId: parentCommentId,
          link: `/bugs/${bugId}`,
        }
      )
    );

    await Promise.allSettled(promises);
  } catch (error) {
    logger.error('Error notifying bug comment:', error);
  }
}

/**
 * Notify user when their ticket/support status is updated
 */
export async function notifyTicketStatusUpdated(userId, ticketId, ticketNumber, oldStatus, newStatus, updatedBy) {
  try {
    // Get updater info
    const [updaters] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [updatedBy]
    );
    const updater = updaters[0]?.name || 'Admin';

    const title = 'Ticket Status Updated';
    const message = `Your ticket #${ticketNumber} status changed from ${oldStatus} to ${newStatus} by ${updater}.`;
    
    return await createNotification(
      userId,
      'ticket_status_updated',
      title,
      message,
      {
        ticketId: ticketId,
        ticketNumber: ticketNumber,
        oldStatus: oldStatus,
        newStatus: newStatus,
        updatedBy: updater,
        link: `/it-assets/tickets/${ticketId}`,
      }
    );
  } catch (error) {
    logger.error('Error notifying ticket status update:', error);
  }
}

/**
 * Notify users when someone comments on a ticket
 */
export async function notifyTicketComment(ticketId, commentId, commenterId, commenterName, commentText, ticketNumber, employeeId, isReply = false, parentCommentId = null) {
  try {
    const userIdsToNotify = [];

    if (isReply && parentCommentId) {
      // This is a reply - notify the parent comment author
      const [parentComments] = await db.query(`
        SELECT created_by
        FROM asset_ticket_comments
        WHERE id = ?
      `, [parentCommentId]);

      if (parentComments.length > 0) {
        const parentAuthorId = parentComments[0].created_by;
        if (parentAuthorId !== commenterId) {
          userIdsToNotify.push(parentAuthorId);
        }
      }
    } else {
      // This is a new comment - notify ticket owner (employee)
      if (employeeId) {
        const [employees] = await db.query('SELECT user_id FROM employees WHERE id = ?', [employeeId]);
        if (employees.length > 0 && employees[0].user_id !== commenterId) {
          userIdsToNotify.push(employees[0].user_id);
        }
      }
    }

    // Also notify all admins about ticket comments
    const [admins] = await db.query(`
      SELECT u.id
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name IN ('Admin', 'Super Admin') AND u.status = 'Active'
    `);
    
    admins.forEach(admin => {
      if (admin.id !== commenterId && !userIdsToNotify.includes(admin.id)) {
        userIdsToNotify.push(admin.id);
      }
    });

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    if (uniqueUserIds.length === 0) return;

    const title = isReply ? 'Reply to Your Ticket Comment' : 'New Comment on Your Ticket';
    const message = isReply
      ? `${commenterName} replied to your comment on ticket #${ticketNumber}: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`
      : `${commenterName} commented on ticket #${ticketNumber}: ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`;

    const promises = uniqueUserIds.map(userId =>
      createNotification(
        userId,
        isReply ? 'ticket_comment_reply' : 'ticket_comment',
        title,
        message,
        {
          ticketId: ticketId,
          ticketNumber: ticketNumber,
          commentId: commentId,
          commenterId: commenterId,
          commenterName: commenterName,
          parentCommentId: parentCommentId,
          link: `/it-assets/tickets/${ticketId}`,
        }
      )
    );

    await Promise.allSettled(promises);
  } catch (error) {
    logger.error('Error notifying ticket comment:', error);
  }
}

/**
 * Notify user about calendar reminder (10 minutes before)
 */
export async function notifyCalendarReminder(userId, reminderTitle, reminderDate, reminderTime) {
  try {
    const title = 'Reminder: Upcoming Event';
    const message = `${reminderTitle} is scheduled in 10 minutes (${reminderTime}).`;
    
    return await createNotification(
      userId,
      'calendar_reminder',
      title,
      message,
      {
        reminderTitle: reminderTitle,
        reminderDate: reminderDate,
        reminderTime: reminderTime,
        link: '/dashboard',
      }
    );
  } catch (error) {
    logger.error('Error notifying calendar reminder:', error);
  }
}

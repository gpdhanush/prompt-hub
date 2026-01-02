import { db } from '../config/database.js';
import { sendNotificationToUser } from './fcmService.js';
import { sendEmail } from './emailService.js';
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
    // Check for duplicate notification (same user, type, title, and message within last 5 minutes)
    const [existingNotifications] = await db.query(
      `SELECT id FROM notifications
       WHERE user_id = ?
         AND type = ?
         AND title = ?
         AND message = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
      [userId, type, title, message]
    );

    // If duplicate found, skip creating new notification
    if (existingNotifications.length > 0) {
      logger.debug(`Duplicate notification skipped for user ${userId}, type: ${type}`);
      return existingNotifications[0];
    }

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
        // Convert all payload values to strings (FCM requirement)
        const stringifiedPayload = payload ? Object.entries(payload).reduce((acc, [key, value]) => {
          acc[key] = value !== null && value !== undefined ? String(value) : '';
          return acc;
        }, {}) : {};
        
        await sendNotificationToUser(userId, {
          title,
          body: message,
          type,
          link: payload?.link || '/notifications',
        }, {
          notificationId: notificationId.toString(),
          type,
          ...stringifiedPayload,
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
    // Get assigner info and project UUID
    const [assigners] = await db.query(
      'SELECT name FROM users WHERE id = ?',
      [assignedBy]
    );
    const assigner = assigners[0]?.name || 'Admin';

    // Get project UUID if available
    const [projects] = await db.query(
      'SELECT uuid FROM projects WHERE id = ?',
      [projectId]
    );
    const projectUuid = projects[0]?.uuid || null;

    const title = 'New Project Assigned';
    const message = `You have been assigned to project: ${projectName}`;
    
    // Use UUID if available, otherwise use numeric ID
    const projectIdentifier = projectUuid || projectId;
    
    return await createNotification(
      userId,
      'project_assigned',
      title,
      message,
      {
        projectId: projectId,
        projectUuid: projectUuid,
        projectName: projectName,
        assignedBy: assigner,
        link: `/projects/${projectIdentifier}`,
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
    
    const notification = await createNotification(
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

    // Send email to user about leave status update (using template)
    try {
      const { renderLeaveStatusEmail } = await import('./emailTemplates.js');
      const [users] = await db.query('SELECT email, name FROM users WHERE id = ?', [userId]);
      const userInfo = users[0];
      if (userInfo && userInfo.email) {
        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
        const leaveLink = `${baseUrl}/leaves/${leaveId}`;
        const emailHtml = renderLeaveStatusEmail({
          userName: userInfo.name,
          leaveType: leaveType,
          startDate: startDate,
          endDate: endDate,
          status: newStatus,
          link: leaveLink,
        });
        await sendEmail({ to: userInfo.email, subject: title, html: emailHtml });
      }
    } catch (emailErr) {
      logger.error('Failed to send leave status email:', emailErr);
    }

    return notification;
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
    
    const notification = await createNotification(
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

    // Send email to user about reimbursement status update (using template)
    try {
      const { renderReimbursementStatusEmail } = await import('./emailTemplates.js');
      const [users] = await db.query('SELECT email, name FROM users WHERE id = ?', [userId]);
      const userInfo = users[0];
      if (userInfo && userInfo.email) {
        const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
        const reimbursementLink = `${baseUrl}/reimbursements/${reimbursementId}`;
        const emailHtml = renderReimbursementStatusEmail({
          userName: userInfo.name,
          claimCode: reimbursementId, // numeric id used if claim code not available here
          amount: amount,
          category: category,
          status: newStatus,
          link: reimbursementLink,
        });
        await sendEmail({ to: userInfo.email, subject: title, html: emailHtml });
      }
    } catch (emailErr) {
      logger.error('Failed to send reimbursement status email:', emailErr);
    }

    return notification;
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

    // Get user emails for email notifications
    const [users] = await db.query(
      'SELECT id, email, name FROM users WHERE id IN (?)',
      [uniqueUserIds]
    );
    const userEmailMap = new Map(users.map(u => [u.id, { email: u.email, name: u.name }]));

    const promises = uniqueUserIds.map(async (userId) => {
      // Create notification (includes FCM push)
      await createNotification(
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
      );

      // Send email notification
      const userInfo = userEmailMap.get(userId);
      if (userInfo && userInfo.email) {
        try {
          const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
          const bugLink = `${baseUrl}/bugs/${bugId}`;
          const emailSubject = parentCommentId 
            ? `Reply to your comment on bug: ${bugTitle}`
            : `New comment on bug: ${bugTitle}`;
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${emailSubject}</h2>
              <p>Hello ${userInfo.name || 'User'},</p>
              <p>${message}</p>
              <p style="margin-top: 20px;">
                <a href="${bugLink}" style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Bug
                </a>
              </p>
              <p style="margin-top: 20px; color: #666; font-size: 12px;">
                This is an automated notification from the Project Management System.
              </p>
            </div>
          `;

          await sendEmail({
            to: userInfo.email,
            subject: emailSubject,
            html: emailHtml,
          });
          logger.debug(`Email notification sent to ${userInfo.email} for bug comment`);
        } catch (emailError) {
          logger.error(`Failed to send email notification to user ${userId}:`, emailError);
          // Don't fail the whole notification if email fails
        }
      }
    });

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
 * Notify users when someone comments on a task
 */
export async function notifyTaskComment(taskId, commentId, commenterId, commenterName, commentText, taskTitle, parentCommentId = null, assignedTo = null) {
  try {
    const userIdsToNotify = [];

    if (parentCommentId) {
      // This is a reply - notify the parent comment author
      const [parentComments] = await db.query(`
        SELECT user_id
        FROM task_comments
        WHERE id = ?
      `, [parentCommentId]);

      if (parentComments.length > 0) {
        const parentAuthorId = parentComments[0].user_id;
        if (parentAuthorId !== commenterId) {
          userIdsToNotify.push(parentAuthorId);
        }
      }
    } else {
      // This is a new comment - notify the assigned person (excluding commenter)
      if (assignedTo && assignedTo !== commenterId) {
        userIdsToNotify.push(assignedTo);
      }
    }

    // Remove duplicates
    const uniqueUserIds = [...new Set(userIdsToNotify)];

    if (uniqueUserIds.length === 0) return;

    const title = parentCommentId ? 'Reply to Your Comment' : 'New Comment on Task';
    const message = parentCommentId
      ? `${commenterName} replied to your comment on task "${taskTitle}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`
      : `${commenterName} added a comment on task "${taskTitle}": ${commentText.substring(0, 100)}${commentText.length > 100 ? '...' : ''}`;

    // Get user emails for email notifications
    const [users] = await db.query(
      'SELECT id, email, name FROM users WHERE id IN (?)',
      [uniqueUserIds]
    );
    const userEmailMap = new Map(users.map(u => [u.id, { email: u.email, name: u.name }]));

    const promises = uniqueUserIds.map(async (userId) => {
      // Create notification (includes FCM push)
      await createNotification(
        userId,
        parentCommentId ? 'task_comment_reply' : 'task_comment',
        title,
        message,
        {
          taskId: taskId,
          taskTitle: taskTitle,
          commentId: commentId,
          commenterId: commenterId,
          commenterName: commenterName,
          parentCommentId: parentCommentId,
          link: `/tasks/${taskId}`,
        }
      );

      // Send email notification
      const userInfo = userEmailMap.get(userId);
      if (userInfo && userInfo.email) {
        try {
          const baseUrl = process.env.FRONTEND_URL || process.env.APP_URL || 'http://localhost:8080';
          const taskLink = `${baseUrl}/tasks/${taskId}`;
          const emailSubject = parentCommentId 
            ? `Reply to your comment on task: ${taskTitle}`
            : `New comment on task: ${taskTitle}`;
          
          const emailHtml = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #333;">${emailSubject}</h2>
              <p>Hello ${userInfo.name || 'User'},</p>
              <p>${message}</p>
              <p style="margin-top: 20px;">
                <a href="${taskLink}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
                  View Task
                </a>
              </p>
              <p style="margin-top: 20px; color: #666; font-size: 12px;">
                This is an automated notification from the Project Management System.
              </p>
            </div>
          `;

          await sendEmail({
            to: userInfo.email,
            subject: emailSubject,
            html: emailHtml,
          });
          logger.debug(`Email notification sent to ${userInfo.email} for task comment`);
        } catch (emailError) {
          logger.error(`Failed to send email notification to user ${userId}:`, emailError);
          // Don't fail the whole notification if email fails
        }
      }
    });

    await Promise.allSettled(promises);
  } catch (error) {
    logger.error('Error notifying task comment:', error);
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

import { db } from '../config/database.js';
import { sendEmail } from './emailService.js';
import { createNotification } from './notificationService.js';
import { logger } from './logger.js';

/**
 * Check for tickets that are not completed in 3 days and escalate to Super Admin
 * This should be called periodically (e.g., daily via cron job)
 */
export async function checkAndEscalateTickets() {
  try {
    // Get tickets that are open/approved/in_progress and created more than 3 days ago
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    
    // Check if escalated_at column exists, if not, use a workaround
    let escalatedColumnCheck = '';
    try {
      const [columns] = await db.query(`
        SELECT COLUMN_NAME 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'asset_tickets' 
        AND COLUMN_NAME = 'escalated_at'
      `);
      if (columns.length > 0) {
        escalatedColumnCheck = 'AND (t.escalated_at IS NULL OR t.escalated_at < DATE_SUB(NOW(), INTERVAL 24 HOUR))';
      }
    } catch (error) {
      logger.warn('[Ticket Escalation] Could not check for escalated_at column:', error.message);
    }
    
    const [tickets] = await db.query(`
      SELECT 
        t.id,
        t.ticket_number,
        t.subject,
        t.description,
        t.status,
        t.priority,
        t.created_at,
        DATEDIFF(NOW(), t.created_at) as days_open,
        e.emp_code,
        u.name as employee_name,
        u.email as employee_email
      FROM asset_tickets t
      LEFT JOIN employees e ON t.employee_id = e.id
      LEFT JOIN users u ON e.user_id = u.id
      WHERE t.status NOT IN ('resolved', 'closed')
        AND t.created_at <= ?
        ${escalatedColumnCheck}
      ORDER BY t.created_at ASC
    `, [threeDaysAgo]);

    if (tickets.length === 0) {
      logger.debug('[Ticket Escalation] No tickets need escalation');
      return { escalated: 0 };
    }

    logger.info(`[Ticket Escalation] Found ${tickets.length} tickets to escalate`);

    // Get all Super Admin users
    const [superAdmins] = await db.query(`
      SELECT u.id, u.name, u.email
      FROM users u
      INNER JOIN roles r ON u.role_id = r.id
      WHERE r.name = 'Super Admin' AND u.status = 'Active'
    `);

    if (superAdmins.length === 0) {
      logger.warn('[Ticket Escalation] No Super Admin users found');
      return { escalated: 0 };
    }

    let escalatedCount = 0;

    for (const ticket of tickets) {
      try {
        // Send notification and email to all Super Admins
        for (const superAdmin of superAdmins) {
          // Create notification
          await createNotification(
            superAdmin.id,
            'ticket_escalation',
            'Ticket Escalation Required',
            `Ticket #${ticket.ticket_number} has been open for ${ticket.days_open} days and requires attention. Subject: ${ticket.subject}`,
            {
              ticketId: ticket.id,
              ticketNumber: ticket.ticket_number,
              daysOpen: ticket.days_open,
              priority: ticket.priority,
              link: `/it-assets/tickets/${ticket.id}`,
            }
          );

          // Send email
          try {
            const emailSubject = `[URGENT] Ticket Escalation: #${ticket.ticket_number} - ${ticket.days_open} Days Open`;
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
                  .ticket-box { background: white; border-left: 4px solid #dc2626; padding: 20px; margin: 20px 0; border-radius: 4px; }
                  .info-row { margin: 10px 0; }
                  .label { font-weight: bold; color: #666; }
                  .value { color: #333; }
                  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                  .warning { background: #fee2e2; border-left: 4px solid #dc2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>🚨 Ticket Escalation Alert</h1>
                    <p>Action Required</p>
                  </div>
                  <div class="content">
                    <div class="warning">
                      <strong>⚠️ This ticket has been open for ${ticket.days_open} days and requires immediate attention.</strong>
                    </div>
                    
                    <div class="ticket-box">
                      <div class="info-row">
                        <span class="label">Ticket Number:</span>
                        <span class="value">#${ticket.ticket_number}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">Subject:</span>
                        <span class="value">${ticket.subject}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">Status:</span>
                        <span class="value">${ticket.status}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">Priority:</span>
                        <span class="value">${ticket.priority}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">Days Open:</span>
                        <span class="value"><strong>${ticket.days_open} days</strong></span>
                      </div>
                      <div class="info-row">
                        <span class="label">Created By:</span>
                        <span class="value">${ticket.employee_name || 'Unknown'} ${ticket.emp_code ? `(${ticket.emp_code})` : ''}</span>
                      </div>
                      <div class="info-row">
                        <span class="label">Created Date:</span>
                        <span class="value">${new Date(ticket.created_at).toLocaleDateString('en-US', { 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}</span>
                      </div>
                      <div class="info-row" style="margin-top: 15px;">
                        <span class="label">Description:</span>
                        <div class="value" style="margin-top: 5px; padding: 10px; background: #f3f4f6; border-radius: 4px;">
                          ${ticket.description || 'No description provided'}
                        </div>
                      </div>
                    </div>
                    
                    <p style="margin-top: 20px;">
                      <strong>Please review and take appropriate action on this ticket.</strong>
                    </p>
                    
                    <p style="margin-top: 20px;">
                      <a href="${process.env.FRONTEND_URL || 'http://localhost:8080'}/it-assets/tickets/${ticket.id}" 
                         style="display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Ticket
                      </a>
                    </p>
                    
                    <p style="margin-top: 20px; color: #666; font-size: 14px;">
                      Best regards,<br>Naethra EMS System
                    </p>
                  </div>
                  <div class="footer">
                    <p>This is an automated escalation email. Please do not reply to this message.</p>
                    <p>&copy; ${new Date().getFullYear()} Naethra Technologies Pvt. Ltd. All rights reserved.</p>
                  </div>
                </div>
              </body>
              </html>
            `;

            await sendEmail({
              to: superAdmin.email,
              subject: emailSubject,
              html: emailHtml,
            });

            logger.info(`[Ticket Escalation] Sent email to Super Admin ${superAdmin.email} for ticket #${ticket.ticket_number}`);
          } catch (emailError) {
            logger.error(`[Ticket Escalation] Failed to send email to ${superAdmin.email}:`, emailError);
            // Continue even if email fails
          }
        }

        // Mark ticket as escalated (if column exists)
        try {
          await db.query(
            'UPDATE asset_tickets SET escalated_at = NOW() WHERE id = ?',
            [ticket.id]
          );
        } catch (error) {
          // Column might not exist yet, that's okay
          logger.debug('[Ticket Escalation] escalated_at column might not exist:', error.message);
        }

        escalatedCount++;
        logger.info(`[Ticket Escalation] Escalated ticket #${ticket.ticket_number} (${ticket.days_open} days open)`);
      } catch (error) {
        logger.error(`[Ticket Escalation] Error escalating ticket #${ticket.ticket_number}:`, error);
      }
    }

    return { escalated: escalatedCount };
  } catch (error) {
    logger.error('[Ticket Escalation] Error checking tickets:', error);
    throw error;
  }
}

/**
 * Initialize ticket escalation scheduler
 * This should be called when the server starts
 * Checks every 6 hours for tickets that need escalation
 */
export function initializeTicketEscalationScheduler() {
  // Check tickets every 6 hours
  setInterval(async () => {
    try {
      const result = await checkAndEscalateTickets();
      if (result.escalated > 0) {
        logger.info(`[Ticket Escalation] Escalated ${result.escalated} tickets`);
      }
    } catch (error) {
      logger.error('[Ticket Escalation] Error in escalation scheduler:', error);
    }
  }, 6 * 60 * 60 * 1000); // Every 6 hours

  // Run once on startup (after 1 minute delay to let server fully start)
  setTimeout(async () => {
    try {
      const result = await checkAndEscalateTickets();
      if (result.escalated > 0) {
        logger.info(`[Ticket Escalation] Escalated ${result.escalated} tickets on startup`);
      }
    } catch (error) {
      logger.error('[Ticket Escalation] Error in startup escalation check:', error);
    }
  }, 60 * 1000); // 1 minute delay

  logger.info('[Ticket Escalation] Ticket escalation scheduler initialized - checking every 6 hours');
}


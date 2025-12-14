import { db } from '../config/database.js';
import { notifyCalendarReminder } from './notificationService.js';
import { logger } from './logger.js';

/**
 * Check for reminders that need to be sent (10 minutes before)
 * This should be called periodically (e.g., every minute via cron job)
 */
export async function checkAndSendReminders() {
  try {
    // Get current time and 10 minutes from now
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Format dates for SQL
    const today = now.toISOString().split('T')[0];
    const targetDate = tenMinutesFromNow.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
    const targetTime = tenMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5);

    // Find reminders that should be sent now (within the next 10 minutes)
    // We check reminders where:
    // 1. The date is today or the target date
    // 2. The time is between now and 10 minutes from now
    // 3. They haven't been completed
    // 4. They haven't been sent yet (we'll track this with a sent_at field or similar)

    const [reminders] = await db.query(`
      SELECT 
        r.*,
        u.id as user_id
      FROM calendar_reminders r
      INNER JOIN users u ON r.user_id = u.id
      WHERE r.is_completed = FALSE
        AND (
          (r.reminder_date = ? AND r.reminder_time >= ? AND r.reminder_time <= ?)
          OR
          (r.reminder_date = ? AND r.reminder_time <= ?)
        )
        AND (r.sent_at IS NULL OR r.sent_at < DATE_SUB(NOW(), INTERVAL 1 HOUR))
      ORDER BY r.reminder_date ASC, r.reminder_time ASC
    `, [today, currentTime, targetTime, targetDate, targetTime]);

    logger.debug(`Found ${reminders.length} reminders to send`);

    // Send notifications for each reminder
    for (const reminder of reminders) {
      try {
        const reminderDateTime = new Date(`${reminder.reminder_date} ${reminder.reminder_time}`);
        const reminderTimeStr = reminder.reminder_time.substring(0, 5); // HH:MM format

        await notifyCalendarReminder(
          reminder.user_id,
          reminder.title,
          reminder.reminder_date,
          reminderTimeStr
        );

        // Mark as sent (we'll add a sent_at field to track)
        // For now, we'll just log it. You can add a sent_at column if needed
        logger.info(`Sent reminder notification for user ${reminder.user_id}: ${reminder.title}`);

        // Update sent_at timestamp if column exists
        try {
          await db.query(
            'UPDATE calendar_reminders SET sent_at = NOW() WHERE id = ?',
            [reminder.id]
          );
        } catch (error) {
          // Column might not exist yet, that's okay
          logger.debug('sent_at column might not exist:', error.message);
        }
      } catch (error) {
        logger.error(`Error sending reminder ${reminder.id}:`, error);
      }
    }

    return reminders.length;
  } catch (error) {
    logger.error('Error checking reminders:', error);
    throw error;
  }
}

/**
 * Initialize reminder scheduler
 * This should be called when the server starts
 */
export function initializeReminderScheduler() {
  // Check reminders every minute
  setInterval(async () => {
    try {
      await checkAndSendReminders();
    } catch (error) {
      logger.error('Error in reminder scheduler:', error);
    }
  }, 60 * 1000); // Every minute

  logger.info('Reminder scheduler initialized - checking every minute');
}

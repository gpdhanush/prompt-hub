import nodemailer from 'nodemailer';
import { logger } from './logger.js';

let transporter = null;

/**
 * Initialize email transporter from environment variables
 */
export function initializeEmailService() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME
  } = process.env;

  // Check if email configuration is available
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) {
    logger.warn('Email service not configured. SMTP credentials missing in environment variables.');
    return false;
  }

  try {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: parseInt(SMTP_PORT || '587'),
      secure: SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASSWORD,
      },
    });

    logger.info('Email service initialized successfully');
    return true;
  } catch (error) {
    logger.error('Failed to initialize email service:', error);
    return false;
  }
}

/**
 * Send email
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} options.text - Plain text content (optional)
 * @returns {Promise<Object>} - Send result
 */
export async function sendEmail({ to, subject, html, text }) {
  if (!transporter) {
    const initialized = initializeEmailService();
    if (!initialized) {
      throw new Error('Email service is not configured. Please set SMTP environment variables.');
    }
  }

  const {
    SMTP_FROM_EMAIL,
    SMTP_FROM_NAME
  } = process.env;

  const from = SMTP_FROM_NAME 
    ? `${SMTP_FROM_NAME} <${SMTP_FROM_EMAIL || SMTP_USER}>`
    : (SMTP_FROM_EMAIL || SMTP_USER);

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      text: text || html.replace(/<[^>]*>/g, ''), // Strip HTML if text not provided
      html,
    });

    logger.info(`Email sent successfully to ${to}:`, info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    logger.error('Failed to send email:', error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
}

/**
 * Send password reset OTP email
 * @param {string} to - Recipient email
 * @param {string} otp - OTP code
 * @param {string} userName - User's name
 * @returns {Promise<Object>} - Send result
 */
export async function sendPasswordResetOTP(to, otp, userName = 'User') {
  const subject = 'Password Reset OTP - Naethra EMS';
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
        .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
        .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
        .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Naethra EMS</h1>
          <p>Password Reset Request</p>
        </div>
        <div class="content">
          <p>Hello ${userName},</p>
          <p>You have requested to reset your password. Please use the following OTP (One-Time Password) to verify your identity:</p>
          
          <div class="otp-box">
            <p style="margin: 0; color: #666; font-size: 14px;">Your OTP Code</p>
            <div class="otp-code">${otp}</div>
          </div>
          
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This OTP is valid for 10 minutes only</li>
              <li>Do not share this OTP with anyone</li>
              <li>If you did not request this, please ignore this email</li>
            </ul>
          </div>
          
          <p>If you did not request a password reset, please contact your administrator immediately.</p>
          
          <p>Best regards,<br>Naethra Technologies Pvt. Ltd.</p>
        </div>
        <div class="footer">
          <p>This is an automated email. Please do not reply to this message.</p>
          <p>&copy; ${new Date().getFullYear()} Naethra Technologies Pvt. Ltd. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  return await sendEmail({ to, subject, html });
}

// Initialize email service on module load
initializeEmailService();


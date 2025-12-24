// Modern email templates for the application
// Exports functions that return HTML strings for various notification types

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function baseHeader(title) {
  return `
    <div style="background: linear-gradient(135deg,#667eea 0%,#764ba2 100%); padding: 28px; text-align:center; color: #fff; border-radius: 12px 12px 0 0;">
      <h1 style="margin:0;font-family:Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; font-size:20px;">${escapeHtml(title)}</h1>
    </div>`;
}

function footer() {
  return `
    <div style="padding:14px 20px; font-size:12px; color:#666; text-align:center;">
      <p style="margin:6px 0;">This is an automated message from the Naethra EMS.</p>
    </div>`;
}

function ctaButton(text, href, color = '#007bff') {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;padding:10px 18px;background:${color};color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">${escapeHtml(text)}</a>`;
}

export function renderReimbursementRequestEmail({ approverName, claimCode, amount, category, employeeName, link }) {
  const title = 'New Reimbursement Request';
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; max-width:680px;margin:0 auto;border:1px solid #eef2ff;border-radius:12px;overflow:hidden;">
      ${baseHeader(title)}
      <div style="padding:20px;background:#fff;color:#111;">
        <p style="margin:0 0 12px;">Hello ${escapeHtml(approverName || 'Approver')},</p>
        <p style="margin:0 0 12px; color:#444;">A new reimbursement request has been submitted and requires your review.</p>

        <div style="background:#f7f9ff;border:1px solid #eef2ff;padding:12px;border-radius:8px;margin:12px 0;">
          <p style="margin:6px 0;"><strong>Claim Code:</strong> ${escapeHtml(claimCode)}</p>
          <p style="margin:6px 0;"><strong>Employee:</strong> ${escapeHtml(employeeName)}</p>
          <p style="margin:6px 0;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
          <p style="margin:6px 0;"><strong>Category:</strong> ${escapeHtml(category)}</p>
        </div>

        <div style="text-align:center;margin-top:14px;">${ctaButton('Review Request', link, '#6b46c1')}</div>
      </div>
      ${footer()}
    </div>`;
}

export function renderReimbursementStatusEmail({ userName, claimCode, amount, category, status, link }) {
  const title = status === 'Approved' ? 'Reimbursement Approved' : status === 'Rejected' ? 'Reimbursement Rejected' : 'Reimbursement Update';
  const color = status === 'Approved' ? '#16a34a' : status === 'Rejected' ? '#dc2626' : '#0ea5e9';
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; max-width:680px;margin:0 auto;border:1px solid #eef2ff;border-radius:12px;overflow:hidden;">
      ${baseHeader(title)}
      <div style="padding:20px;background:#fff;color:#111;">
        <p style="margin:0 0 12px;">Hello ${escapeHtml(userName || 'User')},</p>
        <p style="margin:0 0 12px; color:#444;">Your reimbursement request has been <strong style="color:${color};">${escapeHtml(status)}</strong>.</p>
        <div style="background:#f7f9ff;border:1px solid #eef2ff;padding:12px;border-radius:8px;margin:12px 0;">
          <p style="margin:6px 0;"><strong>Claim Code:</strong> ${escapeHtml(claimCode)}</p>
          <p style="margin:6px 0;"><strong>Amount:</strong> ${escapeHtml(amount)}</p>
          <p style="margin:6px 0;"><strong>Category:</strong> ${escapeHtml(category)}</p>
        </div>
        <div style="text-align:center;margin-top:14px;">${ctaButton('View Reimbursement', link, '#6b46c1')}</div>
      </div>
      ${footer()}
    </div>`;
}

export function renderLeaveRequestEmail({ approverName, employeeName, leaveType, startDate, endDate, reason, link }) {
  const title = 'New Leave Request';
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; max-width:680px;margin:0 auto;border:1px solid #eef2ff;border-radius:12px;overflow:hidden;">
      ${baseHeader(title)}
      <div style="padding:20px;background:#fff;color:#111;">
        <p style="margin:0 0 12px;">Hello ${escapeHtml(approverName || 'Approver')},</p>
        <p style="margin:0 0 12px; color:#444;">${escapeHtml(employeeName)} has submitted a leave request that requires your attention.</p>

        <div style="background:#f7f9ff;border:1px solid #eef2ff;padding:12px;border-radius:8px;margin:12px 0;">
          <p style="margin:6px 0;"><strong>Type:</strong> ${escapeHtml(leaveType)}</p>
          <p style="margin:6px 0;"><strong>Start:</strong> ${escapeHtml(startDate)}</p>
          <p style="margin:6px 0;"><strong>End:</strong> ${escapeHtml(endDate)}</p>
          <p style="margin:6px 0;"><strong>Reason:</strong> ${escapeHtml(reason || 'N/A')}</p>
        </div>

        <div style="text-align:center;margin-top:14px;">${ctaButton('Review Leave', link, '#6b46c1')}</div>
      </div>
      ${footer()}
    </div>`;
}

export function renderLeaveStatusEmail({ userName, leaveType, startDate, endDate, status, link }) {
  const title = status === 'Approved' ? 'Leave Approved' : status === 'Rejected' ? 'Leave Rejected' : 'Leave Update';
  const color = status === 'Approved' ? '#16a34a' : status === 'Rejected' ? '#dc2626' : '#0ea5e9';
  return `
    <div style="font-family: Inter, system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', Arial; max-width:680px;margin:0 auto;border:1px solid #eef2ff;border-radius:12px;overflow:hidden;">
      ${baseHeader(title)}
      <div style="padding:20px;background:#fff;color:#111;">
        <p style="margin:0 0 12px;">Hello ${escapeHtml(userName || 'User')},</p>
        <p style="margin:0 0 12px; color:#444;">Your leave request has been <strong style="color:${color};">${escapeHtml(status)}</strong>.</p>
        <div style="background:#f7f9ff;border:1px solid #eef2ff;padding:12px;border-radius:8px;margin:12px 0;">
          <p style="margin:6px 0;"><strong>Type:</strong> ${escapeHtml(leaveType)}</p>
          <p style="margin:6px 0;"><strong>Start:</strong> ${escapeHtml(startDate)}</p>
          <p style="margin:6px 0;"><strong>End:</strong> ${escapeHtml(endDate)}</p>
        </div>
        <div style="text-align:center;margin-top:14px;">${ctaButton('View Leave', link, '#6b46c1')}</div>
      </div>
      ${footer()}
    </div>`;
}

export default {
  renderReimbursementRequestEmail,
  renderReimbursementStatusEmail,
  renderLeaveRequestEmail,
  renderLeaveStatusEmail,
};

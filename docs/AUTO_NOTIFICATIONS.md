# Automatic Notifications System

## Overview

The system now automatically sends push notifications and saves notifications to the database when specific events occur. All notifications are **user-specific** (not global broadcasts).

## Notification Service

**File:** `server/utils/notificationService.js`

This service handles:
- Creating notifications in the database
- Sending push notifications via FCM
- User-specific notification targeting

## Automatic Notification Triggers

### 1. User Details Updated ✅
**Route:** `PUT /api/users/:id`
**Triggered when:**
- Super Admin, Team Leader, or Team Lead updates a user's details
- Only notifies the user being updated (not the updater)

**Notification includes:**
- Who updated the profile
- What fields were changed

### 2. Project Assigned ✅
**Routes:** 
- `POST /api/projects` (when creating project with members)
- `PUT /api/projects/:id` (when adding new members)

**Triggered when:**
- Project is created with members assigned
- New members are added to an existing project

**Notification includes:**
- Project name
- Who assigned the project

### 3. Task Assigned ✅
**Routes:**
- `POST /api/tasks` (when creating task)
- `PUT /api/tasks/:id` (when assigning task)

**Triggered when:**
- Task is created and assigned to user(s)
- Task assignment is updated (assigned_to, developer_id, designer_id, tester_id)

**Notification includes:**
- Task title
- Who assigned the task

### 4. Bug Assigned ✅
**Route:** `POST /api/bugs`
**Triggered when:**
- Bug is created and assigned to a user

**Notification includes:**
- Bug title
- Who assigned the bug

### 5. Bug Status Updated ✅
**Route:** `PUT /api/bugs/:id`
**Triggered when:**
- Status of an assigned bug is changed
- Only notifies the user assigned to the bug

**Notification includes:**
- Bug title
- Old status → New status
- Who updated the status

### 6. Leave Request Status Updated ✅
**Route:** `PUT /api/leaves/:id`
**Triggered when:**
- Leave request status changes (Pending → Approved/Rejected)
- Only notifies the employee who requested the leave

**Notification includes:**
- Leave type
- Date range
- Old status → New status
- Who approved/rejected

### 7. Reimbursement Status Updated ✅
**Route:** `PUT /api/reimbursements/:id`
**Triggered when:**
- Reimbursement status changes (Pending → Approved/Rejected)
- Only notifies the employee who submitted the reimbursement

**Notification includes:**
- Category and amount
- Old status → New status
- Who approved/rejected

### 8. Project Comment Added ✅
**Route:** `POST /api/projects/:id/comments`
**Triggered when:**
- Someone adds a comment on a project
- Notifies all project members (excluding the commenter)

**Notification includes:**
- Project name
- Commenter name
- Comment preview (first 100 characters)
- Link to project

### 9. Bug Comment Added ✅
**Route:** `POST /api/bugs/:id/comments`
**Triggered when:**
- Someone adds a new comment on a bug (not a reply)
- Notifies bug assignee and reporter (excluding the commenter)

**Notification includes:**
- Bug title
- Commenter name
- Comment preview (first 100 characters)
- Link to bug

### 10. Bug Comment Reply ✅
**Route:** `POST /api/bugs/:id/comments` (with `parent_id`)
**Triggered when:**
- Someone replies to a comment on a bug
- Only notifies the original comment author (excluding the replier)

**Notification includes:**
- Bug title
- Replier name
- Reply preview (first 100 characters)
- Link to bug

## Notification Storage

All notifications are saved to the `notifications` table with:
- `user_id` - Target user
- `type` - Notification type (user_updated, project_assigned, etc.)
- `title` - Notification title
- `message` - Notification message
- `payload` - Additional data (JSON)
- `is_read` - Read status
- `created_at` - Timestamp

## Push Notifications

In addition to database storage, notifications are also sent as:
- **Push notifications** via FCM (if user has FCM token registered)
- **In-app notifications** (visible in Notifications page)

## Implementation Details

### Notification Service Functions

```javascript
// Generic notification creator
createNotification(userId, type, title, message, payload, sendPush)

// Specific notification helpers
notifyUserUpdated(userId, updatedBy, changes)
notifyProjectAssigned(userId, projectId, projectName, assignedBy)
notifyTaskAssigned(userId, taskId, taskTitle, assignedBy)
notifyBugAssigned(userId, bugId, bugTitle, assignedBy)
notifyBugStatusUpdated(userId, bugId, bugTitle, oldStatus, newStatus, updatedBy)
notifyLeaveStatusUpdated(userId, leaveId, oldStatus, newStatus, updatedBy, leaveType, startDate, endDate)
notifyReimbursementStatusUpdated(userId, reimbursementId, oldStatus, newStatus, updatedBy, amount, category)
notifyProjectComment(projectId, commentId, commenterId, commenterName, commentText, projectName)
notifyBugComment(bugId, commentId, commenterId, commenterName, commentText, bugTitle, parentCommentId)
```

### Error Handling

- Notification creation failures don't break the main operation
- Push notification failures are logged but don't prevent database notification
- Uses `Promise.allSettled()` for bulk notifications to handle partial failures

## Testing

To test notifications:

1. **User Update:**
   - Super Admin/Team Lead updates a user's details
   - Check notifications table and push notification

2. **Project Assignment:**
   - Create/update project with members
   - Check assigned users receive notifications

3. **Task Assignment:**
   - Create/update task with assigned users
   - Check assigned users receive notifications

4. **Bug Assignment:**
   - Create bug and assign to user
   - Update bug status
   - Check assigned user receives notifications

5. **Leave Status:**
   - Approve/reject leave request
   - Check employee receives notification

6. **Reimbursement Status:**
   - Approve/reject reimbursement
   - Check employee receives notification

7. **Project Comment:**
   - Add a comment on a project
   - Check all project members receive notification

8. **Bug Comment:**
   - Add a comment on a bug
   - Check bug assignee and reporter receive notification

9. **Bug Comment Reply:**
   - Reply to a comment on a bug
   - Check original comment author receives notification

## Database Query Examples

```sql
-- Get all notifications for a user
SELECT * FROM notifications 
WHERE user_id = ? 
ORDER BY created_at DESC;

-- Get unread notifications
SELECT * FROM notifications 
WHERE user_id = ? AND is_read = FALSE 
ORDER BY created_at DESC;

-- Mark notification as read
UPDATE notifications 
SET is_read = TRUE, read_at = NOW() 
WHERE id = ?;
```

## Notes

- Notifications are **asynchronous** - they don't block the main operation
- Push notifications require FCM to be properly configured
- Database notifications are always created, even if push fails
- Notifications are user-specific - no global broadcasts
- Duplicate notifications are avoided (e.g., only new project members are notified)
- Comment notifications exclude the commenter/replier from receiving their own notifications
- Project comment notifications are sent to all project members
- Bug comment notifications are sent to assignee and reporter (for new comments) or parent comment author (for replies)

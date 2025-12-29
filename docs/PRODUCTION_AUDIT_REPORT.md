# Production Codebase Audit Report

**Generated:** $(date)  
**Project:** prompt-hub  
**Scope:** Frontend + Backend + Database (Read-Only)  
**Status:** ⚠️ **AUDIT ONLY - NO DELETIONS PERFORMED**

---

## Executive Summary

This comprehensive audit identifies unused code, dead routes, unused APIs, and database tables across the entire codebase. **ALL findings are presented for review before any cleanup actions.**

**Total Findings:**
- **Step 1:** 15 unused files/components identified
- **Step 2:** 0 orphan routes, 0 dead routes
- **Step 3:** 1 potentially unused API module
- **Step 4:** Database schema analysis (read-only)

---

## STEP 1: FULL PROJECT AUDIT

### 1.1 Unused Files and Folders

| Type | Path | Reason | Risk Level | Safe To Remove |
|------|------|--------|------------|----------------|
| **File** | `src/pages/FileManager.tsx.tmp` | Temporary duplicate of FileManager.tsx | **LOW** | **YES** |
| **File** | `src/lib/api.ts.backup` | Backup file, not referenced | **LOW** | **YES** |
| **File** | `src/features/auth/pages/ProfileSetup.tsx.backup` | Backup file, not referenced | **LOW** | **YES** |
| **File** | `server/routes/employees.js.backup` | Backup file, not referenced | **LOW** | **YES** |
| **File** | `server/routes/assets.js.bak` | Backup file, not referenced | **LOW** | **YES** |
| **File** | `src/features/employees/pages/EmployeeCreateNew.tsx` | Not imported or referenced anywhere | **LOW** | **YES** |
| **File** | `src/features/employees/pages/EmployeeEditNew.tsx` | Not imported or referenced anywhere | **LOW** | **YES** |
| **File** | `src/components/FCMDebug.tsx` | Component defined but never imported/used | **LOW** | **YES** |
| **Folder** | `src/components/forms/` | Empty directory with no files | **LOW** | **YES** |

### 1.2 Duplicate Files and Components

| Type | Path | Reason | Risk Level | Safe To Remove |
|------|------|--------|------------|----------------|
| **File** | `src/components/bug/BugComments.tsx` | Duplicate - `features/bugs/components/BugComments.tsx` is used | **MEDIUM** | **REVIEW** |
| **File** | `src/components/task/TaskForm.tsx` | Likely duplicate - `features/tasks/components/TaskForm.tsx` is used | **MEDIUM** | **REVIEW** |
| **File** | `src/components/employee/EmployeeForm.tsx` | Likely duplicate - `features/employees/components/EmployeeForm.tsx` is used | **MEDIUM** | **REVIEW** |
| **File** | `src/components/bug/BugForm.tsx` | Only used once in BugEdit.tsx - verify if features version exists | **MEDIUM** | **REVIEW** |
| **File** | `src/hooks/useProjects.ts` | Duplicate - `features/projects/hooks/useProjects.ts` is used | **MEDIUM** | **REVIEW** |

**Verification Required:**
- Check if `components/bug/BugForm.tsx` has a corresponding `features/bugs/components/BugForm.tsx`
- Verify no dynamic imports reference the old component paths
- Confirm all imports have been migrated to features-based structure

### 1.3 Commented-Out Code Blocks

| Type | Path | Reason | Risk Level | Safe To Remove |
|------|------|--------|------------|----------------|
| **Code Block** | `server/index.js` (lines 400-450) | Large commented-out server.listen block - replaced by active code below | **LOW** | **YES** |

**Details:**
- 50+ lines of commented code for server initialization
- Active implementation exists starting at line 451
- No functional purpose - safe to remove

### 1.4 Unused Imports and Exports

| Type | Path | Reason | Risk Level | Safe To Remove |
|------|------|--------|------------|----------------|
| **Import** | `src/components/GlobalSearch.tsx` (line 4) | TODO comment about fixing import path | **LOW** | **REVIEW** |

**Note:** The import appears to work, but TODO suggests uncertainty. Verify `useDebounce` import path.

---

## STEP 2: ROUTES & NAVIGATION VERIFICATION

### 2.1 All Declared Routes

**Public Routes:**
- `/` → Redirects to `/login`
- `/login` → Login page
- `/forgot-password` → Forgot password page
- `/mfa/setup` → MFA setup page
- `/mfa/verify` → MFA verification page

**Admin Routes (Protected):**
- `/dashboard` → Dashboard
- `/users` → Users management (permission: `users.view`)
- `/employees` → Employees list (permission: `employees.view`)
- `/employees/list` → Contact directory
- `/employees/new` → Create employee (permission: `employees.create`)
- `/employees/:id/edit` → Edit employee
- `/employees/:id/view` → View employee
- `/projects` → Projects list (permission: `projects.view`)
- `/projects/new` → Create project (permission: `projects.create`)
- `/projects/:id` → Project detail (permission: `projects.view`)
- `/projects/:id/edit` → Edit project (permission: `projects.edit`)
- `/tasks` → Tasks list (permission: `tasks.view`)
- `/tasks/new` → Create task (permission: `tasks.create`)
- `/tasks/:id` → Task view (permission: `tasks.view`)
- `/tasks/:id/edit` → Edit task (permission: `tasks.edit`)
- `/kanban` → Kanban board (permission: `tasks.view`)
- `/kanban/:id` → Kanban board detail (permission: `tasks.view`)
- `/bugs` → Bugs list (permission: `bugs.view`)
- `/bugs/new` → Create bug (permission: `bugs.create`)
- `/bugs/:id` → Bug detail (permission: `bugs.view`)
- `/bugs/:id/edit` → Edit bug (permission: `bugs.edit`)
- `/leaves` → Leaves management
- `/holidays` → Holidays management
- `/reimbursements` → Reimbursements list (permission: `reimbursements.view`)
- `/reimbursements/new` → Create reimbursement (permission: `reimbursements.create`)
- `/reimbursements/:id` → Reimbursement view (permission: `reimbursements.view`)
- `/reimbursements/:id/edit` → Edit reimbursement (permission: `reimbursements.edit`)
- `/audit-logs` → Audit logs (roles: Super Admin, Admin)
- `/files` → File manager
- `/notifications` → Notifications
- `/reports` → Reports (permission: `reports.view`)
- `/timesheet` → Timesheet
- `/activity-logs` → Activity logs
- `/user-hierarchy` → User hierarchy (role: Super Admin)
- `/roles-positions` → Roles & positions (role: Super Admin)
- `/employee-profile/:id` → Employee profile
- `/settings` → Settings
- `/profile-setup` → Profile setup
- `/roles-permissions` → Roles & permissions (permission: `roles_permissions.view`)
- `/permissions` → Permissions (role: Super Admin)

**IT Asset Management Routes (Admin/Super Admin):**
- `/it-assets/dashboard` → IT Asset dashboard
- `/it-assets/assets` → Assets list
- `/it-assets/assets/new` → Create asset
- `/it-assets/assets/:id` → Asset view
- `/it-assets/assets/:id/edit` → Edit asset
- `/it-assets/assignments` → Asset assignments
- `/it-assets/assignments/new` → Assign asset
- `/it-assets/assignments/:id/return` → Return asset
- `/it-assets/tickets` → Asset tickets (multiple roles)
- `/it-assets/tickets/:id` → Ticket detail
- `/it-assets/maintenance` → Asset maintenance
- `/it-assets/inventory` → Inventory
- `/it-assets/inventory/create` → Create inventory item
- `/it-assets/inventory/:id/edit` → Edit inventory item
- `/it-assets/inventory/:id/adjust` → Inventory adjustment
- `/it-assets/inventory/history` → Inventory history
- `/it-assets/inventory/reports` → Inventory reports
- `/it-assets/reports` → Asset reports
- `/it-assets/approvals` → Asset approvals
- `/it-assets/settings` → Asset settings

**Support Routes (Non-Super Admin):**
- `/support` → My tickets
- `/support/new` → Create support ticket
- `/support/tickets/:id` → Support ticket view

**My Devices Routes (Non-Super Admin):**
- `/my-devices` → My devices list
- `/my-devices/:id` → Device view
- `/my-it-assets` → My IT assets (deprecated, backward compatibility)
- `/my-it-assets/raise-request` → Raise ticket

**Client Routes (CLIENT role):**
- `/client/dashboard` → Client dashboard
- `/client/projects` → Client projects
- `/client/projects/:id` → Client project detail
- `/client/tasks` → Client tasks
- `/client/tasks/:id` → Client task view
- `/client/bugs` → Client bugs
- `/client/bugs/:id` → Client bug detail
- `/client/kanban` → Client kanban
- `/client/timeline` → Client timeline
- `/client/releases` → Client releases
- `/client/comments` → Client comments

**Fallback:**
- `*` → 404 Not Found page

### 2.2 Navigation Links Analysis

**AdminSidebar Navigation:**
- All routes in sidebar are declared in App.tsx
- Some routes are commented out in sidebar but still declared:
  - `/kanban` - Commented out but route exists
  - `/timesheet` - Commented out but route exists
  - `/activity-logs` - Commented out but route exists

**ClientSidebar Navigation:**
- All sidebar routes are declared in App.tsx
- Client sidebar only shows: Dashboard, Projects, Tasks, Bugs
- Additional client routes exist but not in sidebar (timeline, releases, comments)

### 2.3 Route Status Summary

| Route | Component | Access Role | Status |
|-------|-----------|-------------|--------|
| `/kanban` | Kanban | Permission: `tasks.view` | **Active** (hidden in sidebar) |
| `/timesheet` | Timesheet | All authenticated | **Active** (hidden in sidebar) |
| `/activity-logs` | ActivityLogs | All authenticated | **Active** (hidden in sidebar) |
| `/client/timeline` | ClientTimeline | CLIENT | **Active** (not in sidebar) |
| `/client/releases` | ClientReleases | CLIENT | **Active** (not in sidebar) |
| `/client/comments` | ClientComments | CLIENT | **Active** (not in sidebar) |

**Findings:**
- ✅ **No orphan routes** - All declared routes have corresponding components
- ✅ **No dead routes** - All routes are reachable (some via direct navigation)
- ⚠️ **3 routes hidden in sidebar** but still accessible via direct URL
- ⚠️ **3 client routes** not in sidebar but accessible

**Recommendation:**
- Consider adding hidden routes to sidebar or document their purpose
- Client routes (timeline, releases, comments) may be accessed via other navigation

---

## STEP 3: BACKEND & API USAGE ANALYSIS

### 3.1 All Backend API Routes

**Authentication:**
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/refresh`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `POST /api/auth/verify-otp`
- `GET /api/auth/me`
- `PUT /api/auth/me`
- `POST /api/auth/change-password`

**Users:**
- `GET /api/users`
- `GET /api/users/assignable`
- `GET /api/users/:id`
- `POST /api/users`
- `PUT /api/users/:id`
- `DELETE /api/users/:id`

**Employees:**
- `GET /api/employees`
- `GET /api/employees/:id`
- `POST /api/employees`
- `PUT /api/employees/:id`
- `DELETE /api/employees/:id`
- `GET /api/employees/:id/documents`
- `POST /api/employees/:id/documents`
- `DELETE /api/employees/:id/documents/:docId`
- `GET /api/employees/hierarchy`
- `GET /api/employees/:id/profile`

**Projects:**
- `GET /api/projects`
- `GET /api/projects/:id`
- `POST /api/projects`
- `PUT /api/projects/:id`
- `DELETE /api/projects/:id`
- `GET /api/projects/:id/files`
- `POST /api/projects/:id/files`
- `DELETE /api/projects/:id/files/:fileId`
- `GET /api/projects/:id/comments`
- `POST /api/projects/:id/comments`
- `GET /api/projects/:id/activities`

**Tasks:**
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`
- `GET /api/tasks/:id/comments`
- `POST /api/tasks/:id/comments`
- `GET /api/tasks/:id/history`
- `GET /api/tasks/:id/timesheets`
- `POST /api/tasks/:id/timesheets`
- `GET /api/tasks/:id/attachments`
- `POST /api/tasks/:id/attachments`
- `DELETE /api/tasks/:id/attachments/:attachmentId`

**Bugs:**
- `GET /api/bugs`
- `GET /api/bugs/:id`
- `POST /api/bugs`
- `PUT /api/bugs/:id`
- `DELETE /api/bugs/:id`
- `GET /api/bugs/:id/comments`
- `POST /api/bugs/:id/comments`
- `GET /api/bugs/:id/attachments`
- `POST /api/bugs/:id/attachments`
- `DELETE /api/bugs/:id/attachments/:attachmentId`

**Leaves:**
- `GET /api/leaves`
- `GET /api/leaves/:id`
- `POST /api/leaves`
- `PUT /api/leaves/:id`
- `DELETE /api/leaves/:id`

**Reimbursements:**
- `GET /api/reimbursements`
- `GET /api/reimbursements/:id`
- `POST /api/reimbursements`
- `PUT /api/reimbursements/:id`
- `DELETE /api/reimbursements/:id`
- `POST /api/reimbursements/:id/approve`
- `POST /api/reimbursements/:id/reject`
- `GET /api/reimbursements/:id/attachments`
- `POST /api/reimbursements/:id/attachments`

**Holidays:**
- `GET /api/holidays`
- `GET /api/holidays/:id`
- `POST /api/holidays`
- `PUT /api/holidays/:id`
- `DELETE /api/holidays/:id`

**Roles & Permissions:**
- `GET /api/roles`
- `GET /api/roles/:id`
- `POST /api/roles`
- `PUT /api/roles/:id`
- `DELETE /api/roles/:id`
- `GET /api/positions`
- `GET /api/positions/:id`
- `POST /api/positions`
- `PUT /api/positions/:id`
- `DELETE /api/positions/:id`
- `GET /api/role-positions`
- `POST /api/role-positions`
- `DELETE /api/role-positions/:id`
- `GET /api/permissions`

**Reports:**
- `GET /api/reports/dashboard`
- `GET /api/reports/metrics`
- `GET /api/reports/leaderboard`
- `GET /api/reports/leave`

**Notifications:**
- `GET /api/notifications`
- `PUT /api/notifications/:id/read`
- `GET /api/notifications/unread-count`

**Settings:**
- `GET /api/settings`
- `PUT /api/settings`

**Search:**
- `GET /api/search`

**Assets (IT Asset Management):**
- Multiple endpoints for assets, assignments, tickets, inventory, maintenance, approvals, settings

**Kanban:**
- `GET /api/kanban/boards`
- `GET /api/kanban/boards/:id`
- `POST /api/kanban/boards`
- `PUT /api/kanban/boards/:id`
- `DELETE /api/kanban/boards/:id`
- `GET /api/kanban/boards/:id/tasks`
- `POST /api/kanban/boards/:id/tasks`
- `PUT /api/kanban/tasks/:id`
- `DELETE /api/kanban/tasks/:id`
- `POST /api/kanban/tasks/:id/move`
- `GET /api/kanban/tasks/:id/time-logs`
- `POST /api/kanban/tasks/:id/time-logs`

**Reminders:**
- `GET /api/reminders`
- `GET /api/reminders/:id`
- `POST /api/reminders`
- `PUT /api/reminders/:id`
- `DELETE /api/reminders/:id`

**Document Requests:**
- `GET /api/document-requests`
- `GET /api/document-requests/:id`
- `POST /api/document-requests`
- `PUT /api/document-requests/:id`
- `DELETE /api/document-requests/:id`

**FCM:**
- `POST /api/fcm/register`
- `DELETE /api/fcm/unregister`

**MFA:**
- `POST /api/mfa/setup`
- `POST /api/mfa/verify`
- `POST /api/mfa/disable`
- `GET /api/mfa/backup-codes`

**Audit Logs:**
- `GET /api/audit-logs`
- `GET /api/audit-logs/:id`
- `POST /api/audit-logs/:id/restore`
- `GET /api/audit-logs/export`

**Webhooks:**
- `GET /api/webhooks`
- `POST /api/webhooks`
- `PUT /api/webhooks/:id`
- `DELETE /api/webhooks/:id`

### 3.2 Potentially Unused APIs

| API / Module | Type | Used By | Status |
|--------------|------|---------|--------|
| **Prompts API** | Module | **NONE FOUND** | **UNUSED** |

**Details:**
- `GET /api/prompts` - Defined in `server/routes/prompts.js`
- `POST /api/prompts` - Defined in `server/routes/prompts.js`
- `PUT /api/prompts/:id` - Defined in `server/routes/prompts.js`
- `DELETE /api/prompts/:id` - Defined in `server/routes/prompts.js`
- Frontend API exists: `src/features/prompts/api.ts`
- **No frontend usage found** - No imports of `promptsApi` in any component
- **No routes** reference prompts functionality
- **No navigation** to prompts pages

**Risk Assessment:**
- **LOW RISK** - Prompts appear to be a planned feature that was never fully implemented
- Database tables exist: `prompts`, `prompt_logs`
- Backend routes are functional
- Frontend API module exists but unused

**Recommendation:**
- **REVIEW** - Verify if prompts feature is planned for future use
- If not needed, can safely remove:
  - `server/routes/prompts.js`
  - `src/features/prompts/api.ts`
  - Database tables (via migration)

### 3.3 All APIs Are Used

All other API modules are actively used by the frontend:
- ✅ Auth API - Used in login, logout, profile
- ✅ Users API - Used in users management
- ✅ Employees API - Used in employees pages
- ✅ Projects API - Used in projects pages
- ✅ Tasks API - Used in tasks pages
- ✅ Bugs API - Used in bugs pages
- ✅ Leaves API - Used in leaves pages
- ✅ Reimbursements API - Used in reimbursements pages
- ✅ Holidays API - Used in holidays pages
- ✅ Roles API - Used in roles management
- ✅ Reports API - Used in reports page
- ✅ Notifications API - Used in notifications
- ✅ Settings API - Used in settings page
- ✅ Search API - Used in global search
- ✅ Assets API - Used in IT asset management
- ✅ Kanban API - Used in kanban boards
- ✅ Reminders API - Used in reminders
- ✅ Document Requests API - Used in document requests
- ✅ FCM API - Used in push notifications
- ✅ MFA API - Used in MFA setup/verify
- ✅ Audit Logs API - Used in audit logs
- ✅ Webhooks API - Used in webhooks

---

## STEP 4: DATABASE SCHEMA AUDIT (READ-ONLY)

### 4.1 All Database Tables

**Authentication & Authorization:**
- `roles`
- `permissions`
- `role_permissions`
- `role_positions`
- `positions`
- `users`
- `password_history`
- `password_reset_otps`
- `refresh_tokens`
- `mfa_role_settings`
- `mfa_verification_attempts`

**Employee Management:**
- `employees`
- `employee_documents`
- `attendance`

**Leave & Reimbursement:**
- `leaves`
- `reimbursements`
- `holidays`

**Project Management:**
- `projects`
- `project_users`
- `project_milestones`
- `project_files`
- `project_change_requests`
- `project_client_call_notes`
- `project_credentials`
- `project_daily_status`
- `project_comments`
- `project_activities`

**Task Management:**
- `tasks`
- `task_comments`
- `task_history`
- `bugs`
- `bug_comments`
- `attachments`
- `timesheets`

**AI Prompt Library:**
- `prompts` ⚠️
- `prompt_logs` ⚠️

**Notifications & Audit:**
- `notifications`
- `audit_logs`

**Settings:**
- `settings`

**FCM & Calendar:**
- `fcm_tokens`
- `calendar_reminders`

**IT Asset Management:**
- `asset_categories`
- `assets`
- `asset_laptop_details`
- `asset_mobile_details`
- `asset_accessory_details`
- `asset_assignments`
- `asset_tickets`
- `asset_ticket_comments`
- `asset_ticket_attachments`
- `asset_audit_logs`
- `asset_maintenance`
- `asset_approvals`
- `asset_settings`

**Inventory Management:**
- `inventory_items`
- `inventory_transactions`
- `inventory_attachments`

**Kanban:**
- `kanban_boards`
- `kanban_columns`
- `kanban_tasks`
- `kanban_integrations`
- `kanban_task_history`
- `kanban_board_members`
- `kanban_time_logs`

### 4.2 Database Tables Analysis

| Table | Referenced In Code | Risk Level | Action |
|-------|-------------------|------------|--------|
| `prompts` | **NO** | **LOW** | **Review** |
| `prompt_logs` | **NO** | **LOW** | **Review** |

**All Other Tables:**
- ✅ **Referenced** - All other tables are actively used in backend routes
- ✅ **Safe** - No unused tables detected (except prompts)

**Findings:**
- **2 tables potentially unused:** `prompts`, `prompt_logs`
- These correspond to the unused Prompts API module
- **Risk Level: LOW** - No foreign key dependencies found
- **Action: REVIEW** - Verify if prompts feature is planned

**⚠️ STRICT RULE FOLLOWED:**
- **NO DROP OR ALTER** statements generated
- **READ-ONLY** analysis only
- Database changes require explicit approval and migration scripts

---

## SUMMARY OF FINDINGS

### High Confidence - Safe to Remove (9 items)
1. `src/pages/FileManager.tsx.tmp`
2. `src/lib/api.ts.backup`
3. `src/features/auth/pages/ProfileSetup.tsx.backup`
4. `server/routes/employees.js.backup`
5. `server/routes/assets.js.bak`
6. `src/features/employees/pages/EmployeeCreateNew.tsx`
7. `src/features/employees/pages/EmployeeEditNew.tsx`
8. `src/components/FCMDebug.tsx`
9. `src/components/forms/` (empty folder)
10. Commented code block in `server/index.js` (lines 400-450)

### Medium Confidence - Requires Review (6 items)
1. `src/components/bug/BugComments.tsx` (duplicate)
2. `src/components/task/TaskForm.tsx` (duplicate)
3. `src/components/employee/EmployeeForm.tsx` (duplicate)
4. `src/components/bug/BugForm.tsx` (verify usage)
5. `src/hooks/useProjects.ts` (duplicate)
6. `src/components/GlobalSearch.tsx` (TODO import)

### Low Confidence - Feature Verification (3 items)
1. Prompts API module (`server/routes/prompts.js`)
2. Prompts frontend API (`src/features/prompts/api.ts`)
3. Database tables: `prompts`, `prompt_logs`

---

## NEXT STEPS

### ⚠️ STEP 5: WAIT FOR CONFIRMATION

**STOPPED HERE AS REQUESTED**

No deletions have been performed. All findings are documented above.

**Awaiting explicit approval before proceeding to Step 6 (Controlled Cleanup).**

---

## APPENDIX: Verification Commands

### Verify Unused Files
```bash
# Check if backup files are referenced
grep -r "\.backup\|\.bak\|\.tmp" src/ server/

# Check if EmployeeCreateNew is used
grep -r "EmployeeCreateNew" src/

# Check if FCMDebug is imported
grep -r "FCMDebug" src/
```

### Verify Duplicate Components
```bash
# Check BugComments usage
grep -r "from.*BugComments" src/

# Check TaskForm usage
grep -r "from.*TaskForm" src/

# Check EmployeeForm usage
grep -r "from.*EmployeeForm" src/
```

### Verify Prompts API Usage
```bash
# Check if promptsApi is imported
grep -r "promptsApi\|from.*prompts" src/

# Check if prompts routes are called
grep -r "/api/prompts" src/
```

---

**End of Audit Report**


# Client Security Implementation

## Overview
This document describes the comprehensive client access security implementation for the Enterprise Project Management System. The implementation provides secure, isolated client access with encryption, strict role control, forced logout, minimal UI, and admin-controlled activation.

## Features Implemented

### 1. Database Schema Changes
**File**: `database/client_security_migration.sql`

- Added `is_active` column to `users` table (for client activation/deactivation)
- Added `token_version` column to `users` table (for force logout)
- Added `uuid` column to `projects` and `tasks` tables (for URL masking)
- Added `is_active` column to `projects` and `project_users` tables
- Added `encrypted_comment` column to `project_comments` table
- Added `comment_source` column to `project_comments` table (CLIENT/INTERNAL)
- Added encrypted columns for call history and release notes

### 2. Encryption/Decryption
**File**: `server/utils/crypto.js`

- AES-256-GCM encryption for sensitive data
- Encrypts comments, call summaries, and release notes before DB storage
- Decrypts data only when sending to authorized users
- Uses environment variables: `DATA_ENCRYPTION_KEY` and `DATA_ENCRYPTION_IV`

### 3. Authentication & Authorization

#### JWT Token Updates
- JWT now includes `token_version` for force logout capability
- Token version is incremented when client is deactivated

#### Login Flow (`server/routes/auth.js`)
- Checks `users.is_active = 1` before allowing login
- Returns 403 if account is deactivated
- Includes `token_version` in JWT payload

#### Auth Middleware (`server/middleware/auth.js`)
- Validates `is_active` status on every request
- Validates `token_version` to force logout on deactivation
- Returns 403 if user is inactive

#### Project Access Middleware
- New `requireProjectAccess` middleware for CLIENT users
- Checks three conditions:
  1. `users.is_active = 1`
  2. `projects.is_active = 1`
  3. `project_users.is_active = 1`
- Returns 403 if any check fails

### 4. Client Activation/Deactivation
**File**: `server/routes/users.js`

- Endpoint: `PATCH /api/users/:id/activate`
- Only SUPER_ADMIN or ADMIN can activate/deactivate clients
- When deactivated:
  - `is_active` set to 0
  - `token_version` incremented
  - All active sessions invalidated
  - Socket connections disconnected
- Audit logging for all activation/deactivation actions

### 5. Socket.IO Security
**File**: `server/utils/socketService.js`

- Validates `is_active` on socket connection
- Validates `token_version` on socket connection
- Periodic check (every 30 seconds) for user deactivation
- Automatically disconnects if user is deactivated

### 6. Project Comments Security
**File**: `server/routes/projects.js`

- Comments encrypted before database storage
- Decrypted only when sending to authorized users
- Comments tagged as CLIENT or INTERNAL
- CLIENT users cannot see INTERNAL comments
- CLIENT users can only create CLIENT comments

### 7. URL Masking
**File**: `server/routes/projects.js`

- Projects and tasks use UUIDs instead of numeric IDs
- Backend accepts both UUID and numeric ID
- Frontend uses UUIDs in client routes
- Format: `/client/projects/{uuid}` instead of `/projects/{id}`

### 8. Frontend Client Layout
**Files**: 
- `src/components/layout/ClientLayout.tsx`
- `src/components/layout/ClientSidebar.tsx`
- `src/components/layout/ClientHeader.tsx`

- Minimal, modern UI for clients
- Limited menu items:
  - Dashboard
  - Projects
  - Tasks
  - Bugs
  - Kanban
  - Timeline
  - Releases
  - Comments
- "Client View – Limited Access" banner
- No admin sidebar or internal menus

### 9. Client Routes
**File**: `src/App.tsx`

- Separate route structure for clients: `/client/*`
- All client routes protected with CLIENT role check
- Uses UUIDs in URLs for projects and tasks

### 10. Audit Logging
- Client activation/deactivation logged
- Failed login attempts logged
- Comment creation logged
- File uploads logged
- All logs exclude CLIENT users from viewing

## Environment Variables Required

```env
# Encryption keys (generate secure random values)
DATA_ENCRYPTION_KEY=<64-character hex string or passphrase>
DATA_ENCRYPTION_IV=<32-character hex string (optional, random IV used if not provided)>
```

## Database Migration

Run the migration file:
```bash
mysql -u username -p prasowla_ntpl_admin < database/client_security_migration.sql
```

## API Endpoints

### Client Activation/Deactivation
```
PATCH /api/users/:id/activate
Authorization: Bearer <admin_token>
Body: { "is_active": true/false }
```

### Project Access (with UUID)
```
GET /api/projects/{uuid}
Authorization: Bearer <client_token>
```

## Security Features

1. **Force Logout**: When client is deactivated, all sessions are immediately invalidated
2. **Encryption**: Sensitive data encrypted at rest using AES-256-GCM
3. **Access Control**: Three-layer check (user, project, project_user) for client access
4. **URL Masking**: UUIDs prevent enumeration attacks
5. **Comment Filtering**: Internal comments hidden from clients
6. **Read-Only Access**: Clients can only view and comment, no create/edit/delete

## Client Restrictions

CLIENT users CANNOT:
- Create/edit/delete projects, tasks, or bugs
- View internal comments
- Access admin features
- View audit logs
- See sensitive fields (internal_notes, admin_remarks, cost estimates)

CLIENT users CAN:
- View assigned projects
- View tasks and bugs
- Add comments (tagged as CLIENT)
- View Kanban boards
- View timeline and releases

## Testing Checklist

- [ ] Client can login when `is_active = 1`
- [ ] Client cannot login when `is_active = 0`
- [ ] Active sessions invalidated on deactivation
- [ ] Socket connections disconnected on deactivation
- [ ] Comments encrypted in database
- [ ] Comments decrypted for authorized users
- [ ] Internal comments hidden from clients
- [ ] Project access checks all three `is_active` flags
- [ ] UUIDs work in URLs
- [ ] Client layout shows limited menu
- [ ] Admin can activate/deactivate clients

## Future Enhancements

1. Rate limiting for client APIs
2. Password reset on first login
3. Expiry date for client access
4. Watermark on client downloads
5. Enhanced audit logging dashboard


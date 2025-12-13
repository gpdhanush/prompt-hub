# Multi-Factor Authentication (MFA) Setup Guide

## Overview

This project now includes comprehensive Multi-Factor Authentication (MFA) support with role-based enforcement, rate limiting, and backup codes.

## Database Setup

### 1. Run the Migration

Execute the migration SQL file to add MFA columns and tables:

```bash
mysql -u your_user -p your_database < database/migrations/add_mfa_support.sql
```

Or manually run the SQL in your MySQL client.

### 2. Database Schema

The migration adds:
- `mfa_backup_codes` (JSON) column to `users` table
- `mfa_verified_at` (DATETIME) column to `users` table
- `mfa_role_settings` table for role-based MFA enforcement
- `mfa_verification_attempts` table for rate limiting

## Backend Setup

### 1. Install Required Packages

```bash
cd server
npm install speakeasy qrcode
```

**Note:** The code includes fallback implementations if packages aren't installed, but MFA won't work properly without them.

### 2. Backend Routes

MFA routes are available at `/api/mfa/*`:

- `POST /api/mfa/setup` - Generate MFA secret and QR code
- `POST /api/mfa/verify-setup` - Verify and enable MFA
- `POST /api/mfa/verify` - Verify MFA code during login
- `POST /api/mfa/disable` - Disable MFA
- `GET /api/mfa/status` - Get MFA status
- `POST /api/mfa/regenerate-backup-codes` - Regenerate backup codes
- `GET /api/mfa/enforcement` - Get MFA enforcement settings (Admin only)
- `PUT /api/mfa/enforcement/:roleId` - Update MFA enforcement (Admin only)

## Role-Based MFA Requirements

By default, the system enforces MFA as follows:

- **Admin** → MFA mandatory
- **Super Admin** → MFA mandatory
- **Team Lead (TL)** → MFA mandatory
- **Employee** → Optional

These settings are stored in the `mfa_role_settings` table and can be modified by Super Admins or Admins.

## Frontend Pages

### 1. MFA Setup Page (`/mfa/setup`)

Users are redirected here when:
- MFA is required for their role but not enabled
- They manually choose to set up MFA from Settings

The page displays:
- QR code for scanning with authenticator apps
- Manual entry key
- Backup codes (10 codes)

### 2. MFA Verification Page (`/mfa/verify`)

Users are redirected here during login when:
- MFA is enabled for their account
- They need to verify their identity

Supports:
- TOTP codes from authenticator apps
- Backup codes

### 3. Settings Page Integration

The Settings page (`/settings`) includes an MFA section where users can:
- View MFA status
- Set up MFA
- Reconfigure MFA
- Regenerate backup codes
- Disable MFA (if not required by role)

## Rate Limiting

MFA verification is rate-limited to prevent brute force attacks:

- **5 attempts per 15 minutes per IP address**
- **5 attempts per 15 minutes per user**

Failed attempts are logged in the `mfa_verification_attempts` table.

## Login Flow

1. User enters email and password
2. System checks if MFA is required for the user's role
3. If MFA is required but not enabled:
   - Redirect to `/mfa/setup`
4. If MFA is enabled:
   - Redirect to `/mfa/verify`
5. After successful MFA verification:
   - User is logged in and redirected to dashboard

## Backup Codes

- 10 backup codes are generated during MFA setup
- Each code can only be used once
- Codes are removed from the database after use
- Users can regenerate codes from Settings

## Admin Enforcement

Super Admins and Admins can:
- View MFA enforcement settings for all roles
- Update MFA requirements for roles
- Enforce MFA for specific roles

## Security Features

1. **Rate Limiting**: Prevents brute force attacks
2. **Backup Codes**: One-time use codes for account recovery
3. **Audit Logging**: All MFA actions are logged
4. **Role-Based Enforcement**: Mandatory MFA for sensitive roles
5. **TOTP Verification**: Industry-standard Time-based One-Time Password

## Troubleshooting

### MFA Not Working

1. Ensure packages are installed: `npm install speakeasy qrcode` in server directory
2. Check database migration was run successfully
3. Verify user has `mfa_enabled = 1` in database
4. Check server logs for errors

### Rate Limit Issues

- Wait 15 minutes after 5 failed attempts
- Check `mfa_verification_attempts` table for logged attempts
- Clear old attempts if needed (older than 15 minutes)

### QR Code Not Displaying

- Ensure `qrcode` package is installed
- Check browser console for errors
- Verify the secret is being generated correctly

## Testing

1. Set up MFA for a test user
2. Test login flow with MFA enabled
3. Test backup code usage
4. Test rate limiting (5 failed attempts)
5. Test role-based enforcement

## Notes

- The current implementation uses mock JWT tokens. Replace with actual JWT implementation in production.
- Session tokens for MFA verification are temporary and should be replaced with a proper session management system.
- Consider implementing Redis for rate limiting in production for better performance.

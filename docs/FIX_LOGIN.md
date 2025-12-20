# Fix Login "Invalid Credentials" Error

## Problem
The password hash in `seed.sql` uses PHP's bcrypt format (`$2y$`) which is incompatible with Node.js bcryptjs (which uses `$2a$`).

## Quick Fix

### Option 1: Update Existing Users (Recommended)
Run this SQL script to fix passwords for existing users:

```bash
mysql -u root -p prasowla_ntpl_admin < database/fix_passwords.sql
```

This will update all users to have password: **admin123**

### Option 2: Reset Password via Script
Use the Node.js script to reset a specific user's password:

```bash
cd server
npm run reset-password
```

Then enter:
- Email: `superadmin@example.com` (or any user email)
- New password: `admin123` (or your preferred password)

### Option 3: Direct SQL Update
Run this in MySQL:

```sql
USE prasowla_ntpl_admin;

-- Update Super Admin password to 'admin123'
UPDATE users 
SET password_hash = '$2a$10$n8vxNPCKiG4jMPRIe5moPuyYPayj7lIohNR1wn31A5BYHNh/3O/ya'
WHERE email = 'superadmin@example.com';
```

## Default Login Credentials

After fixing, use these credentials:

**Super Admin:**
- Email: `superadmin@example.com`
- Password: `admin123`

**Admin:**
- Email: `admin@example.com`
- Password: `admin123`

**Other Users:**
- All users have password: `admin123`
- Check `database/seed.sql` for email addresses

## Verify Password Hash

To verify if a password hash is correct:

```bash
cd server
npm run verify-password
```

## After Fixing

1. Try logging in again with:
   - Email: `superadmin@example.com`
   - Password: `admin123`

2. If still having issues, check server console logs for detailed error messages

3. Make sure the database has been seeded with the updated `seed.sql` file

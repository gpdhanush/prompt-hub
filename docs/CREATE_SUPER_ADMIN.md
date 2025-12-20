# How to Create a Super Admin

There are several ways to create a Super Admin user:

## Method 1: Using Seed Data (Easiest)

If you've run the seed.sql file, a Super Admin already exists:

**Email:** `superadmin@example.com`  
**Password:** `admin123`

Just login with these credentials!

## Method 2: Direct SQL Insert

Run this SQL command in your MySQL database:

```sql
USE prasowla_ntpl_admin;

-- Make sure Super Admin role exists (id=1)
INSERT INTO `roles` (`id`, `name`, `description`) 
VALUES (1, 'Super Admin', 'Full system access with all permissions')
ON DUPLICATE KEY UPDATE name='Super Admin';

-- Create Super Admin user
-- Password: admin123 (change this!)
INSERT INTO `users` (`name`, `email`, `mobile`, `password_hash`, `role_id`, `status`) 
VALUES (
  'Super Admin',
  'superadmin@example.com',  -- Change email
  '+1234567890',              -- Change mobile
  '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi',  -- Password: admin123
  1,  -- role_id = 1 (Super Admin)
  'Active'
);
```

**Note:** The password hash above is for `admin123`. To use a different password, generate a new bcrypt hash.

## Method 3: Using Node.js Script

Run the provided script (see `scripts/create-super-admin.js`):

```bash
cd server
node scripts/create-super-admin.js
```

## Method 4: Generate Password Hash

To create a Super Admin with a custom password, you need to generate a bcrypt hash:

```javascript
const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('your-password', 10);
console.log(hash);
```

Then use that hash in the SQL insert above.

## Method 5: Through API (If you have Admin access)

If you're already logged in as an Admin, you can create a Super Admin through the API:

```bash
curl -X POST http://localhost:3001/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Super Admin",
    "email": "superadmin@example.com",
    "password": "your-password",
    "role": "super-admin",
    "status": "Active"
  }'
```

## Verify Super Admin

After creating, verify the user:

```sql
SELECT u.id, u.name, u.email, r.name as role 
FROM users u 
JOIN roles r ON u.role_id = r.id 
WHERE r.name = 'Super Admin';
```

## Default Super Admin Credentials (from seed.sql)

- **Email:** superadmin@example.com
- **Password:** admin123
- **Role:** Super Admin (ID: 1)

**⚠️ IMPORTANT:** Change the default password immediately after first login!

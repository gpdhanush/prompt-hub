import { db } from '../config/database.js';
import bcrypt from 'bcryptjs';
import readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function createSuperAdmin() {
  try {
    console.log('=== Create Super Admin User ===\n');

    // Get user input
    const name = await question('Enter name (default: Super Admin): ') || 'Super Admin';
    const email = await question('Enter email (required): ');
    
    if (!email) {
      console.error('Email is required!');
      process.exit(1);
    }

    // Check if email already exists
    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
    if (existing.length > 0) {
      console.error(`User with email ${email} already exists!`);
      process.exit(1);
    }

    const mobile = await question('Enter mobile (optional): ') || null;
    const password = await question('Enter password (required): ');
    
    if (!password) {
      console.error('Password is required!');
      process.exit(1);
    }

    // Ensure Super Admin role exists
    const [roles] = await db.query('SELECT id FROM roles WHERE name = ?', ['Super Admin']);
    let roleId;
    
    if (roles.length === 0) {
      console.log('Creating Super Admin role...');
      const [result] = await db.query(
        'INSERT INTO roles (name, description) VALUES (?, ?)',
        ['Super Admin', 'Full system access with all permissions']
      );
      roleId = result.insertId;
      console.log(`Super Admin role created with ID: ${roleId}`);
    } else {
      roleId = roles[0].id;
      console.log(`Using existing Super Admin role (ID: ${roleId})`);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // Create user
    const [result] = await db.query(`
      INSERT INTO users (name, email, mobile, password_hash, role_id, status)
      VALUES (?, ?, ?, ?, ?, 'Active')
    `, [name, email, mobile, passwordHash, roleId]);

    console.log(`\n✅ Super Admin created successfully!`);
    console.log(`   User ID: ${result.insertId}`);
    console.log(`   Name: ${name}`);
    console.log(`   Email: ${email}`);
    console.log(`   Role: Super Admin`);
    console.log(`\nYou can now login with these credentials.`);

  } catch (error) {
    console.error('Error creating Super Admin:', error.message);
    if (error.code === 'ER_DUP_ENTRY') {
      console.error('Email already exists!');
    }
    process.exit(1);
  } finally {
    rl.close();
    await db.end();
  }
}

createSuperAdmin();

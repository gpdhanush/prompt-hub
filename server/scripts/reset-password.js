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

async function resetPassword() {
  try {
    console.log('=== Reset User Password ===\n');

    const email = await question('Enter user email: ');
    
    if (!email) {
      console.error('Email is required!');
      process.exit(1);
    }

    // Check if user exists
    const [users] = await db.query('SELECT id, name, email FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      console.error(`User with email ${email} not found!`);
      process.exit(1);
    }

    const user = users[0];
    console.log(`\nFound user: ${user.name} (${user.email})`);

    const newPassword = await question('Enter new password: ');
    
    if (!newPassword) {
      console.error('Password is required!');
      process.exit(1);
    }

    // Hash password
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, user.id]);

    console.log(`\n✅ Password reset successfully!`);
    console.log(`   User: ${user.name}`);
    console.log(`   Email: ${user.email}`);
    console.log(`   New password: ${newPassword}`);

  } catch (error) {
    console.error('Error resetting password:', error.message);
    process.exit(1);
  } finally {
    rl.close();
    await db.end();
  }
}

resetPassword();

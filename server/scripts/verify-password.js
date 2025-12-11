import bcrypt from 'bcryptjs';

// Test password hash from seed.sql
const seedHash = '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi';
const testPassword = 'admin123';

console.log('Testing password hash from seed.sql...');
console.log('Hash:', seedHash);
console.log('Testing password:', testPassword);

const isValid = await bcrypt.compare(testPassword, seedHash);
console.log('Password match:', isValid);

if (!isValid) {
  console.log('\n❌ Password hash in seed.sql is incorrect!');
  console.log('Generating new hash for "admin123"...');
  const newHash = await bcrypt.hash(testPassword, 10);
  console.log('New hash:', newHash);
  console.log('\nUpdate seed.sql with this hash, or run:');
  console.log('UPDATE users SET password_hash = ? WHERE email = ?;');
} else {
  console.log('✅ Password hash is correct!');
}

process.exit(0);

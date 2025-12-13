#!/usr/bin/env node

/**
 * Version Update Script
 * Updates VITE_APP_VERSION in .env file
 * 
 * Usage: node scripts/update-version.js [version]
 * Example: node scripts/update-version.js 1.2.3
 * 
 * For automation, you can use:
 * - npm run version:patch (1.0.0 -> 1.0.1)
 * - npm run version:minor (1.0.0 -> 1.1.0)
 * - npm run version:major (1.0.0 -> 2.0.0)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Get version from command line argument
const version = process.argv[2];

if (!version) {
  console.error('❌ Error: Version is required');
  console.log('\nUsage: node scripts/update-version.js [version]');
  console.log('Example: node scripts/update-version.js 1.2.3');
  process.exit(1);
}

// Validate version format (semantic versioning)
const versionRegex = /^(\d+)\.(\d+)\.(\d+)(-[\w-]+)?$/;
if (!versionRegex.test(version)) {
  console.error('❌ Error: Invalid version format');
  console.log('Use semantic versioning: MAJOR.MINOR.PATCH[-PRERELEASE]');
  console.log('Examples: 1.2.3, 1.2.3-beta, 1.0.0-rc.1');
  process.exit(1);
}

// Check if .env file exists
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found');
  console.log('Please create a .env file first');
  process.exit(1);
}

// Read .env file
let envContent = fs.readFileSync(envPath, 'utf8');

// Update or add VITE_APP_VERSION
if (envContent.includes('VITE_APP_VERSION=')) {
  // Update existing version
  envContent = envContent.replace(
    /^VITE_APP_VERSION=.*$/m,
    `VITE_APP_VERSION=${version}`
  );
  console.log(`✅ Updated VITE_APP_VERSION to ${version}`);
} else {
  // Add new version line at the end
  envContent += `\nVITE_APP_VERSION=${version}\n`;
  console.log(`✅ Added VITE_APP_VERSION=${version}`);
}

// Write back to .env file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log(`\n🎉 Version updated successfully to ${version}`);
console.log('💡 Remember to rebuild the app for changes to take effect:');
console.log('   npm run build');

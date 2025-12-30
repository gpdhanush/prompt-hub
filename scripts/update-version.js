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
const envProdPath = path.join(rootDir, '.env.production');

// Helper function to update version in an env file
function updateVersionInFile(filePath, version) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  
  if (content.includes('VITE_APP_VERSION=')) {
    content = content.replace(
      /^VITE_APP_VERSION=.*$/m,
      `VITE_APP_VERSION=${version}`
    );
  } else {
    content += `\nVITE_APP_VERSION=${version}\n`;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

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

// Check if at least one env file exists
if (!fs.existsSync(envPath) && !fs.existsSync(envProdPath)) {
  console.error('❌ Error: Neither .env nor .env.production file found');
  console.log('Please create at least one .env file first');
  process.exit(1);
}

// Update both .env and .env.production files
const updatedFiles = [];
if (fs.existsSync(envPath)) {
  updateVersionInFile(envPath, version);
  updatedFiles.push('.env');
}

if (fs.existsSync(envProdPath)) {
  updateVersionInFile(envProdPath, version);
  updatedFiles.push('.env.production');
}

console.log(`\n✅ Updated VITE_APP_VERSION to ${version}`);
console.log(`   Updated files: ${updatedFiles.join(', ')}`);
console.log(`\n🎉 Version updated successfully to ${version}`);
console.log('💡 Remember to rebuild the app for changes to take effect:');
console.log('   npm run build');

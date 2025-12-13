#!/usr/bin/env node

/**
 * Automated Version Bump Script
 * Automatically increments version based on type (patch, minor, major)
 * 
 * Usage: 
 *   node scripts/version-bump.js patch   (1.0.0 -> 1.0.1)
 *   node scripts/version-bump.js minor   (1.0.0 -> 1.1.0)
 *   node scripts/version-bump.js major   (1.0.0 -> 2.0.0)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');

// Get bump type from command line
const bumpType = process.argv[2]?.toLowerCase();

if (!bumpType || !['patch', 'minor', 'major'].includes(bumpType)) {
  console.error('❌ Error: Bump type is required');
  console.log('\nUsage: node scripts/version-bump.js [patch|minor|major]');
  console.log('  patch: 1.0.0 -> 1.0.1 (bug fixes)');
  console.log('  minor: 1.0.0 -> 1.1.0 (new features)');
  console.log('  major: 1.0.0 -> 2.0.0 (breaking changes)');
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

// Get current version
let currentVersion = '1.0.0';
const versionMatch = envContent.match(/^VITE_APP_VERSION=(.+)$/m);
if (versionMatch) {
  currentVersion = versionMatch[1].trim();
} else {
  console.log('⚠️  VITE_APP_VERSION not found, starting from 1.0.0');
}

// Parse current version
const versionParts = currentVersion.split('-');
const [major, minor, patch] = versionParts[0].split('.').map(Number);
const prerelease = versionParts[1] || null;

// Bump version based on type
let newMajor = major;
let newMinor = minor;
let newPatch = patch;
let newPrerelease = prerelease;

if (bumpType === 'major') {
  newMajor = major + 1;
  newMinor = 0;
  newPatch = 0;
  newPrerelease = null;
} else if (bumpType === 'minor') {
  newMajor = major;
  newMinor = minor + 1;
  newPatch = 0;
  newPrerelease = null;
} else if (bumpType === 'patch') {
  newMajor = major;
  newMinor = minor;
  newPatch = patch + 1;
  newPrerelease = null;
}

// Build new version string
let newVersion = `${newMajor}.${newMinor}.${newPatch}`;
if (newPrerelease) {
  newVersion += `-${newPrerelease}`;
}

// Update .env file
if (versionMatch) {
  envContent = envContent.replace(
    /^VITE_APP_VERSION=.*$/m,
    `VITE_APP_VERSION=${newVersion}`
  );
} else {
  envContent += `\nVITE_APP_VERSION=${newVersion}\n`;
}

// Write back to .env file
fs.writeFileSync(envPath, envContent, 'utf8');

console.log(`\n✅ Version bumped: ${currentVersion} -> ${newVersion}`);
console.log(`   Type: ${bumpType}`);
console.log('\n💡 Next steps:');
console.log('   1. Review changes');
console.log('   2. Commit: git add .env && git commit -m "Bump version to ' + newVersion + '"');
console.log('   3. Build: npm run build');
console.log('   4. Deploy to production');

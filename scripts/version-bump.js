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
const envProdPath = path.join(rootDir, '.env.production');

// Helper function to update version in an env file
function updateVersionInFile(filePath, newVersion) {
  if (!fs.existsSync(filePath)) {
    return false;
  }
  
  let content = fs.readFileSync(filePath, 'utf8');
  const versionMatch = content.match(/^VITE_APP_VERSION=(.+)$/m);
  
  if (versionMatch) {
    content = content.replace(
      /^VITE_APP_VERSION=.*$/m,
      `VITE_APP_VERSION=${newVersion}`
    );
  } else {
    content += `\nVITE_APP_VERSION=${newVersion}\n`;
  }
  
  fs.writeFileSync(filePath, content, 'utf8');
  return true;
}

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

// Check if at least one env file exists
if (!fs.existsSync(envPath) && !fs.existsSync(envProdPath)) {
  console.error('❌ Error: Neither .env nor .env.production file found');
  console.log('Please create at least one .env file first');
  process.exit(1);
}

// Read .env file (prefer .env, fallback to .env.production)
let envContent = '';
let envPathToRead = envPath;
if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
} else if (fs.existsSync(envProdPath)) {
  envContent = fs.readFileSync(envProdPath, 'utf8');
  envPathToRead = envProdPath;
}

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

// Update both .env and .env.production files
const updatedFiles = [];
if (fs.existsSync(envPath)) {
  updateVersionInFile(envPath, newVersion);
  updatedFiles.push('.env');
}

if (fs.existsSync(envProdPath)) {
  updateVersionInFile(envProdPath, newVersion);
  updatedFiles.push('.env.production');
}

console.log(`\n✅ Version bumped: ${currentVersion} -> ${newVersion}`);
console.log(`   Type: ${bumpType}`);
console.log(`   Updated files: ${updatedFiles.join(', ')}`);
console.log('\n💡 Next steps:');
console.log('   1. Review changes');
const filesToCommit = updatedFiles.join(' ');
console.log(`   2. Commit: git add ${filesToCommit} && git commit -m "Bump version to ${newVersion}"`);
console.log('   3. Build: npm run build');
console.log('   4. Deploy to production');

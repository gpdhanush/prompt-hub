#!/usr/bin/env node

/**
 * Update Service Worker Cache Version
 * Reads VITE_APP_VERSION from .env and updates the cache version in public/sw.js
 * 
 * This script should be run before building to ensure the service worker
 * cache version matches the app version, forcing browsers to fetch new content.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const envPath = path.join(rootDir, '.env');
const envProdPath = path.join(rootDir, '.env.production');
const swPath = path.join(rootDir, 'public', 'sw.js');

// Read version from .env or .env.production (prefer .env.production for production builds)
let envContent = '';
let envFileUsed = '';

// Check .env.production first (for production builds)
if (fs.existsSync(envProdPath)) {
  envContent = fs.readFileSync(envProdPath, 'utf8');
  envFileUsed = '.env.production';
} else if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
  envFileUsed = '.env';
} else {
  console.error('❌ Error: Neither .env nor .env.production file found');
  console.log('Please create a .env file with VITE_APP_VERSION');
  process.exit(1);
}

const versionMatch = envContent.match(/^VITE_APP_VERSION=(.+)$/m);

if (!versionMatch) {
  console.error(`❌ Error: VITE_APP_VERSION not found in ${envFileUsed} file`);
  console.log(`Please add VITE_APP_VERSION=1.0.0 to your ${envFileUsed} file`);
  process.exit(1);
}

const appVersion = versionMatch[1].trim();
const cacheVersion = `naethra-ems-v${appVersion}`;

// Read service worker file
if (!fs.existsSync(swPath)) {
  console.error('❌ Error: public/sw.js not found');
  process.exit(1);
}

let swContent = fs.readFileSync(swPath, 'utf8');

// Update CACHE_VERSION
const cacheVersionRegex = /const CACHE_VERSION = ['"](.+?)['"];?/;
if (cacheVersionRegex.test(swContent)) {
  swContent = swContent.replace(
    cacheVersionRegex,
    `const CACHE_VERSION = '${cacheVersion}';`
  );
  console.log(`✅ Updated service worker cache version to: ${cacheVersion}`);
} else {
  console.error('❌ Error: Could not find CACHE_VERSION in sw.js');
  process.exit(1);
}

// Write back to file
fs.writeFileSync(swPath, swContent, 'utf8');
console.log(`✅ Service worker updated successfully`);


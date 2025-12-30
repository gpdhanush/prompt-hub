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
const swPath = path.join(rootDir, 'public', 'sw.js');

// Read .env file to get version
if (!fs.existsSync(envPath)) {
  console.error('❌ Error: .env file not found');
  console.log('Please create a .env file with VITE_APP_VERSION');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const versionMatch = envContent.match(/^VITE_APP_VERSION=(.+)$/m);

if (!versionMatch) {
  console.error('❌ Error: VITE_APP_VERSION not found in .env file');
  console.log('Please add VITE_APP_VERSION=1.0.0 to your .env file');
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


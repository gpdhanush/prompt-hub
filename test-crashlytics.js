#!/usr/bin/env node

/**
 * Firebase Crashlytics Testing Script
 * Tests both frontend and backend Crashlytics integration
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Firebase Crashlytics Testing Script');
console.log('=====================================\n');

function checkFileStructure() {
  const filesToCheck = [
    '.env',
    'server/.env',
    'src/lib/firebase-crashlytics.ts',
    'server/utils/crashlytics.js',
    'server/config/firebase-messaging-sw.json',
    'src/components/ErrorBoundary.tsx',
    'src/hooks/useCrashlytics.ts'
  ];

  let passed = 0;
  filesToCheck.forEach(filePath => {
    const fullPath = join(__dirname, filePath);
    if (existsSync(fullPath)) {
      console.log(`✅ ${filePath} exists`);
      passed++;
    } else {
      console.log(`❌ ${filePath} missing`);
    }
  });

  console.log(`File structure: ${passed}/${filesToCheck.length} files present`);
}

function checkFirebaseServiceAccount() {
  const serviceAccountPath = join(__dirname, 'server', 'config', 'firebase-messaging-sw.json');

  if (!existsSync(serviceAccountPath)) {
    console.log('❌ Firebase service account file not found');
    return;
  }

  try {
    const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));

    if (serviceAccount.type === 'service_account') {
      console.log('✅ Valid service account JSON');
      console.log(`   Project ID: ${serviceAccount.project_id}`);
      console.log(`   Client Email: ${serviceAccount.client_email}`);
    } else {
      console.log('❌ Invalid service account format');
    }
  } catch (error) {
    console.log('❌ Invalid JSON in service account file');
  }
}

async function testBackendCrashlytics() {
  try {
    // Import the crashlytics module
    const crashlyticsPath = join(__dirname, 'server', 'utils', 'crashlytics.js');

    if (!existsSync(crashlyticsPath)) {
      console.log('❌ Backend crashlytics.js not found');
      return;
    }

    // Check if the file can be imported (syntax check)
    console.log('✅ Backend crashlytics.js exists');

    // Try to import and check exports
    const { reportError, reportFatalError, createRequestContext } = await import('./server/utils/crashlytics.js');

    if (typeof reportError === 'function') {
      console.log('✅ reportError function available');
    } else {
      console.log('❌ reportError function missing');
    }

    if (typeof reportFatalError === 'function') {
      console.log('✅ reportFatalError function available');
    } else {
      console.log('❌ reportFatalError function missing');
    }

    if (typeof createRequestContext === 'function') {
      console.log('✅ createRequestContext function available');
    } else {
      console.log('❌ createRequestContext function missing');
    }

  } catch (error) {
    console.log('❌ Backend crashlytics import failed:', error.message);
  }
}

async function testFrontendImports() {
  try {
    const crashlyticsPath = join(__dirname, 'src', 'lib', 'firebase-crashlytics.ts');

    if (!existsSync(crashlyticsPath)) {
      console.log('❌ Frontend firebase-crashlytics.ts not found');
      return;
    }

    console.log('✅ Frontend firebase-crashlytics.ts exists');

    // Check if the file has the correct imports
    const content = readFileSync(crashlyticsPath, 'utf8');

    if (content.includes("import firebase from 'firebase/compat/app'")) {
      console.log('✅ Firebase compatibility imports found');
    } else {
      console.log('❌ Firebase compatibility imports missing');
    }

    if (content.includes('(firebase as any).crashlytics()')) {
      console.log('✅ Crashlytics initialization found');
    } else {
      console.log('❌ Crashlytics initialization missing');
    }

    if (content.includes('export const crashlyticsUtils')) {
      console.log('✅ Crashlytics utility functions found');
    } else {
      console.log('❌ Crashlytics utility functions missing');
    }

  } catch (error) {
    console.log('❌ Frontend crashlytics check failed:', error.message);
  }
}

async function generateTestCrashes() {
  console.log('Generating test crash reports (development mode only)...');

  try {
    // Test backend error reporting
    const { reportError, reportFatalError } = await import('./server/utils/crashlytics.js');

    // Generate a test error
    const testError = new Error('Test crash report from Crashlytics testing script');
    testError.stack = 'Test stack trace\n  at testFunction (test-crashlytics.js:123:45)\n  at generateTestCrashes (test-crashlytics.js:234:67)';

    const testContext = {
      test: true,
      timestamp: new Date().toISOString(),
      source: 'crashlytics-test-script',
      userAgent: 'TestScript/1.0',
      url: '/test/crashlytics',
      method: 'GET'
    };

    await reportError(testError, testContext);
    console.log('✅ Backend test error reported');

    // Generate a fatal error
    const fatalError = new Error('Test fatal crash report');
    fatalError.stack = 'Fatal test stack trace\n  at fatalFunction (test-crashlytics.js:345:89)';

    await reportFatalError(fatalError, { ...testContext, fatal: true });
    console.log('✅ Backend test fatal error reported');

  } catch (error) {
    console.log('❌ Test crash generation failed:', error.message);
  }

  console.log('📝 Note: Test crashes are logged but may not appear in Firebase Console until Firebase is properly configured');
}


// Run the tests
runTests().catch(console.error);

async function runTests() {
  // Test 1: Check file structure
  console.log('1️⃣  Checking File Structure...');
  checkFileStructure();

  // Test 2: Check Firebase service account
  console.log('\n2️⃣  Checking Firebase Service Account...');
  checkFirebaseServiceAccount();

  // Test 3: Test backend Crashlytics
  console.log('\n3️⃣  Testing Backend Crashlytics...');
  await testBackendCrashlytics();

  // Test 4: Test frontend imports
  console.log('\n4️⃣  Testing Frontend Imports...');
  await testFrontendImports();

  // Test 5: Generate test crash reports
  console.log('\n5️⃣  Generating Test Crash Reports...');
  await generateTestCrashes();

  console.log('\n🎉 Crashlytics Testing Complete!');
  console.log('\n📋 Next Steps:');
  console.log('1. Add real Firebase config values to .env files');
  console.log('2. Enable Crashlytics in Firebase Console');
  console.log('3. Deploy to production to see live crash reports');
}

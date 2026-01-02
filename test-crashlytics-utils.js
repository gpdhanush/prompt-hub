#!/usr/bin/env node

/**
 * Test Firebase Crashlytics Utils
 * Tests the crashlyticsUtils functions to ensure they work correctly
 *
 * Usage:
 * 1. In browser console: copy and paste the test functions
 * 2. Or run: node test-crashlytics-utils.js (after building the app)
 */

// Test functions that can be used in browser console or Node.js
const crashlyticsTestSuite = {
  async runAllTests() {
    console.log('🧪 Testing Firebase Crashlytics Utils');
    console.log('=====================================\n');

    await this.testSetUser();
    await this.testLogEvent();
    await this.testRecordError();
    await this.testLogPerformance();
    await this.testLogNavigation();
    await this.testLogApiError();
    await this.testLogUserAction();

    console.log('🎉 All crashlyticsUtils tests completed!');
    console.log('\n📝 Note: If Firebase is not configured, you should see warning messages');
    console.log('📝 If Firebase Analytics is loaded, you should see success messages');
  },

  async testSetUser() {
    console.log('1️⃣  Testing setUser...');
    try {
      // In browser, crashlyticsUtils is available on window
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.setUser('test-user-123', {
          email: 'test@example.com',
          role: 'Developer',
          department: 'Engineering'
        });
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ setUser completed');
    } catch (error) {
      console.log('❌ setUser failed:', error.message);
    }
    console.log('');
  },

  async testLogEvent() {
    console.log('2️⃣  Testing logEvent...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.logEvent('test_event', {
          action: 'button_click',
          page: 'dashboard',
          timestamp: Date.now()
        });
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ logEvent completed');
    } catch (error) {
      console.log('❌ logEvent failed:', error.message);
    }
    console.log('');
  },

  async testRecordError() {
    console.log('3️⃣  Testing recordError...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        const testError = new Error('Test error for crashlytics');
        testError.stack = 'Error: Test error\n    at testFunction (test.js:10:5)';
        await window.crashlyticsUtils.recordError(testError, {
          component: 'TestComponent',
          action: 'testAction',
          userId: 'test-user-123'
        });
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ recordError completed');
    } catch (error) {
      console.log('❌ recordError failed:', error.message);
    }
    console.log('');
  },

  async testLogPerformance() {
    console.log('4️⃣  Testing logPerformance...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.logPerformance('api_call', 250, 'ms');
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ logPerformance completed');
    } catch (error) {
      console.log('❌ logPerformance failed:', error.message);
    }
    console.log('');
  },

  async testLogNavigation() {
    console.log('5️⃣  Testing logNavigation...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.logNavigation('/dashboard', '/projects');
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ logNavigation completed');
    } catch (error) {
      console.log('❌ logNavigation failed:', error.message);
    }
    console.log('');
  },

  async testLogApiError() {
    console.log('6️⃣  Testing logApiError...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.logApiError('/api/users', 'GET', 500, new Error('Server error'));
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ logApiError completed');
    } catch (error) {
      console.log('❌ logApiError failed:', error.message);
    }
    console.log('');
  },

  async testLogUserAction() {
    console.log('7️⃣  Testing logUserAction...');
    try {
      if (typeof window !== 'undefined' && window.crashlyticsUtils) {
        await window.crashlyticsUtils.logUserAction('export_data', {
          format: 'csv',
          recordCount: 1500,
          filters: { status: 'active' }
        });
      } else {
        console.log('ℹ️  crashlyticsUtils not available (run in browser)');
      }
      console.log('✅ logUserAction completed');
    } catch (error) {
      console.log('❌ logUserAction failed:', error.message);
    }
    console.log('');
  }
};

async function testCrashlyticsUtils() {
  console.log('🧪 Testing Firebase Crashlytics Utils');
  console.log('=====================================\n');

  // Test 1: setUser
  console.log('1️⃣  Testing setUser...');
  await crashlyticsUtils.setUser('test-user-123', {
    email: 'test@example.com',
    role: 'Developer',
    department: 'Engineering'
  });
  console.log('✅ setUser completed\n');

  // Test 2: logEvent
  console.log('2️⃣  Testing logEvent...');
  await crashlyticsUtils.logEvent('test_event', {
    action: 'button_click',
    page: 'dashboard',
    timestamp: Date.now()
  });
  console.log('✅ logEvent completed\n');

  // Test 3: recordError
  console.log('3️⃣  Testing recordError...');
  const testError = new Error('Test error for crashlytics');
  testError.stack = 'Error: Test error\n    at testFunction (test.js:10:5)';
  await crashlyticsUtils.recordError(testError, {
    component: 'TestComponent',
    action: 'testAction',
    userId: 'test-user-123'
  });
  console.log('✅ recordError completed\n');

  // Test 4: logPerformance
  console.log('4️⃣  Testing logPerformance...');
  await crashlyticsUtils.logPerformance('api_call', 250, 'ms');
  console.log('✅ logPerformance completed\n');

  // Test 5: logNavigation
  console.log('5️⃣  Testing logNavigation...');
  await crashlyticsUtils.logNavigation('/dashboard', '/projects');
  console.log('✅ logNavigation completed\n');

  // Test 6: logApiError
  console.log('6️⃣  Testing logApiError...');
  await crashlyticsUtils.logApiError('/api/users', 'GET', 500, new Error('Server error'));
  console.log('✅ logApiError completed\n');

  // Test 7: logUserAction
  console.log('7️⃣  Testing logUserAction...');
  await crashlyticsUtils.logUserAction('export_data', {
    format: 'csv',
    recordCount: 1500,
    filters: { status: 'active' }
  });
  console.log('✅ logUserAction completed\n');

  console.log('🎉 All crashlyticsUtils tests completed!');
  console.log('\n📝 Note: If Firebase is not configured, you should see warning messages');
  console.log('📝 If Firebase Analytics is loaded, you should see success messages');
}

// Browser console version (copy and paste these functions)
const browserTestCrashlyticsUtils = `
/**
 * Browser Console Test for Firebase Crashlytics Utils
 * Copy and paste this into your browser console to test crashlyticsUtils
 */

// Test all crashlyticsUtils functions
async function testAllCrashlyticsUtils() {
  console.log('🧪 Testing Firebase Crashlytics Utils (Browser Console)');
  console.log('======================================================\\n');

  // Test 1: setUser
  console.log('1️⃣ Testing setUser...');
  try {
    await window.crashlyticsUtils?.setUser('test-user-123', {
      email: 'test@example.com',
      role: 'Developer',
      department: 'Engineering'
    });
    console.log('✅ setUser completed');
  } catch (error) {
    console.log('❌ setUser failed:', error.message);
  }

  // Test 2: logEvent
  console.log('2️⃣ Testing logEvent...');
  try {
    await window.crashlyticsUtils?.logEvent('test_event', {
      action: 'button_click',
      page: 'dashboard',
      timestamp: Date.now()
    });
    console.log('✅ logEvent completed');
  } catch (error) {
    console.log('❌ logEvent failed:', error.message);
  }

  // Test 3: recordError
  console.log('3️⃣ Testing recordError...');
  try {
    const testError = new Error('Test error for crashlytics');
    testError.stack = 'Error: Test error\\n    at testFunction (test.js:10:5)';
    await window.crashlyticsUtils?.recordError(testError, {
      component: 'TestComponent',
      action: 'testAction',
      userId: 'test-user-123'
    });
    console.log('✅ recordError completed');
  } catch (error) {
    console.log('❌ recordError failed:', error.message);
  }

  // Test 4: logPerformance
  console.log('4️⃣ Testing logPerformance...');
  try {
    await window.crashlyticsUtils?.logPerformance('api_call', 250, 'ms');
    console.log('✅ logPerformance completed');
  } catch (error) {
    console.log('❌ logPerformance failed:', error.message);
  }

  // Test 5: logNavigation
  console.log('5️⃣ Testing logNavigation...');
  try {
    await window.crashlyticsUtils?.logNavigation('/dashboard', '/projects');
    console.log('✅ logNavigation completed');
  } catch (error) {
    console.log('❌ logNavigation failed:', error.message);
  }

  // Test 6: logApiError
  console.log('6️⃣ Testing logApiError...');
  try {
    await window.crashlyticsUtils?.logApiError('/api/users', 'GET', 500, new Error('Server error'));
    console.log('✅ logApiError completed');
  } catch (error) {
    console.log('❌ logApiError failed:', error.message);
  }

  // Test 7: logUserAction
  console.log('7️⃣ Testing logUserAction...');
  try {
    await window.crashlyticsUtils?.logUserAction('export_data', {
      format: 'csv',
      recordCount: 1500,
      filters: { status: 'active' }
    });
    console.log('✅ logUserAction completed');
  } catch (error) {
    console.log('❌ logUserAction failed:', error.message);
  }

  console.log('\\n🎉 All crashlyticsUtils tests completed!');
  console.log('\\n📝 Note: Check console for Firebase loading status');
  console.log('📝 Success messages = Firebase Analytics working');
  console.log('📝 Warning messages = Firebase not configured or Crashlytics unavailable');
}

// Quick individual tests
function testCrashlyticsUser() {
  window.crashlyticsUtils?.setUser('test-user', { role: 'Developer' });
}

function testCrashlyticsEvent() {
  window.crashlyticsUtils?.logEvent('button_click', { page: 'dashboard' });
}

function testCrashlyticsError() {
  const error = new Error('Test error');
  window.crashlyticsUtils?.recordError(error, { component: 'Test' });
}

console.log('💡 Available browser test functions:');
console.log('   testAllCrashlyticsUtils() - Run all tests');
console.log('   testCrashlyticsUser() - Test setUser');
console.log('   testCrashlyticsEvent() - Test logEvent');
console.log('   testCrashlyticsError() - Test recordError');
console.log('   window.crashlyticsUtils - Direct access to utils object');
`;

// Node.js execution
async function runNodeTests() {
  console.log('🧪 Testing Firebase Crashlytics Utils (Node.js)');
  console.log('===============================================\n');

  console.log('⚠️  Note: This test requires the app to be built first.');
  console.log('📝 To test in browser: Copy the browser console code above');
  console.log('📝 Browser console code is available as: browserTestCrashlyticsUtils\n');

  try {
    // Try to load the built module (this might not work)
    console.log('Attempting to load crashlyticsUtils...');
    const { crashlyticsUtils } = await import('./dist/assets/index-*.js').catch(() => {
      throw new Error('Built app not found. Please build the app first with: npm run build');
    });

    await testCrashlyticsUtils.runAllTests();
  } catch (error) {
    console.log('❌ Node.js testing failed:', error.message);
    console.log('\n💡 Alternative: Use browser console testing');
    console.log('1. Start the dev server: npm run dev');
    console.log('2. Open browser console');
    console.log('3. Copy and paste the browser test code');
  }
}

// Handle execution
if (typeof window !== 'undefined') {
  // Browser environment
  console.log('🌐 Browser environment detected');
  console.log('💡 Copy and paste this code to test crashlyticsUtils:');
  console.log(browserTestCrashlyticsUtils);
  console.log('\n🚀 Quick test commands:');
  console.log('   testAllCrashlyticsUtils() - Run all tests');
  console.log('   testCrashlyticsUser() - Test user tracking');
  console.log('   testCrashlyticsEvent() - Test event logging');
  console.log('   testCrashlyticsError() - Test error reporting');

  // Make functions available globally for testing
  window.testAllCrashlyticsUtils = crashlyticsTestSuite.runAllTests.bind(crashlyticsTestSuite);
  window.testCrashlyticsUser = crashlyticsTestSuite.testSetUser.bind(crashlyticsTestSuite);
  window.testCrashlyticsEvent = crashlyticsTestSuite.testLogEvent.bind(crashlyticsTestSuite);
  window.testCrashlyticsError = crashlyticsTestSuite.testRecordError.bind(crashlyticsTestSuite);
} else {
  // Node.js environment
  runNodeTests().catch(console.error);
}

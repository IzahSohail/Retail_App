import axios from 'axios';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const TEST_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000,
  TEST_MODE: process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
};

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await axios.get(`${TEST_CONFIG.BACKEND_URL}/api/greet`, {
      timeout: 5000
    });
    console.log('Backend is running and healthy');
    return true;
  } catch (error) {
    console.error('Backend is not accessible:', error.message);
    return false;
  }
}

// Wait for backend to be ready
async function waitForBackend() {
  console.log('Checking backend availability...');
  
  for (let attempt = 1; attempt <= TEST_CONFIG.MAX_RETRIES; attempt++) {
    console.log(`   Attempt ${attempt}/${TEST_CONFIG.MAX_RETRIES}...`);
    
    if (await checkBackendHealth()) {
      return true;
    }
    
    if (attempt < TEST_CONFIG.MAX_RETRIES) {
      console.log(`   Waiting ${TEST_CONFIG.RETRY_DELAY / 1000}s before retry...`);
      await new Promise(resolve => setTimeout(resolve, TEST_CONFIG.RETRY_DELAY));
    }
  }
  
  return false;
}

async function main() {
  console.log('Flash Sales Surge Test Runner');
  console.log('='.repeat(60));
  console.log(`Configuration:`);
  console.log(`   - Backend URL: ${TEST_CONFIG.BACKEND_URL}`);
  console.log(`   - Test Mode: ${TEST_CONFIG.TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log('');
  
  // Check backend availability
  if (!(await waitForBackend())) {
    console.error('Backend is not available. Please ensure the backend server is running.');
    console.error('   Start the backend with: cd backend && TEST_MODE=true npm run dev');
    process.exit(1);
  }
  
  // Validate test mode
  if (!TEST_CONFIG.TEST_MODE) {
    console.warn(' WARNING: Test mode is disabled. Test may not work correctly.');
    console.warn('   To enable test mode: cd backend && TEST_MODE=true npm run dev');
    console.warn('   Then restart this test runner.');
    console.warn('');
  }
  
  console.log('🎯 Starting flash sales surge test...');
  console.log('');
  
  try {
    // Run the surge test
    await execAsync('node tests/flash_sales/surge-test.js', {
      env: { ...process.env, TEST_MODE: 'true' }
    });
    
    console.log('\n🏁 Flash sales surge test completed successfully!');
    process.exit(0);
    
  } catch (error) {
    console.error('\n Flash sales surge test failed:', error.message);
    if (error.stdout) console.log(error.stdout);
    if (error.stderr) console.error(error.stderr);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n⏹  Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n  Test terminated');
  process.exit(1);
});

// Run
main().catch(error => {
  console.error(' Unexpected error:', error);
  process.exit(1);
});


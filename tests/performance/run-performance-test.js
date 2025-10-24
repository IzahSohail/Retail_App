import { runHighVolumeUploadTest, CONFIG } from './high-volume-upload.test.js';
import axios from 'axios';

// Test configuration
const TEST_CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  MAX_RETRIES: 3,
  RETRY_DELAY: 5000, // 5 seconds
  TEST_MODE: process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
};

// Check if backend is running
async function checkBackendHealth() {
  try {
    const response = await axios.get(`${TEST_CONFIG.BACKEND_URL}/api/greet`, {
      timeout: 5000
    });
    console.log(' Backend is running and healthy');
    return true;
  } catch (error) {
    console.error(' Backend is not accessible:', error.message);
    return false;
  }
}


// Wait for backend to be ready
async function waitForBackend() {
  console.log(' Checking backend availability...');
  
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

// Main execution
async function main() {
  console.log(' High Volume Product Upload Performance Test Runner');
  console.log('='.repeat(60));
  console.log(` Test Configuration:`);
  console.log(`   - Backend URL: ${TEST_CONFIG.BACKEND_URL}`);
  console.log(`   - Test Mode: ${TEST_CONFIG.TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Concurrent Sellers: ${CONFIG.CONCURRENT_SELLERS}`);
  console.log(`   - Products per Seller: ${CONFIG.PRODUCTS_PER_SELLER}`);
  console.log(`   - Total Products: ${CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER}`);
  console.log(`   - Image Size: ${CONFIG.IMAGE_SIZE_MB}MB per product`);
  console.log(`   - Target Completion Time: ${CONFIG.TARGET_COMPLETION_TIME}s`);
  console.log(`   - Upload Delay: ${CONFIG.UPLOAD_DELAY}ms`);
  console.log(`   - Max Concurrent Connections: 10`);
  console.log('');
  
  // Check backend availability
  if (!(await waitForBackend())) {
    console.error(' Backend is not available. Please ensure the backend server is running.');
    console.error('   Start the backend with: cd backend && npm run dev');
    console.error('   For test mode: cd backend && TEST_MODE=true npm run dev');
    process.exit(1);
  }

  // Validate test mode configuration
  if (!TEST_CONFIG.TEST_MODE) {
    console.warn('  WARNING: Test mode is disabled. Performance test may not work correctly.');
    console.warn('   To enable test mode: cd backend && TEST_MODE=true npm run dev');
    console.warn('   Then restart this test runner.');
  }
  
  console.log(' Starting performance test...');
  console.log('');
  
  try {
    const results = await runHighVolumeUploadTest();
    
    console.log('\n Performance test completed!');
    
    if (results.success) {
      console.log(' All performance criteria met!');
      process.exit(0);
    } else {
      console.log(' Some performance criteria were not met.');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('\n Performance test failed with error:', error);
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n  Test interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n  Test terminated');
  process.exit(1);
});

// Run the test
main().catch(error => {
  console.error(' Unexpected error:', error);
  process.exit(1);
});

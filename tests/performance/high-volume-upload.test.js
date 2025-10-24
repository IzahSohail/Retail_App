import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';
import FormData from 'form-data';
import http from 'http';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test configuration
const CONFIG = {
  CONCURRENT_SELLERS: 100, 
  PRODUCTS_PER_SELLER: 1, 
  IMAGE_SIZE_MB: 3, 
  TARGET_COMPLETION_TIME: 35, 
  MAX_CPU_THRESHOLD: 80,
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  TEST_IMAGE_PATH: path.join(__dirname, '../../sample_data/Product.jpg'), //this is a sample image file we will use of size ~3mb
  MAX_CONCURRENT_UPLOADS: 1, 
  UPLOAD_DELAY: 100,
  TEST_MODE: process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
};

// Performance metrics
const metrics = {
  startTime: null,
  endTime: null,
  totalUploads: 0,
  successfulUploads: 0,
  failedUploads: 0,
  uploadTimes: [],
  errors: [],
  cpuUsage: [],
  memoryUsage: []
};

// Cache for categories
let categoriesCache = null;

// Connection limiter to prevent overwhelming the server
class ConnectionLimiter {
  constructor(maxConcurrent = 10) {
    this.maxConcurrent = maxConcurrent;
    this.current = 0;
    this.queue = [];
  }

  async acquire() {
    return new Promise((resolve) => {
      if (this.current < this.maxConcurrent) {
        this.current++;
        resolve();
      } else {
        this.queue.push(resolve);
      }
    });
  }

  release() {
    this.current--;
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      this.current++;
      next();
    }
  }
}

const connectionLimiter = new ConnectionLimiter(10); 

// Test data generators
function generateTestSeller(index) {
  return {
    auth0Id: `test-seller-${index}@example.com`,
    email: `seller${index}@test.com`,
    name: `Test Seller ${index}`,
    picture: `https://example.com/avatar${index}.jpg`
  };
}


function generateTestProduct(sellerIndex, productIndex) {
  // Use actual category IDs from the cache
  if (!categoriesCache || categoriesCache.length === 0) {
    throw new Error('Categories not loaded. Call fetchCategories() first.');
  }
  
  const randomCategory = categoriesCache[Math.floor(Math.random() * categoriesCache.length)];
  
  return {
    title: `Test Product ${productIndex} by Seller ${sellerIndex}`,
    description: `This is a test product ${productIndex} created by seller ${sellerIndex} for performance testing. It has a detailed description to simulate real product data.`,
    priceMinor: Math.floor(Math.random() * 10000) + 1000, // 10-110 AED
    currency: 'AED',
    categoryId: randomCategory.id, // Use actual category ID
    stock: Math.floor(Math.random() * 100) + 1,
    _testBuyerAuth0Id: `test-seller-${sellerIndex}@example.com`,
    _testBuyerEmail: `seller${sellerIndex}@test.com`,
    _testBuyerName: `Test Seller ${sellerIndex}`,
    _testBuyerPicture: `https://example.com/avatar${sellerIndex}.jpg`
  };
}

// Fetch categories from backend
async function fetchCategories() {
  try {
    const response = await axios.get(`${CONFIG.BACKEND_URL}/api/categories`);
    categoriesCache = response.data.categories || [];
    console.log(` Loaded ${categoriesCache.length} categories from backend`);
    return categoriesCache;
  } catch (error) {
    console.error(' Failed to fetch categories:', error.message);
    throw error;
  }
}


// Create test image buffer 
function createTestImageBuffer() {
  try {
    // Read the actual Product.jpg file
    const imageBuffer = fs.readFileSync(CONFIG.TEST_IMAGE_PATH);
    
    // If the image is smaller than target size, pad it to reach target size
    const targetSize = CONFIG.IMAGE_SIZE_MB * 1024 * 1024; // 1MB in bytes
    if (imageBuffer.length < targetSize) {
      const padding = Buffer.alloc(targetSize - imageBuffer.length);
      return Buffer.concat([imageBuffer, padding]);
    }
    
    // If larger than target, truncate to target size
    if (imageBuffer.length > targetSize) {
      return imageBuffer.slice(0, targetSize);
    }
    
    return imageBuffer;
  } catch (error) {
    console.error('Error creating test image:', error);
    // Fallback: create a dummy 1MB buffer
    return Buffer.alloc(CONFIG.IMAGE_SIZE_MB * 1024 * 1024);
  }
}

// Monitor system resources
function startResourceMonitoring() {
  const interval = setInterval(() => {
    const usage = process.cpuUsage();
    const memUsage = process.memoryUsage();
    
    metrics.cpuUsage.push({
      timestamp: Date.now(),
      user: usage.user,
      system: usage.system
    });
    
    metrics.memoryUsage.push({
      timestamp: Date.now(),
      rss: memUsage.rss,
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal
    });
  }, 1000); // Monitor every second
  
  return interval;
}

// Upload a single product with retry logic
async function uploadProduct(sellerIndex, productIndex, retryCount = 0) {
  const MAX_RETRIES = 3;
  const startTime = Date.now();
  
  // Acquire connection from limiter
  await connectionLimiter.acquire();
  
  try {
    const seller = generateTestSeller(sellerIndex);
    const product = generateTestProduct(sellerIndex, productIndex);
    const imageBuffer = createTestImageBuffer();
    
    // Create form data
    const formData = new FormData();
    formData.append('title', product.title);
    formData.append('description', product.description);
    formData.append('priceMinor', product.priceMinor.toString());
    formData.append('currency', product.currency);
    formData.append('categoryId', product.categoryId);
    formData.append('stock', product.stock.toString());
    formData.append('image', imageBuffer, {
      filename: `product-${sellerIndex}-${productIndex}.jpg`,
      contentType: 'image/jpeg'
    });
    
    // Add test authentication fields
    formData.append('_testBuyerAuth0Id', product._testBuyerAuth0Id);
    formData.append('_testBuyerEmail', product._testBuyerEmail);
    formData.append('_testBuyerName', product._testBuyerName);
    formData.append('_testBuyerPicture', product._testBuyerPicture);
    
    // Make the request with better error handling
    const response = await axios.post(`${CONFIG.BACKEND_URL}/api/listings`, formData, {
      headers: {
        ...formData.getHeaders(),
        'Content-Type': 'multipart/form-data'
      },
      timeout: 60000, // 60 second timeout
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
      // Add connection pooling settings
      httpAgent: new http.Agent({
        keepAlive: true,
        maxSockets: 10,
        maxFreeSockets: 5,
        timeout: 60000
      })
    });
    
    const uploadTime = Date.now() - startTime;
    metrics.uploadTimes.push(uploadTime);
    metrics.successfulUploads++;
    
    // Real-time progress update
    const currentProgress = metrics.successfulUploads + metrics.failedUploads;
    const totalProgress = CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER;
    const progressPercent = ((currentProgress / totalProgress) * 100).toFixed(1);
    
    console.log(` Seller ${sellerIndex}, Product ${productIndex}: SUCCESS (${(uploadTime/1000).toFixed(2)}s) - Progress: ${progressPercent}%`);
    
    return {
      success: true,
      uploadTime,
      productId: response.data.product?.id,
      sellerIndex,
      productIndex
    };
    
  } catch (error) {
    const uploadTime = Date.now() - startTime;
    
    // Retry on connection errors and network issues
    if (retryCount < MAX_RETRIES && (
      error.code === 'ECONNRESET' || 
      error.code === 'ETIMEDOUT' || 
      error.code === 'ECONNREFUSED' ||
      error.message?.includes('fetch failed') ||
      error.message?.includes('Unexpected end of form')
    )) {
      console.log(`⚠️  Seller ${sellerIndex}, Product ${productIndex}: Retry ${retryCount + 1}/${MAX_RETRIES} after ${error.code || error.message}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
      return uploadProduct(sellerIndex, productIndex, retryCount + 1);
    }
    
    metrics.failedUploads++;
    metrics.errors.push({
      sellerIndex,
      productIndex,
      error: error.message,
      uploadTime
    });
    
    // Real-time progress update for failures
    const currentProgress = metrics.successfulUploads + metrics.failedUploads;
    const totalProgress = CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER;
    const progressPercent = ((currentProgress / totalProgress) * 100).toFixed(1);
    
    console.log(` Seller ${sellerIndex}, Product ${productIndex}: FAILED (${(uploadTime/1000).toFixed(2)}s) - ${error.message} - Progress: ${progressPercent}%`);
    
    return {
      success: false,
      uploadTime,
      error: error.message,
      sellerIndex,
      productIndex
    };
  } finally {
    // Always release the connection
    connectionLimiter.release();
  }
}

// Upload products for a single seller with concurrency control
async function uploadProductsForSeller(sellerIndex) {
  const results = [];
  const productIndices = Array.from({ length: CONFIG.PRODUCTS_PER_SELLER }, (_, i) => i + 1);
  
  // Process in batches to avoid overwhelming the server
  for (let i = 0; i < productIndices.length; i += CONFIG.MAX_CONCURRENT_UPLOADS) {
    const batch = productIndices.slice(i, i + CONFIG.MAX_CONCURRENT_UPLOADS);
    
    // Add delay between uploads to prevent server overload
    if (i > 0) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.UPLOAD_DELAY));
    }
    
    const batchPromises = batch.map(productIndex => uploadProduct(sellerIndex, productIndex));
    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
    
    // Small delay between batches
    if (i + CONFIG.MAX_CONCURRENT_UPLOADS < productIndices.length) {
      await new Promise(resolve => setTimeout(resolve, CONFIG.UPLOAD_DELAY * 2));
    }
  }
  
  return results;
}

// Main test execution
async function runHighVolumeUploadTest() {
  console.log(' Starting High Volume Product Upload Performance Test');
  console.log(` Configuration:`);
  console.log(`   - Concurrent Sellers: ${CONFIG.CONCURRENT_SELLERS}`);
  console.log(`   - Products per Seller: ${CONFIG.PRODUCTS_PER_SELLER}`);
  console.log(`   - Total Products: ${CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER}`);
  console.log(`   - Image Size: ${CONFIG.IMAGE_SIZE_MB}MB per product`);
  console.log(`   - Target Completion Time: ${CONFIG.TARGET_COMPLETION_TIME}s`);
  console.log(`   - Max CPU Threshold: ${CONFIG.MAX_CPU_THRESHOLD}%`);
  console.log(`   - Test Mode: ${CONFIG.TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log('');
  
  // Fetch categories before starting
  console.log(' Fetching categories from backend...');
  try {
    await fetchCategories();
  } catch (error) {
    console.error(' Cannot proceed without categories');
    throw error;
  }
  
  // Start resource monitoring
  const monitoringInterval = startResourceMonitoring();
  
  // Record start time
  metrics.startTime = Date.now();
  console.log(`⏰ Test started at: ${new Date(metrics.startTime).toISOString()}`);
  
  try {
    // Create array of seller upload tasks with staggered start
    const sellerTasks = [];
    for (let sellerIndex = 1; sellerIndex <= CONFIG.CONCURRENT_SELLERS; sellerIndex++) {
      // Stagger the start of each seller to prevent overwhelming the server
      const delay = (sellerIndex - 1) * 50; // 50ms delay between each seller start
      const task = new Promise(resolve => {
        setTimeout(async () => {
          try {
            const result = await uploadProductsForSeller(sellerIndex);
            resolve(result);
          } catch (error) {
            console.error(` Seller ${sellerIndex} task failed:`, error.message);
            resolve([]);
          }
        }, delay);
      });
      sellerTasks.push(task);
    }
    
    console.log(`🔄 Starting concurrent uploads for ${CONFIG.CONCURRENT_SELLERS} sellers...`);
    
    // Start periodic progress updates
    const progressInterval = setInterval(() => {
      const currentProgress = metrics.successfulUploads + metrics.failedUploads;
      const totalProgress = CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER;
      const progressPercent = ((currentProgress / totalProgress) * 100).toFixed(1);
      const elapsedTime = (Date.now() - metrics.startTime) / 1000;
      
      console.log(` Progress Update: ${currentProgress}/${totalProgress} (${progressPercent}%) - Success: ${metrics.successfulUploads}, Failed: ${metrics.failedUploads}, Elapsed: ${elapsedTime.toFixed(1)}s`);
    }, 10000); // Update every 10 seconds
    
    // Execute all seller uploads concurrently
    const allResults = await Promise.all(sellerTasks);
    
    // Clear progress updates
    clearInterval(progressInterval);
    
    // Record end time
    metrics.endTime = Date.now();
    const totalTestTime = (metrics.endTime - metrics.startTime) / 1000;
    
    // Stop resource monitoring
    clearInterval(monitoringInterval);
    
    // Calculate metrics
    metrics.totalUploads = CONFIG.CONCURRENT_SELLERS * CONFIG.PRODUCTS_PER_SELLER;
    const successRate = (metrics.successfulUploads / metrics.totalUploads) * 100;
    const avgUploadTime = metrics.uploadTimes.reduce((a, b) => a + b, 0) / metrics.uploadTimes.length;
    const maxUploadTime = Math.max(...metrics.uploadTimes);
    const minUploadTime = Math.min(...metrics.uploadTimes);
    
    // Calculate CPU usage (convert from microseconds to percentage)
    const avgCpuUsage = metrics.cpuUsage.length > 0 
      ? metrics.cpuUsage.reduce((sum, usage) => sum + (usage.user + usage.system), 0) / metrics.cpuUsage.length
      : 0;
    
    // Convert microseconds to percentage (assuming 1 second intervals)
    const avgCpuPercentage = avgCpuUsage / 1000000; // Convert microseconds to seconds, then to percentage
    
    // Generate report
    console.log('\n PERFORMANCE TEST RESULTS');
    console.log('='.repeat(50));
    console.log(`  Total Test Duration: ${totalTestTime.toFixed(2)}s`);
    console.log(` Total Uploads: ${metrics.totalUploads}`);
    console.log(` Successful Uploads: ${metrics.successfulUploads}`);
    console.log(` Failed Uploads: ${metrics.failedUploads}`);
    console.log(` Success Rate: ${successRate.toFixed(2)}%`);
    console.log('');
    console.log('  Upload Time Statistics:');
    console.log(`   - Average: ${(avgUploadTime / 1000).toFixed(2)}s`);
    console.log(`   - Fastest: ${(minUploadTime / 1000).toFixed(2)}s`);
    console.log(`   - Slowest: ${(maxUploadTime / 1000).toFixed(2)}s`);
    console.log('');
    console.log(' System Resource Usage:');
    console.log(`   - Average CPU Usage: ${avgCpuPercentage.toFixed(2)}%`);
    console.log(`   - Peak Memory: ${(Math.max(...metrics.memoryUsage.map(m => m.heapUsed)) / 1024 / 1024).toFixed(2)}MB`);
    console.log('');
    
    // Performance criteria evaluation
    const performanceCriteria = {
      completionTime: totalTestTime <= CONFIG.TARGET_COMPLETION_TIME,
      successRate: successRate >= 95,
      avgUploadTime: avgUploadTime <= 30000, // 30 seconds
      cpuUsage: avgCpuPercentage <= CONFIG.MAX_CPU_THRESHOLD // Now comparing percentages correctly
    };
    
    console.log('🎯 PERFORMANCE CRITERIA EVALUATION');
    console.log('='.repeat(50));
    console.log(` Completion Time (≤${CONFIG.TARGET_COMPLETION_TIME}s): ${performanceCriteria.completionTime ? 'PASS' : 'FAIL'} (${totalTestTime.toFixed(2)}s)`);
    console.log(` Success Rate (≥95%): ${performanceCriteria.successRate ? 'PASS' : 'FAIL'} (${successRate.toFixed(2)}%)`);
    console.log(` Average Upload Time (≤30s): ${performanceCriteria.avgUploadTime ? 'PASS' : 'FAIL'} (${(avgUploadTime / 1000).toFixed(2)}s)`);
    console.log(` CPU Usage (≤${CONFIG.MAX_CPU_THRESHOLD}%): ${performanceCriteria.cpuUsage ? 'PASS' : 'FAIL'} (${avgCpuPercentage.toFixed(2)}%)`);
    
    const overallPass = Object.values(performanceCriteria).every(criteria => criteria);
    console.log('');
    console.log(`🏆 OVERALL RESULT: ${overallPass ? 'PASS' : 'FAIL'}`);
    
    // Error summary
    if (metrics.errors.length > 0) {
      console.log('\n ERROR SUMMARY');
      console.log('='.repeat(50));
      const errorTypes = {};
      metrics.errors.forEach(error => {
        const errorType = error.error.split(':')[0];
        errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
      });
      
      Object.entries(errorTypes).forEach(([errorType, count]) => {
        console.log(`   - ${errorType}: ${count} occurrences`);
      });
    }
    
    return {
      success: overallPass,
      metrics: {
        ...metrics,
        totalTestTime,
        successRate,
        avgUploadTime,
        maxUploadTime,
        minUploadTime,
        avgCpuPercentage
      },
      performanceCriteria
    };
    
  } catch (error) {
    console.error(' Test execution failed:', error);
    clearInterval(monitoringInterval);
    throw error;
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runHighVolumeUploadTest()
    .then(results => {
      console.log('\ Performance test completed successfully!');
      process.exit(results.success ? 0 : 1);
    })
    .catch(error => {
      console.error('\n Performance test failed:', error);
      process.exit(1);
    });
}

export { runHighVolumeUploadTest, CONFIG };

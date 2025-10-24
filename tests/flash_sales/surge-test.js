import axios from 'axios';
import { prisma } from '../../backend/src/db.js';

// Test configuration
const CONFIG = {
  BACKEND_URL: process.env.BACKEND_URL || 'http://localhost:3001',
  NUM_PRODUCTS: 10,
  STOCK_PER_PRODUCT: 100,
  CONCURRENT_BUYERS: 50,
  DISCOUNT_PERCENTAGE: 50,
  MAX_LATENCY_MS: 5000, // 5 seconds max for order processing
  TEST_MODE: process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test'
};

// Test metrics
const metrics = {
  startTime: null,
  endTime: null,
  totalOrders: 0,
  successfulOrders: 0,
  failedOrders: 0,
  orderLatencies: [],
  errors: [],
  stockViolations: 0,
  queuedOrders: 0
};

// Store created test data for cleanup
const testData = {
  products: [],
  flashSale: null,
  users: []
};

// SETUP FUNCTIONS

async function cleanupExistingTestData() {
  console.log('\n Cleaning up any existing test data...');
  
  try {
    // Delete any existing test purchases
    await prisma.purchase.deleteMany({
      where: {
        product: {
          title: {
            startsWith: 'Flash Sale Test Product'
          }
        }
      }
    });
    
    // Delete any existing test flash sales
    await prisma.flashSale.deleteMany({
      where: {
        title: 'Test Flash Sale - Surge Test'
      }
    });
    
    // Delete any existing test products
    await prisma.product.deleteMany({
      where: {
        title: {
          startsWith: 'Flash Sale Test Product'
        }
      }
    });
    
    // Delete any existing test users
    const testSellerEmails = Array.from({ length: CONFIG.NUM_PRODUCTS }, (_, i) => 
      `test-seller-flashsale-${i + 1}@test.com`
    );
    const testBuyerEmails = Array.from({ length: CONFIG.CONCURRENT_BUYERS }, (_, i) => 
      `buyer-surge-${i + 1}@test.com`
    );
    
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [...testSellerEmails, ...testBuyerEmails]
        }
      }
    });
    
    console.log(' Existing test data cleaned up');
  } catch (error) {
    console.warn('  Warning during cleanup:', error.message);
  }
}

async function setupTestProducts() {
  console.log(`\n  Setting up ${CONFIG.NUM_PRODUCTS} test products...`);
  
  try {
    // Fetch categories
    const categoriesResponse = await axios.get(`${CONFIG.BACKEND_URL}/api/categories`);
    const categories = categoriesResponse.data.categories || [];
    
    if (categories.length === 0) {
      throw new Error('No categories available');
    }
    
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    
    // Create test products
    for (let i = 1; i <= CONFIG.NUM_PRODUCTS; i++) {
      // First create the seller user (using upsert to handle existing users)
      const seller = await prisma.user.upsert({
        where: {
          email: `test-seller-flashsale-${i}@test.com`
        },
        update: {},
        create: {
          email: `test-seller-flashsale-${i}@test.com`,
          name: `Test Seller ${i}`,
          auth0Id: `test-seller-flashsale-${i}@test.com`,
          role: 'BUSINESS'
        }
      });
      
      // Then create the product
      const product = await prisma.product.create({
        data: {
          title: `Flash Sale Test Product ${i}`,
          description: `Test product ${i} for flash sale surge testing`,
          priceMinor: 10000, // 100 AED
          currency: 'AED',
          stock: CONFIG.STOCK_PER_PRODUCT,
          imageUrl: 'https://via.placeholder.com/300',
          category: {
            connect: {
              id: randomCategory.id
            }
          },
          seller: {
            connect: {
              id: seller.id
            }
          }
        }
      });
      
      testData.products.push(product);
      console.log(`   Created product ${i}: ${product.title} (Stock: ${product.stock}, Seller: ${seller.email})`);
    }
    
    console.log(` Created ${testData.products.length} test products`);
    return testData.products;
    
  } catch (error) {
    console.error(' Failed to setup test products:', error.message);
    throw error;
  }
}

async function setupFlashSale(productIds) {
  console.log(`\n⚡ Creating flash sale with ${CONFIG.DISCOUNT_PERCENTAGE}% discount...`);
  
  try {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    
    // Create flash sale
    const flashSale = await prisma.flashSale.create({
      data: {
        title: 'Test Flash Sale - Surge Test',
        description: 'Flash sale for concurrent purchase testing',
        discountType: 'PERCENTAGE',
        discountValue: CONFIG.DISCOUNT_PERCENTAGE,
        startsAt: now,
        endsAt: oneHourLater,
        priority: 1,
        items: {
          create: productIds.map(productId => ({
            productId: productId
          }))
        }
      },
      include: {
        items: true
      }
    });
    
    testData.flashSale = flashSale;
    console.log(` Created flash sale: ${flashSale.title}`);
    console.log(`   Discount: ${flashSale.discountValue}%`);
    console.log(`   Products on sale: ${flashSale.items.length}`);
    console.log(`   Active until: ${flashSale.endsAt.toISOString()}`);
    
    return flashSale;
    
  } catch (error) {
    console.error(' Failed to create flash sale:', error.message);
    throw error;
  }
}

async function setupTestBuyers() {
  console.log(`\n Setting up ${CONFIG.CONCURRENT_BUYERS} test buyers...`);
  
  try {
    for (let i = 1; i <= CONFIG.CONCURRENT_BUYERS; i++) {
      // Create the buyer user in the database
      const dbUser = await prisma.user.upsert({
        where: {
          email: `buyer-surge-${i}@test.com`
        },
        update: {},
        create: {
          email: `buyer-surge-${i}@test.com`,
          name: `Test Buyer ${i}`,
          auth0Id: `test-buyer-surge-${i}@test.com`,
          role: 'USER'
        }
      });
      
      const user = {
        auth0Id: dbUser.auth0Id,
        email: dbUser.email,
        name: dbUser.name,
        picture: `https://example.com/avatar${i}.jpg`
      };
      
      testData.users.push(user);
    }
    
    console.log(` Created ${testData.users.length} test buyer accounts in database`);
    return testData.users;
    
  } catch (error) {
    console.error(' Failed to setup test buyers:', error.message);
    throw error;
  }
}

// TEST EXECUTION FUNCTIONS

async function purchaseProduct(buyerIndex, product) {
  const startTime = Date.now();
  const buyer = testData.users[buyerIndex - 1];
  
  try {
    // Step 1: Add product to cart
    const cartPayload = {
      productId: product.id,
      quantity: 1,
      _testBuyerAuth0Id: buyer.auth0Id,
      _testBuyerEmail: buyer.email,
      _testBuyerName: buyer.name,
      _testBuyerPicture: buyer.picture
    };
    
    const addToCartResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/cart/add`,
      cartPayload,
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        },
        validateStatus: function (status) {
          return status < 500; // Don't throw on 4xx errors so we can log them
        }
      }
    );
    
    if (addToCartResponse.status === 404) {
      throw new Error(`Cart endpoint not found (404) - URL: ${CONFIG.BACKEND_URL}/api/cart/add`);
    }
    
    if (!addToCartResponse.data || !addToCartResponse.data.success) {
      throw new Error(`Failed to add to cart: ${JSON.stringify(addToCartResponse.data)}`);
    }
    
    // Step 2: Checkout (process order)
    const checkoutResponse = await axios.post(
      `${CONFIG.BACKEND_URL}/api/cart/checkout`,
      {
        paymentMethod: 'CARD',
        _testBuyerAuth0Id: buyer.auth0Id,
        _testBuyerEmail: buyer.email,
        _testBuyerName: buyer.name,
        _testBuyerPicture: buyer.picture
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );
    
    const latency = Date.now() - startTime;
    metrics.orderLatencies.push(latency);
    
    if (checkoutResponse.data.success) {
      metrics.successfulOrders++;
      console.log(` Buyer ${buyerIndex}: Purchased ${product.title} (${latency}ms)`);
      
      // Check if latency exceeded threshold
      if (latency > CONFIG.MAX_LATENCY_MS) {
        console.warn(`  Buyer ${buyerIndex}: Latency exceeded ${CONFIG.MAX_LATENCY_MS}ms (${latency}ms)`);
      }
      
      return {
        success: true,
        latency,
        buyerIndex,
        productId: product.id,
        orderId: checkoutResponse.data.orderId
      };
    } else {
      throw new Error(checkoutResponse.data.error || 'Checkout failed');
    }
    
  } catch (error) {
    const latency = Date.now() - startTime;
    metrics.failedOrders++;
    metrics.errors.push({
      buyerIndex,
      productId: product.id,
      error: error.message,
      latency
    });
    
    console.log(` Buyer ${buyerIndex}: Failed - ${error.message} (${latency}ms)`);
    
    return {
      success: false,
      latency,
      buyerIndex,
      productId: product.id,
      error: error.message
    };
  }
}

async function runConcurrentPurchases() {
  console.log(`\n Starting concurrent purchase test...`);
  console.log(`   ${CONFIG.CONCURRENT_BUYERS} buyers`);
  console.log(`   ${testData.products.length} products available`);
  console.log(`   Target: Fair throttling and bounded latency\n`);
  
  metrics.startTime = Date.now();
  metrics.totalOrders = CONFIG.CONCURRENT_BUYERS;
  
  // Create purchase tasks - each buyer picks a random product
  const purchaseTasks = [];
  for (let buyerIndex = 1; buyerIndex <= CONFIG.CONCURRENT_BUYERS; buyerIndex++) {
    const randomProduct = testData.products[Math.floor(Math.random() * testData.products.length)];
    
    // Stagger starts slightly to simulate realistic load
    const delay = (buyerIndex - 1) * 10; // 10ms stagger
    const task = new Promise(resolve => {
      setTimeout(async () => {
        try {
          const result = await purchaseProduct(buyerIndex, randomProduct);
          resolve(result);
        } catch (error) {
          console.error(` Buyer ${buyerIndex} task failed:`, error.message);
          resolve({ success: false, error: error.message, buyerIndex });
        }
      }, delay);
    });
    
    purchaseTasks.push(task);
  }
  
  // Execute all purchases concurrently
  console.log(` Processing ${CONFIG.CONCURRENT_BUYERS} concurrent orders...\n`);
  const results = await Promise.all(purchaseTasks);
  
  metrics.endTime = Date.now();
  
  return results;
}

// VALIDATION & REPORTING

async function validateStockIntegrity() {
  console.log(`\n🔍 Validating stock integrity...`);
  
  try {
    for (const originalProduct of testData.products) {
      const currentProduct = await prisma.product.findUnique({
        where: { id: originalProduct.id }
      });
      
      const expectedStock = originalProduct.stock;
      const actualStock = currentProduct.stock;
      const purchasesMade = await prisma.purchase.count({
        where: { productId: originalProduct.id }
      });
      
      const expectedFinalStock = expectedStock - purchasesMade;
      
      if (actualStock !== expectedFinalStock) {
        console.error(` Stock violation for ${currentProduct.title}`);
        console.error(`   Expected: ${expectedFinalStock}, Actual: ${actualStock}, Purchases: ${purchasesMade}`);
        metrics.stockViolations++;
      } else {
        console.log(` ${currentProduct.title}: Stock correct (${actualStock} remaining, ${purchasesMade} sold)`);
      }
      
      // Check for negative stock
      if (actualStock < 0) {
        console.error(` CRITICAL: Negative stock detected! Product: ${currentProduct.title}, Stock: ${actualStock}`);
        metrics.stockViolations++;
      }
    }
    
    if (metrics.stockViolations === 0) {
      console.log(` All stock levels are correct - no race conditions detected`);
    } else {
      console.error(` Found ${metrics.stockViolations} stock violations`);
    }
    
  } catch (error) {
    console.error(' Failed to validate stock:', error.message);
  }
}

function generateReport() {
  const totalTime = (metrics.endTime - metrics.startTime) / 1000;
  const successRate = (metrics.successfulOrders / metrics.totalOrders) * 100;
  
  // Latency statistics
  const avgLatency = metrics.orderLatencies.reduce((a, b) => a + b, 0) / metrics.orderLatencies.length;
  const maxLatency = Math.max(...metrics.orderLatencies);
  const minLatency = Math.min(...metrics.orderLatencies);
  const p95Latency = calculatePercentile(metrics.orderLatencies, 95);
  const p99Latency = calculatePercentile(metrics.orderLatencies, 99);
  
  console.log('\n' + '='.repeat(60));
  console.log(' FLASH SALES SURGE TEST RESULTS');
  console.log('='.repeat(60));
  
  console.log('\n  Test Duration:');
  console.log(`   Total Time: ${totalTime.toFixed(2)}s`);
  
  console.log('\n Orders:');
  console.log(`   Total Orders: ${metrics.totalOrders}`);
  console.log(`   Successful: ${metrics.successfulOrders} (${successRate.toFixed(2)}%)`);
  console.log(`   Failed: ${metrics.failedOrders}`);
  
  console.log('\n Latency Statistics:');
  console.log(`   Average: ${avgLatency.toFixed(0)}ms`);
  console.log(`   Min: ${minLatency.toFixed(0)}ms`);
  console.log(`   Max: ${maxLatency.toFixed(0)}ms`);
  console.log(`   P95: ${p95Latency.toFixed(0)}ms`);
  console.log(`   P99: ${p99Latency.toFixed(0)}ms`);
  
  console.log('\n Performance Criteria:');
  const latencyPass = maxLatency <= CONFIG.MAX_LATENCY_MS;
  const successRatePass = successRate >= 95;
  const stockIntegrityPass = metrics.stockViolations === 0;
  
  console.log(`   ✓ Bounded Latency (≤${CONFIG.MAX_LATENCY_MS}ms): ${latencyPass ? 'PASS' : 'FAIL'} (max: ${maxLatency.toFixed(0)}ms)`);
  console.log(`   ✓ Success Rate (≥95%): ${successRatePass ? 'PASS' : 'FAIL'} (${successRate.toFixed(2)}%)`);
  console.log(`   ✓ Stock Integrity: ${stockIntegrityPass ? 'PASS' : 'FAIL'} (${metrics.stockViolations} violations)`);
  
  // Error summary
  if (metrics.errors.length > 0) {
    console.log('\n Error Summary:');
    const errorTypes = {};
    metrics.errors.forEach(error => {
      const errorType = error.error.split(':')[0];
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });
    
    Object.entries(errorTypes).forEach(([errorType, count]) => {
      console.log(`   - ${errorType}: ${count} occurrences`);
    });
  }
  
  // Overall result
  const overallPass = latencyPass && successRatePass && stockIntegrityPass;
  console.log('\n' + '='.repeat(60));
  console.log(` OVERALL RESULT: ${overallPass ? ' PASS' : ' FAIL'}`);
  console.log('='.repeat(60));
  
  return {
    success: overallPass,
    metrics: {
      totalTime,
      successRate,
      avgLatency,
      maxLatency,
      p95Latency,
      p99Latency,
      stockViolations: metrics.stockViolations
    }
  };
}

function calculatePercentile(values, percentile) {
  if (values.length === 0) return 0;
  
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index];
}

// CLEANUP

async function cleanup() {
  console.log('\n Cleaning up test data...');
  
  try {
    // Delete purchases
    if (testData.products.length > 0) {
      const productIds = testData.products.map(p => p.id);
      await prisma.purchase.deleteMany({
        where: { productId: { in: productIds } }
      });
      console.log('   Deleted test purchases');
    }
    
    // Delete flash sale items
    if (testData.flashSale) {
      await prisma.flashSaleItem.deleteMany({
        where: { flashSaleId: testData.flashSale.id }
      });
      console.log('   Deleted flash sale items');
      
      // Delete flash sale
      await prisma.flashSale.delete({
        where: { id: testData.flashSale.id }
      });
      console.log('   Deleted flash sale');
    }
    
    // Delete products (this will cascade delete related data)
    if (testData.products.length > 0) {
      const productIds = testData.products.map(p => p.id);
      await prisma.product.deleteMany({
        where: { id: { in: productIds } }
      });
      console.log('   Deleted test products');
    }
    
    // Delete test users
    const sellerEmails = testData.products.map(p => `test-seller-flashsale-${testData.products.indexOf(p) + 1}@test.com`);
    const buyerEmails = testData.users.map(u => u.email);
    const allEmails = [...sellerEmails, ...buyerEmails];
    
    if (allEmails.length > 0) {
      await prisma.user.deleteMany({
        where: { email: { in: allEmails } }
      });
      console.log('   Deleted test users');
    }
    
    console.log(' Cleanup completed');
    
  } catch (error) {
    console.error(' Cleanup failed:', error.message);
  }
}

// MAIN TEST EXECUTION

async function main() {
  console.log(' Flash Sales Surge Test');
  console.log('='.repeat(60));
  console.log('Testing system behavior during order surges:\n');
  console.log(` Test Configuration:`);
  console.log(`   - Backend URL: ${CONFIG.BACKEND_URL}`);
  console.log(`   - Test Mode: ${CONFIG.TEST_MODE ? 'ENABLED' : 'DISABLED'}`);
  console.log(`   - Products: ${CONFIG.NUM_PRODUCTS}`);
  console.log(`   - Stock per Product: ${CONFIG.STOCK_PER_PRODUCT}`);
  console.log(`   - Concurrent Buyers: ${CONFIG.CONCURRENT_BUYERS}`);
  console.log(`   - Flash Sale Discount: ${CONFIG.DISCOUNT_PERCENTAGE}%`);
  console.log(`   - Max Latency Target: ${CONFIG.MAX_LATENCY_MS}ms`);
  
  if (!CONFIG.TEST_MODE) {
    console.error('\n TEST_MODE is not enabled!');
    console.error('   Please start backend with: cd backend && TEST_MODE=true npm run dev');
    process.exit(1);
  }
  
  try {
    // Cleanup any existing test data first
    await cleanupExistingTestData();
    
    // Setup phase
    const products = await setupTestProducts();
    await setupFlashSale(products.map(p => p.id));
    await setupTestBuyers();
    
    // Execution phase
    await runConcurrentPurchases();
    
    // Validation phase
    await validateStockIntegrity();
    
    // Generate report
    const results = generateReport();
    
    // Cleanup
    await cleanup();
    
    // Exit with appropriate code
    process.exit(results.success ? 0 : 1);
    
  } catch (error) {
    console.error('\n Test failed with error:', error);
    
    // Attempt cleanup even on failure
    try {
      await cleanup();
    } catch (cleanupError) {
      console.error('Failed to cleanup:', cleanupError.message);
    }
    
    process.exit(1);
  }
}

// Handle process termination
process.on('SIGINT', async () => {
  console.log('\n  Test interrupted by user');
  await cleanup();
  process.exit(1);
});

process.on('SIGTERM', async () => {
  console.log('\n  Test terminated');
  await cleanup();
  process.exit(1);
});

// Run the test
main().catch(async (error) => {
  console.error(' Unexpected error:', error);
  await cleanup();
  process.exit(1);
});


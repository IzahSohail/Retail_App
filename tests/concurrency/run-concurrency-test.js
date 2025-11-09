import request from 'supertest';
import { PrismaClient } from '@prisma/client';

// Import the Express app
import { app } from '../../backend/src/server.js';

const prisma = new PrismaClient();
const TEST_PRODUCT_ID = 'concurrency-test-product';

async function runConcurrencyTest() {
  try {
    console.log(' Starting Concurrency Integration Test\n');
    console.log(' This test sends 10 concurrent POST requests to /api/purchase\n');

    // 1. Fetch the test product
    const product = await prisma.product.findUnique({
      where: { id: TEST_PRODUCT_ID }
    });

    if (!product) {
      throw new Error(' Test product not found. Run: node tests/concurrency/setup-concurrency-test.js');
    }

    // 2. Fetch seller
    const seller = await prisma.user.findUnique({
      where: { email: 'seller-concurrency@test.com' }
    });

    // 3. Fetch all test buyers
    const buyers = await prisma.user.findMany({
      where: {
        email: {
          startsWith: 'buyer',
          endsWith: '-concurrency@test.com'
        }
      },
      orderBy: { email: 'asc' }
    });

    if (buyers.length !== 10) {
      throw new Error(` Expected 10 buyers, found ${buyers.length}. Run setup script first.`);
    }

    console.log(' Test Setup Complete:');
    console.log(`   Product: ${product.title} (ID: ${product.id})`);
    console.log(`   Seller: ${seller.email}`);
    console.log(`   Buyers: ${buyers.length} test users\n`);

    // 4. Reset product stock to 5
    const initialStock = 5;
    const quantity = 1;

    await prisma.product.update({
      where: { id: TEST_PRODUCT_ID },
      data: { stock: initialStock, active: true }
    });

    console.log(' Test Scenario:');
    console.log(`   Initial Stock: ${initialStock}`);
    console.log(`   Concurrent Requests: ${buyers.length}`);
    console.log(`   Expected Success: 5`);
    console.log(`   Expected Failure: 5\n`);

    console.log(' Launching 10 concurrent POST /api/purchase requests...\n');

    // 5. Send 10 concurrent requests
    const purchasePromises = buyers.map((buyer, index) => {
      return sendPurchaseRequest(buyer, product.id, quantity, index + 1);
    });

    // Wait for all to complete
    const results = await Promise.allSettled(purchasePromises);

    // 6. Analyze results
    const successful = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const failed = results.filter(r => r.status === 'fulfilled' && !r.value.success);
    const errors = results.filter(r => r.status === 'rejected');

    // 7. Check final stock
    const finalProduct = await prisma.product.findUnique({
      where: { id: TEST_PRODUCT_ID }
    });

    console.log('\n' + '='.repeat(60));
    console.log(' TEST RESULTS');
    console.log('='.repeat(60));
    console.log(` Successful purchases: ${successful.length}`);
    console.log(` Failed purchases: ${failed.length}`);
    console.log(`  Errors: ${errors.length}`);
    console.log();
    console.log(' Stock Status:');
    console.log(`   Initial: ${initialStock}`);
    console.log(`   Final: ${finalProduct.stock}`);
    console.log(`   Sold: ${initialStock - finalProduct.stock}`);

    // Log failures
    if (failed.length > 0) {
      console.log('\n Failed Purchase Reasons:');
      failed.slice(0, 3).forEach((result, idx) => {
        console.log(`   ${idx + 1}. ${result.value.error}`);
      });
      if (failed.length > 3) {
        console.log(`   ... and ${failed.length - 3} more`);
      }
    }

    // 8. Verify test passed
    const totalSold = initialStock - finalProduct.stock;
    const passed = 
      successful.length === 5 &&
      failed.length === 5 &&
      finalProduct.stock === 0 &&
      totalSold === successful.length &&
      totalSold <= initialStock;

    console.log('\n' + '='.repeat(60));
    if (passed) {
      console.log(' TEST PASSED: Concurrency control working correctly!');
      console.log('='.repeat(60));
      console.log('✓ Exactly 5 requests succeeded');
      console.log('✓ Exactly 5 requests failed (insufficient stock)');
      console.log('✓ Final stock is 0 (not negative)');
      console.log('✓ No overselling detected');
      console.log('✓ Atomic stock control verified\n');
      process.exit(0);
    } else {
      console.log(' TEST FAILED: Concurrency issue detected!');
      console.log('='.repeat(60));
      console.log(`Expected: 5 successful, got ${successful.length}`);
      console.log(`Expected: 5 failed, got ${failed.length}`);
      console.log(`Expected: final stock 0, got ${finalProduct.stock}`);
      console.log(`Total sold (${totalSold}) should equal successful (${successful.length})\n`);
      process.exit(1);
    }

  } catch (error) {
    console.error('\n Test Error:', error.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Helper: Send HTTP POST request to /api/purchase
async function sendPurchaseRequest(buyer, productId, quantity, buyerNumber) {
  try {
    console.log(`   [${buyerNumber}] Sending POST /api/purchase...`);

    const response = await request(app)
      .post('/api/purchase')
      .set('Accept', 'application/json')
      .set('Content-Type', 'application/json')
      .send({
        productId,
        quantity,
        paymentMethod: 'CARD',
        // Test mode authentication bypass
        _testBuyerAuth0Id: buyer.auth0Id,
        _testBuyerEmail: buyer.email,
        _testBuyerName: buyer.name,
        _testBuyerPicture: buyer.picture
      });

    if (response.status === 200 && response.body.success) {
      console.log(`   [${buyerNumber}]  Success (HTTP 200)`);
      return { success: true, data: response.body };
    } else {
      const errorMsg = response.body.error || `HTTP ${response.status}`;
      console.log(`   [${buyerNumber}]  Failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }

  } catch (error) {
    console.log(`   [${buyerNumber}] Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// Run the test
runConcurrencyTest();


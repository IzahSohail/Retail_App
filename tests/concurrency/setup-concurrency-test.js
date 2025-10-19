// Setup script for concurrency test
// Run this first: node tests/concurrency/setup-concurrency-test.js

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupConcurrencyTest() {
  try {
    console.log('🔧 Setting up concurrency test data...\n');

    // 1. Create a test seller
    const seller = await prisma.user.upsert({
      where: { email: 'seller-concurrency@test.com' },
      update: {},
      create: {
        auth0Id: 'auth0|seller-concurrency-test',
        email: 'seller-concurrency@test.com',
        name: 'Concurrency Test Seller',
        picture: 'https://via.placeholder.com/150'
      }
    });
    console.log(`✅ Created seller: ${seller.email} (ID: ${seller.id})`);

    // 2. Create a test product with limited stock
    const product = await prisma.product.upsert({
      where: { id: 'concurrency-test-product' },
      update: {
        stock: 5, // Only 5 items available
        active: true
      },
      create: {
        id: 'concurrency-test-product',
        title: 'Apple AirPods',
        description: 'Wireless earbuds with excellent sound quality. Only 5 in stock for concurrency testing!',
        priceMinor: 10000, // 100.00 AED
        currency: 'AED',
        stock: 5, // Only 5 items available
        sellerId: seller.id,
        categoryId: 'cmfphezpk0001p6lmn0epe4ad', // Electronics category
        active: true
      }
    });
    console.log(`✅ Created product: ${product.title} (ID: ${product.id}, Stock: ${product.stock})`);

    // 3. Create 10 test buyers
    console.log('\n📦 Creating 10 test buyers...');
    const buyers = [];
    for (let i = 1; i <= 10; i++) {
      const buyer = await prisma.user.upsert({
        where: { email: `buyer${i}-concurrency@test.com` },
        update: {},
        create: {
          auth0Id: `auth0|buyer${i}-concurrency-test`,
          email: `buyer${i}-concurrency@test.com`,
          name: `Test Buyer ${i}`,
          picture: 'https://via.placeholder.com/150'
        }
      });
      buyers.push(buyer);
      console.log(`  ✅ Buyer ${i}: ${buyer.email} (ID: ${buyer.id})`);
    }

    console.log('\n✨ Concurrency test data setup complete!\n');
    console.log('📝 Summary:');
    console.log(`   - Product ID: ${product.id}`);
    console.log(`   - Product Stock: ${product.stock}`);
    console.log(`   - Number of Buyers: ${buyers.length}`);
    console.log(`   - Seller ID: ${seller.id}`);
    console.log('\n🧪 Now run the concurrency test:');
    console.log('   npx jest tests/concurrency/concurrency.test.js\n');

  } catch (error) {
    console.error('❌ Error setting up concurrency test:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupConcurrencyTest();


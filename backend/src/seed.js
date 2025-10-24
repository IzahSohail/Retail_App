// this is just some dummy data to populate the database for testing purposes
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log(' Seeding database...');

  // Create a test seller user
  const testSeller = await prisma.user.upsert({
    where: { email: 'seller@test.com' },
    update: {},
    create: {
      email: 'seller@test.com',
      name: 'Test Seller',
      auth0Id: 'auth0|test-seller-001',
      role: 'USER'
    }
  });

  // Create categories
  const textbooksCategory = await prisma.category.upsert({
    where: { slug: 'textbooks' },
    update: {},
    create: {
      name: 'Textbooks',
      slug: 'textbooks'
    }
  });

  const electronicsCategory = await prisma.category.upsert({
    where: { slug: 'electronics' },
    update: {},
    create: {
      name: 'Electronics',
      slug: 'electronics'
    }
  });

  const clothingCategory = await prisma.category.upsert({
    where: { slug: 'clothing' },
    update: {},
    create: {
      name: 'Clothing',
      slug: 'clothing'
    }
  });

  const furnitureCategory = await prisma.category.upsert({
    where: { slug: 'furniture' },
    update: {},
    create: {
      name: 'Furniture',
      slug: 'furniture'
    }
  });

  // Create products
  const products = [
    // Textbooks
    {
      title: 'Introduction to Computer Science - 4th Edition',
      description: 'Great condition textbook for CS101. Barely used, no highlighting.',
      priceMinor: 8500, // $85.00
      currency: 'AED',
      stock: 1,
      categoryId: textbooksCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Calculus: Early Transcendentals',
      description: 'Perfect for Math 101-102. Some highlighting but all pages intact.',
      priceMinor: 12000, 
      currency: 'AED',
      stock: 1,
      categoryId: textbooksCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Biology Lab Manual',
      description: 'Required for Bio 201 lab. Never opened!',
      priceMinor: 3500, 
      currency: 'AED',
      stock: 2,
      categoryId: textbooksCategory.id,
      sellerId: testSeller.id
    },

    // Electronics
    {
      title: 'MacBook Pro 13" (2019)',
      description: 'Excellent condition laptop. Perfect for students. Includes charger.',
      priceMinor: 275000,
      currency: 'AED',
      stock: 1,
      categoryId: electronicsCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'iPad Air with Apple Pencil',
      description: 'Great for note-taking and digital art. Screen protector applied.',
      priceMinor: 185000, 
      currency: 'AED',
      stock: 1,
      categoryId: electronicsCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Scientific Calculator TI-84',
      description: 'Required for most math courses. Works perfectly.',
      priceMinor: 4500, 
      currency: 'AED',
      stock: 3,
      categoryId: electronicsCategory.id,
      sellerId: testSeller.id
    },

    // Clothing
    {
      title: 'NYU Abu Dhabi Hoodie - Medium',
      description: 'Official NYUAD merchandise. Worn a few times, like new.',
      priceMinor: 2800, 
      currency: 'AED',
      stock: 1,
      categoryId: clothingCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Winter Jacket - Large',
      description: 'Perfect for cold library study sessions. Very warm!',
      priceMinor: 3200, 
      currency: 'AED',
      stock: 1,
      categoryId: clothingCategory.id,
      sellerId: testSeller.id
    },

    // Furniture
    {
      title: 'Study Desk with Drawers',
      description: 'Perfect size for dorm room. Easy to assemble. Moving sale!',
      priceMinor: 15000, 
      currency: 'AED',
      stock: 1,
      categoryId: furnitureCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Mini Fridge - Excellent Condition',
      description: 'Great for keeping snacks and drinks. Energy efficient.',
      priceMinor: 25000, 
      currency: 'AED',
      stock: 1,
      categoryId: furnitureCategory.id,
      sellerId: testSeller.id
    },

    // Free items
    {
      title: 'Free Chemistry Notes - Organic Chem',
      description: 'Comprehensive handwritten notes from A+ student. Free to good home!',
      priceMinor: 0, 
      currency: 'AED',
      stock: 5,
      categoryId: textbooksCategory.id,
      sellerId: testSeller.id
    },
    {
      title: 'Free Desk Lamp',
      description: 'Works perfectly, just upgrading. Pick up from campus.',
      priceMinor: 0, 
      currency: 'AED',
      stock: 1,
      categoryId: furnitureCategory.id,
      sellerId: testSeller.id
    }
  ];

  for (const productData of products) {
    const { categoryId, sellerId, ...productFields } = productData;
    const createData = {
      ...productFields,
      category: {
        connect: { id: categoryId }
      }
    };
    
    if (sellerId) {
      createData.seller = {
        connect: { id: sellerId }
      };
    }
    
    await prisma.product.create({
      data: createData
    });
  }

  console.log(' Database seeded successfully!');
  console.log(`Created ${products.length} products across 4 categories`);
}

main()
  .catch((e) => {
    console.error(' Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

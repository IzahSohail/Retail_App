import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import pkg from 'express-openid-connect';
const { auth, requiresAuth } = pkg;
import jwt from 'jsonwebtoken';
import multer from 'multer';
import { prisma } from './db.js';
import { uploadProductImage } from './supabase.js';

const app = express();

//TODO: Mock payment processing function, NOT properly implemented yet.
function simulatePaymentProcessing(paymentMethod, totalMinor) {
  // For demonstration purposes, simulate different scenarios
  const random = Math.random();
  
  // Cash payments have a higher success rate (95%)
  if (paymentMethod === 'CASH') {
    if (random < 0.95) {
      return {
        status: 'APPROVED',
        approvalRef: `cash_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else {
      return {
        status: 'DECLINED',
        failureReason: 'Cash collection arrangement failed'
      };
    }
  }
  
  // Cmaking up a card payment scenario
  if (paymentMethod === 'CARD') {
    if (random < 0.90) {
      return {
        status: 'APPROVED',
        approvalRef: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      };
    } else if (random < 0.95) {
      return {
        status: 'DECLINED',
        failureReason: 'Insufficient funds'
      };
    } else {
      return {
        status: 'DECLINED',
        failureReason: 'Card declined by bank'
      };
    }
  }
  
  // Default fallback
  return {
    status: 'APPROVED',
    approvalRef: `mock_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  };
}

// Basic config
const PORT = process.env.PORT || 3001;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Configure multer for file uploads (memory storage), image files will be on supabase storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Only allow image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Middlewares
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(morgan('dev'));

// Auth0 config (OIDC)
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.APP_SESSION_SECRET,
  baseURL: BASE_URL,
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    scope: 'openid profile email'
  },
  routes: {
    login: '/login',
    callback: '/callback'
  },
  afterCallback: async (req, res, session, state) => {
    try {
      console.log('Full session object:', JSON.stringify(session, null, 2));
      
      // Decode the id_token JWT to get user info
      let user = {};
      if (session.id_token) {
        try {
          // Decode without verification (Auth0 already verified it)
          const decoded = jwt.decode(session.id_token);
          user = decoded || {};
          console.log('Decoded JWT user data:', {
            sub: user.sub,
            email: user.email,
            name: user.name,
            picture: user.picture,
            email_verified: user.email_verified
          });
        } catch (jwtError) {
          console.error('JWT decode error:', jwtError);
        }
      }
      
      const auth0Id = user.sub;
      const email = user.email;
      const name = user.name;
      const picture = user.picture;
      
      if (auth0Id && email) {
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: { auth0Id, name, picture, lastLogin: new Date() },
          create: { email, name, picture, auth0Id, lastLogin: new Date() }
        });
        console.log('Upserted user in DB:', dbUser);
      } else {
        console.warn('Missing auth0Id or email in decoded token; skipping upsert', { auth0Id, email });
      }
    } catch (e) {
      console.error('afterCallback upsert error:', e);
    }
    return session;
  }
};

app.use(auth(authConfig));

// Session info
app.get('/api/profile', requiresAuth(), async (req, res) => {
  try {
    console.log('Profile request - req.oidc.user:', req.oidc.user);
    const auth0User = req.oidc.user;
    
    // Get full user data from database
    const dbUser = await prisma.user.findUnique({ 
      where: { auth0Id: auth0User.sub } 
    });
    
    if (dbUser) {
      // Merge Auth0 data with database data
      const fullUser = {
        ...auth0User,
        ...dbUser,
        name: dbUser.name || auth0User.name,
        email: dbUser.email || auth0User.email,
        picture: dbUser.picture || auth0User.picture
      };
      res.json({ user: fullUser });
    } else {
      res.json({ user: auth0User });
    }
  } catch (error) {
    console.error('Profile error:', error);
    res.json({ user: req.oidc.user });
  }
});

// Update profile
app.put('/api/profile', requiresAuth(), async (req, res) => {
  try {
    const { name, gender, dateOfBirth } = req.body;
    const auth0Id = req.oidc.user.sub;
    const email = req.oidc.user.email;

    // Find or create user
    let user = await prisma.user.findUnique({ where: { auth0Id } });
    
    const updateData = {
      name: name?.trim() || null,
      gender: gender || null,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
      lastLogin: new Date()
    };

    if (user) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: updateData
      });
    } else {
      // Create new user
      user = await prisma.user.create({
        data: {
          auth0Id,
          email,
          picture: req.oidc.user.picture,
          ...updateData
        }
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });

  } catch (err) {
    console.error('PUT /api/profile error:', err);
    res.status(500).json({ 
      error: 'Failed to update profile',
      success: false 
    });
  }
});

// Public route: greet
app.get('/api/greet', (req, res) => {
  const name = req.oidc?.user?.name || 'Guest';
  res.json({ message: `Hi, ${name}` });
});

//create a route to retrieve products from the database, the idea is to retrieve 20 at a time 
// and upon clicking a button like "see more", we retrieve more and show more
app.get('/api/products', async (req, res) => {
  try {
    const {
      limit = '20',
      cursor,          
      categoryId,      
      q                
    } = req.query;

    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    const where = {
      active: true,
      ...(categoryId ? { categoryId: String(categoryId) } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: String(q), mode: 'insensitive' } },
              { description: { contains: String(q), mode: 'insensitive' } }
            ]
          }
        : {})
    };

    // when using cursor, Prisma requires we exclude the cursor item itself (skip: 1)
    const query = {
      where,
      take: take + 1, // fetch one extra to know if there's a next page
      orderBy: [
        { createdAt: 'desc' }, // stable ordering
        { id: 'desc' }
      ],
      select: {
        id: true,
        title: true,
        description: true,
        priceMinor: true,
        currency: true,
        stock: true,
        createdAt: true,
        categoryId: true,
        sellerId: true,
        imageUrl: true
      }
    };

    if (cursor) {
      query.cursor = { id: String(cursor) };
      query.skip = 1;
    }

    const rows = await prisma.product.findMany(query);

    // Determine nextCursor
    let nextCursor = null;
    let items = rows;
    if (rows.length > take) {
      const nextItem = rows[rows.length - 1];
      nextCursor = nextItem.id;
      items = rows.slice(0, take);
    }

    res.json({
      items,
      nextCursor,       // pass this back as ?cursor=... to load more
      hasMore: Boolean(nextCursor)
    });
  } catch (err) {
    console.error('GET /api/products error:', err);
    res.status(500).json({ error: 'Failed to load products' });
  }
});

// --- Categories endpoint ---
// GET /api/categories
app.get('/api/categories', async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' }
    });
    res.json({ categories });
  } catch (err) {
    console.error('GET /api/categories error:', err);
    res.status(500).json({ error: 'Failed to load categories' });
  }
});

// --- Create listing endpoint ---
// POST /api/listings
app.post('/api/listings', requiresAuth(), upload.single('image'), async (req, res) => {
  try {
    const { title, description, priceMinor, currency = 'AED', categoryId, stock = 1, imageUrl } = req.body;
    const sellerAuth0Id = req.oidc.user.sub;
    const sellerEmail = req.oidc.user.email;

    // Validate inputs
    if (!title || !description || priceMinor < 0 || !categoryId || stock < 1) {
      return res.status(400).json({ error: 'Invalid input data' });
    }

    // Find or create the seller user in our database
    let seller = await prisma.user.findUnique({ where: { auth0Id: sellerAuth0Id } });
    if (!seller) {
      seller = await prisma.user.create({
        data: {
          auth0Id: sellerAuth0Id,
          email: sellerEmail,
          name: req.oidc.user.name,
          picture: req.oidc.user.picture,
          lastLogin: new Date()
        }
      });
    }

    // Verify category exists
    const category = await prisma.category.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ error: 'Invalid category selected' });
    }

    // First create the product to get the ID
    const product = await prisma.product.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        priceMinor: Math.round(priceMinor),
        currency,
        stock: parseInt(stock),
        categoryId,
        sellerId: seller.id,
        imageUrl: null, // Will be updated after image upload
        active: true
      },
      include: {
        category: true,
        seller: {
          select: { id: true, name: true, email: true }
        }
      }
    });

    // Handle image upload if file is provided
    let finalImageUrl = null;
    if (req.file) {
      try {
        const uploadResult = await uploadProductImage(
          req.file.buffer,
          req.file.originalname,
          product.id,
          req.file.mimetype
        );

        if (uploadResult.success) {
          finalImageUrl = uploadResult.publicUrl;
          
          // Update the product with the image URL
          await prisma.product.update({
            where: { id: product.id },
            data: { imageUrl: finalImageUrl }
          });
        } else {
          console.error('Image upload failed:', uploadResult.error);
        }
      } catch (imageError) {
        console.error('Image upload error:', imageError);
        // Don't fail the entire request if image upload fails
      }
    }

    // Return the product with the updated image URL
    const finalProduct = {
      ...product,
      imageUrl: finalImageUrl
    };

    res.json({
      success: true,
      message: 'Listing created successfully',
      product: finalProduct
    });

  } catch (err) {
    console.error('POST /api/listings error:', err);
    res.status(500).json({ 
      error: 'Failed to create listing',
      success: false 
    });
  }
});

// --- Get user's listings ---
// GET /api/my-listings
app.get('/api/my-listings', requiresAuth(), async (req, res) => {
  try {
    const sellerAuth0Id = req.oidc.user.sub;
    
    // Find the user
    const seller = await prisma.user.findUnique({ where: { auth0Id: sellerAuth0Id } });
    if (!seller) {
      return res.json({ listings: [] });
    }

    const listings = await prisma.product.findMany({
      where: { 
        sellerId: seller.id,
        active: true 
      },
      include: {
        category: {
          select: { name: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json({ listings });
  } catch (err) {
    console.error('GET /api/my-listings error:', err);
    res.status(500).json({ error: 'Failed to load listings' });
  }
});

// --- Delete user's listing ---
// DELETE /api/listings/:id
app.delete('/api/listings/:id', requiresAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const sellerAuth0Id = req.oidc.user.sub;

    // Find the user
    const seller = await prisma.user.findUnique({ where: { auth0Id: sellerAuth0Id } });
    if (!seller) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Find the product
    const product = await prisma.product.findUnique({
      where: { id },
      include: { saleItems: true }
    });

    if (!product) {
      return res.status(404).json({ error: 'Listing not found' });
    }

    if (product.sellerId !== seller.id) {
      return res.status(403).json({ error: 'You can only delete your own listings' });
    }

    // Check if product has been sold (has sale items)
    if (product.saleItems.length > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete listing that has been purchased. You can mark it as inactive instead.' 
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Listing deleted successfully'
    });

  } catch (err) {
    console.error('DELETE /api/listings/:id error:', err);
    res.status(500).json({ 
      error: 'Failed to delete listing',
      success: false 
    });
  }
});

// --- Purchase endpoint ---
// POST /api/purchase
app.post('/api/purchase', requiresAuth(), async (req, res) => {
  try {
    const { productId, quantity = 1, paymentMethod = 'CARD' } = req.body;
    const buyerAuth0Id = req.oidc.user.sub;
    const buyerEmail = req.oidc.user.email;

    // Validate inputs
    if (!productId || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Find or create the buyer user in our database
    let buyer = await prisma.user.findUnique({ where: { auth0Id: buyerAuth0Id } });
    if (!buyer) {
      buyer = await prisma.user.create({
        data: {
          auth0Id: buyerAuth0Id,
          email: buyerEmail,
          name: req.oidc.user.name,
          picture: req.oidc.user.picture,
          lastLogin: new Date()
        }
      });
    }

    // Start a transaction to ensure atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get the product with current stock
      const product = await tx.product.findUnique({
        where: { id: productId, active: true }
      });

      if (!product) {
        throw new Error('Product not found or inactive');
      }

      // Check if user is trying to buy their own product
      if (product.sellerId === buyer.id) {
        throw new Error('Cannot purchase your own product');
      }

      // Check stock availability
      if (product.stock < quantity) {
        throw new Error(`Insufficient stock. Only ${product.stock} available`);
      }

      // Calculate totals
      const unitMinor = product.priceMinor;
      const lineTotalMinor = unitMinor * quantity;
      const subtotalMinor = lineTotalMinor;
      const taxMinor = Math.round(subtotalMinor * 0.05); // 5% tax
      const feesMinor = Math.round(subtotalMinor * 0.02); // 2% processing fee
      const totalMinor = subtotalMinor + taxMinor + feesMinor;

      // Create the sale record
      const sale = await tx.sale.create({
        data: {
          buyerId: buyer.id,
          status: 'PENDING',
          subtotalMinor,
          taxMinor,
          feesMinor,
          totalMinor,
          currency: product.currency
        }
      });

      // Create sale item (snapshot of product at time of purchase)
      await tx.saleItem.create({
        data: {
          saleId: sale.id,
          productId: product.id,
          quantity,
          unitMinor,
          lineTotalMinor
        }
      });

      // Mock payment processing - simulate approval/rejection
      const mockPaymentResult = simulatePaymentProcessing(paymentMethod, totalMinor);
      
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: paymentMethod,
          status: mockPaymentResult.status,
          approvalRef: mockPaymentResult.status === 'APPROVED' ? mockPaymentResult.approvalRef : null,
          failureReason: mockPaymentResult.status === 'DECLINED' ? mockPaymentResult.failureReason : null
        }
      });

      // If payment failed, throw error to rollback transaction
      if (mockPaymentResult.status === 'DECLINED') {
        throw new Error(`Payment failed: ${mockPaymentResult.failureReason}`);
      }

      // Decrement product stock
      const updatedProduct = await tx.product.update({
        where: { id: productId },
        data: { stock: product.stock - quantity }
      });

      // Mark sale as completed
      const completedSale = await tx.sale.update({
        where: { id: sale.id },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date()
        }
      });

      return {
        sale: completedSale,
        payment,
        product: updatedProduct
      };
    });

    res.json({
      success: true,
      message: 'Purchase completed successfully',
      saleId: result.sale.id,
      newStock: result.product.stock
    });

  } catch (err) {
    console.error('POST /api/purchase error:', err);
    res.status(400).json({ 
      error: err.message || 'Purchase failed',
      success: false 
    });
  }
});

// for the buyer to see their sales history...
// GET /api/my-sales
app.get('/api/my-sales', requiresAuth(), async (req, res) => {
  try {
    const buyerAuth0Id = req.oidc.user.sub;
    
    // Find the user
    const buyer = await prisma.user.findUnique({ where: { auth0Id: buyerAuth0Id } });
    if (!buyer) {
      return res.json({ sales: [] });
    }

    const sales = await prisma.sale.findMany({
      where: { buyerId: buyer.id },
      include: {
        items: {
          include: {
            product: {
              select: { id: true, title: true, description: true }
            }
          }
        },
        payment: true
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    res.json({ sales });
  } catch (err) {
    console.error('GET /api/my-sales error:', err);
    res.status(500).json({ error: 'Failed to load sales' });
  }
});


// Serve frontend (built) if exists, otherwise redirect root to CRA dev server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const frontendDir = path.join(projectRoot, '..', 'frontend', 'build');
const indexHtmlPath = path.join(frontendDir, 'index.html');

if (fs.existsSync(indexHtmlPath)) {
  app.use(express.static(frontendDir));
  app.get('*', (_req, res) => {
    res.sendFile(indexHtmlPath);
  });
} else {
  app.get('/', (_req, res) => {
    res.redirect('http://localhost:3000');
  });
}

app.listen(PORT, () => {
  console.log(`Server listening on ${BASE_URL}`);
});



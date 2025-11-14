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
import session from 'express-session';
import { prisma } from './db.js';
import { uploadProductImage } from './supabase.js';

// for the business panel 
import businessRouter from './routes/business.js';

// Admin routes
import adminDashboardRouter from './routes/admin.dashboard.js';
import adminFlashSalesRouter from './routes/admin.flashsales.js';
import pricingRouter from './routes/pricing.js';
import verificationRouter from './routes/verification.js';
import rmaRouter from './routes/rma.js';

// Payment Service with retry, rollback, and circuit breaker
import paymentService from './services/PaymentService.js';

const app = express();

// Test mode configuration
const TEST_MODE = process.env.TEST_MODE === 'true' || process.env.NODE_ENV === 'test';

if (TEST_MODE) {
  console.log('TEST MODE ENABLED - Authentication bypassed for testing');
}

// Test authentication middleware - allows bypassing Auth0 in test mode
function testAuthMiddleware(req, res, next) {
  // If in test mode, check for test credentials in body (after multer parses it)
  if (TEST_MODE) {
    // For multipart forms, multer will parse body fields
    // We need to check after multer runs, so we'll set up a flag
    const checkTestAuth = () => {
      if (req.body && req.body._testBuyerAuth0Id) {
        req.oidc = {
          isAuthenticated: () => true,
          user: {
            sub: req.body._testBuyerAuth0Id,
            email: req.body._testBuyerEmail,
            name: req.body._testBuyerName,
            picture: req.body._testBuyerPicture
          }
        };
        // Remove test fields from body so they don't interfere
        delete req.body._testBuyerAuth0Id;
        delete req.body._testBuyerEmail;
        delete req.body._testBuyerName;
        delete req.body._testBuyerPicture;
        return true;
      }
      return false;
    };
    
    // Try to set up test auth immediately
    if (checkTestAuth()) {
      return next();
    }
    
    // If not available yet, it means multer hasn't parsed the body
    // Store the check function for later
    req._testAuthCheck = checkTestAuth;
    return next();
  }
  
  // Otherwise, require actual Auth0 authentication
  return requiresAuth()(req, res, next);
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

// Session middleware (required for Auth0 and business registration tracking)
app.use(session({
  secret: process.env.APP_SESSION_SECRET || 'fallback-secret-for-dev',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // Set to true in production with HTTPS
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

// Auth0 config (OIDC)
const authConfig = {
  authRequired: false,
  auth0Logout: true,
  secret: process.env.APP_SESSION_SECRET,
  baseURL: BASE_URL, // This is the backend URL
  issuerBaseURL: process.env.AUTH0_ISSUER_BASE_URL,
  clientID: process.env.AUTH0_CLIENT_ID,
  clientSecret: process.env.AUTH0_CLIENT_SECRET,
  authorizationParams: {
    scope: 'openid profile email',
    redirect_uri: `${BASE_URL}/callback` // Explicit callback to backend
  },
  routes: {
    login: '/login',
    callback: '/callback',
    logout: '/logout',
    postLogoutRedirect: 'http://localhost:3000' // Frontend after logout
  },
  afterCallback: async (req, res, session, state) => {
    try {
      console.log('[afterCallback] ====== START ======');
      console.log('[afterCallback] Auth0 Session:', JSON.stringify(session, null, 2));
      console.log('[afterCallback] Express req.session:', JSON.stringify(req.session, null, 2));
      console.log('[afterCallback] State parameter:', state);
      
      // Check if this is a business registration from session
      const isBusiness = req.session?.registrationType === 'business';
      console.log('[afterCallback] Is business registration (from req.session):', isBusiness);
      
      // Don't clear the registration type yet, let's keep it for debugging
      // if (req.session?.registrationType) {
      //   delete req.session.registrationType;
      // }
      
      // Decode the id_token JWT to get user info
      let user = {};
      if (session.id_token) {
        try {
          const decoded = jwt.decode(session.id_token);
          user = decoded || {};
          console.log(' [afterCallback] Decoded user:', {
            sub: user.sub,
            email: user.email,
            name: user.name
          });
        } catch (jwtError) {
          console.error(' [afterCallback] JWT decode error:', jwtError);
        }
      }
      
      const auth0Id = user.sub;
      const email = user.email;
      const name = user.name;
      const picture = user.picture;
      
      if (auth0Id && email) {
        // Determine role based on admin emails first, then registration type
        const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
        let newRole;
        if (adminEmails.includes(email)) {
          newRole = 'ADMIN';
          console.log(`[afterCallback] Admin email detected: ${email}`);
        } else {
          newRole = isBusiness ? 'BUSINESS' : 'USER';
        }
        console.log(`[afterCallback] Calculated role: ${newRole}`);
        
        // Check if user already exists
        const existingUser = await prisma.user.findUnique({ where: { email } });
        
        // Determine final role (never downgrade from BUSINESS or ADMIN)
        let finalRole = newRole;
        if (existingUser) {
          if (existingUser.role === 'ADMIN') {
            finalRole = 'ADMIN'; // Admin stays admin
          } else if (existingUser.role === 'BUSINESS' && newRole === 'USER') {
            finalRole = 'BUSINESS'; // Don't downgrade business to user
            console.log(`[afterCallback] Preserving BUSINESS role for: ${email}`);
          } else if (newRole === 'ADMIN' || newRole === 'BUSINESS') {
            finalRole = newRole; // Allow upgrade to BUSINESS or ADMIN
          }
        }
        
        console.log(`[afterCallback] Final role: ${finalRole}`);
        
        const dbUser = await prisma.user.upsert({
          where: { email },
          update: { 
            auth0Id, 
            name, 
            picture, 
            lastLogin: new Date(),
            // Only update role if it's an upgrade or admin
            role: finalRole
          },
          create: { 
            email, 
            name, 
            picture, 
            auth0Id, 
            role: finalRole,
            lastLogin: new Date() 
          }
        });
        
        console.log(' [afterCallback] Upserted user:', dbUser.email, 'Role:', dbUser.role);
        
        // If business user, create B2B record
        if (isBusiness && dbUser.role === 'BUSINESS') {
          const existingB2B = await prisma.b2B.findUnique({
            where: { userId: dbUser.id }
          });
          
          if (!existingB2B) {
            await prisma.b2B.create({
              data: {
                userId: dbUser.id,
                status: 'PENDING'
              }
            });
            console.log(' [afterCallback] Created B2B record');
          }
        }
      } else {
        console.warn('[afterCallback] Missing auth0Id or email', { auth0Id, email });
      }
      
      // Store redirect URL in session
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
      if (isBusiness) {
        session.redirectTo = `${frontendUrl}/business/dashboard`;
        req.session.redirectTo = `${frontendUrl}/business/dashboard`;
        console.log(' [afterCallback] Set redirectTo in Auth0 session:', session.redirectTo);
        console.log(' [afterCallback] Set redirectTo in req.session:', req.session.redirectTo);
      } else {
        // Default redirect to frontend for all users
        session.redirectTo = frontendUrl;
        req.session.redirectTo = frontendUrl;
        console.log(' [afterCallback] Set default redirectTo to frontend:', frontendUrl);
      }
      
      console.log(' [afterCallback] Final req.session before return:', JSON.stringify(req.session, null, 2));
      console.log(' [afterCallback] ====== END ======');
      
    } catch (e) {
      console.error(' [afterCallback] Error:', e);
    }
    return session;
  }
};

// Only enable Auth0 in non-test mode
if (process.env.NODE_ENV !== 'test') {
  // Custom login handler to capture type parameter and encode it in Auth0 state
  app.get('/login', (req, res, next) => {
    const type = req.query.type;
    const screenHint = req.query.screen_hint;
    console.log('[/login] Type parameter:', type);
    console.log('[/login] Screen hint:', screenHint);
    
    if (type === 'business') {
      // Store in session that this is a business registration
      req.session = req.session || {};
      req.session.registrationType = 'business';
      console.log('[/login] Stored business registration type in session');
    }
    
    // Let Auth0 middleware handle the login
    next();
  });
  
  // Only use Auth0 if not in test mode
  if (!TEST_MODE) {
    app.use(auth(authConfig));
  } else {
    console.log('Skipping Auth0 middleware in test mode');
  }
  
  // Custom route to handle post-login redirects
  app.get('/', (req, res, next) => {
    console.log('[post-login redirect] Checking redirect conditions:');
    console.log('  - req.oidc:', !!req.oidc);
    console.log('  - req.oidc.user:', !!req.oidc?.user);
    console.log('  - req.session:', !!req.session);
    console.log('  - req.session.redirectTo:', req.session?.redirectTo);
    
    // Check if user is authenticated and has a redirect URL in session
    if (req.oidc && req.oidc.user && req.session && req.session.redirectTo) {
      const redirectTo = req.session.redirectTo;
      delete req.session.redirectTo; // Clear the redirect URL
      console.log(` [post-login redirect] Redirecting to: ${redirectTo}`);
      return res.redirect(redirectTo);
    }
    next();
  });
}

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
  // console.log(prisma);
  try {
    const {
      limit = '20',
      categoryId,      
      q                
    } = req.query;

    const take = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 50);

    // Build where clause
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

    // Get active flash sales
    const now = new Date();
    const activeFlashSales = await prisma.flashSale.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      include: {
        items: {
          select: {
            productId: true
          }
        }
      }
    });

    // Create a map of productId -> flashSale for quick lookup
    const flashSaleMap = new Map();
    activeFlashSales.forEach(sale => {
      sale.items.forEach(item => {
        flashSaleMap.set(item.productId, {
          id: sale.id,
          title: sale.title,
          discountType: sale.discountType,
          discountValue: sale.discountValue,
          endsAt: sale.endsAt
        });
      });
    });

    // Fetch products with seller info to determine if it's a business product
    const products = await prisma.product.findMany({
      where,
      take,
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' }
      ],
      include: {
        seller: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
            b2b: {
              select: {
                businessName: true,
                status: true
              }
            }
          }
        }
      }
    });

    // Transform products to include business info and flash sale data
    const items = products.map(p => {
      const flashSale = flashSaleMap.get(p.id);
      let discountedPrice = p.priceMinor;
      
      if (flashSale) {
        // Calculate discounted price
        if (flashSale.discountType === 'PERCENTAGE') {
          discountedPrice = Math.round(p.priceMinor * (1 - flashSale.discountValue / 100));
        } else if (flashSale.discountType === 'FIXED') {
          discountedPrice = Math.max(0, p.priceMinor - flashSale.discountValue);
        }
      }

      return {
        id: p.id,
        title: p.title,
        description: p.description,
        priceMinor: p.priceMinor,
        currency: p.currency,
        stock: p.stock,
        createdAt: p.createdAt,
        categoryId: p.categoryId,
        sellerId: p.sellerId,
        imageUrl: p.imageUrl,
        isB2B: p.seller.role === 'BUSINESS' && p.seller.b2b?.status === 'VERIFIED',
        businessName: p.seller.b2b?.businessName || null,
        // Flash sale info
        flashSale: flashSale ? {
          id: flashSale.id,
          title: flashSale.title,
          discountType: flashSale.discountType,
          discountValue: flashSale.discountValue,
          discountedPriceMinor: discountedPrice,
          endsAt: flashSale.endsAt,
          savings: p.priceMinor - discountedPrice,
          savingsPercent: Math.round(((p.priceMinor - discountedPrice) / p.priceMinor) * 100)
        } : null
      };
    });

    res.json({
      items,
      nextCursor: null,
      hasMore: false
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
app.post('/api/listings', testAuthMiddleware, upload.single('image'), async (req, res) => {
  try {
    // In test mode, check for test auth after multer has parsed the body
    if (TEST_MODE && req._testAuthCheck) {
      req._testAuthCheck();
    }
    
    // Verify authentication
    if (!req.oidc || !req.oidc.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    
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
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      code: err.code
    });
    res.status(500).json({ 
      error: 'Failed to create listing',
      details: TEST_MODE ? err.message : undefined,
      success: false 
    });
  }
});

// --- Delete a product (Admin only) ---
// DELETE /api/products/:id
app.delete('/api/products/:id', requiresAuth(), async (req, res) => {
  try {
    const { id } = req.params;
    const userEmail = req.oidc.user.email;
    
    // Check if user is admin
    const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
    if (!adminEmails.includes(userEmail)) {
      return res.status(403).json({ 
        error: 'Admin access required',
        success: false 
      });
    }

    // Delete the product
    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Product deleted successfully'
    });

  } catch (err) {
    console.error('DELETE /api/products/:id error:', err);
    res.status(500).json({ 
      error: 'Failed to delete product',
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
app.post('/api/purchase', testAuthMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1, paymentMethod = 'CARD' } = req.body;
    const buyerAuth0Id = req.oidc.user.sub;
    const buyerEmail = req.oidc.user.email;
    const idempotencyKey = req.headers['idempotency-key'];

    // Validate inputs
    if (!productId || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Check for existing sale with same idempotency key
    if (idempotencyKey) {
      const existingSale = await prisma.sale.findUnique({
        where: { idempotencyKey },
        include: { payment: true }
      });
      
      if (existingSale) {
        return res.json({
          success: true,
          message: 'Purchase already processed',
          saleId: existingSale.id,
          status: existingSale.status,
          payment: existingSale.payment
        });
      }
    }

    // Upsert buyer to avoid race conditions on first login
    const buyer = await prisma.user.upsert({
      where: { auth0Id: buyerAuth0Id },
      update: { lastLogin: new Date() },
      create: {
        auth0Id: buyerAuth0Id,
        email: buyerEmail,
        name: req.oidc.user.name,
        picture: req.oidc.user.picture,
        lastLogin: new Date()
      }
    });

    // Phase 1: Fast atomic stock reservation transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Atomic stock reservation with all validations in WHERE clause
      const stockUpdate = await tx.product.updateMany({
        where: { 
          id: productId,
          active: true,
          sellerId: { not: buyer.id }, // Not buyer's own product
          stock: { gte: quantity }     // Sufficient stock
        },
        data: { 
          stock: { decrement: quantity } 
        }
      });

      // Check if reservation succeeded
      if (stockUpdate.count === 0) {
        // Get product details for better error message
        const product = await tx.product.findUnique({
          where: { id: productId }
        });
        
        if (!product) {
          throw new Error('Product not found');
        }
        if (!product.active) {
          throw new Error('Product is no longer available');
        }
        if (product.sellerId === buyer.id) {
          throw new Error('Cannot purchase your own product');
        }
        if (product.stock < quantity) {
          throw new Error(`Insufficient stock. Only ${product.stock} available`);
        }
        throw new Error('Stock reservation failed');
      }

      // Get product details for pricing
      const product = await tx.product.findUnique({
        where: { id: productId }
      });

      // Calculate totals
      const unitMinor = product.priceMinor;
      const lineTotalMinor = unitMinor * quantity;
      const subtotalMinor = lineTotalMinor;
      const taxMinor = Math.round(subtotalMinor * 0.05); // 5% tax
      const feesMinor = Math.round(subtotalMinor * 0.02); // 2% processing fee
      const totalMinor = subtotalMinor + taxMinor + feesMinor;

      // Create PENDING sale with reserved stock
      const newSale = await tx.sale.create({
        data: {
          buyerId: buyer.id,
          status: 'PENDING',
          subtotalMinor,
          taxMinor,
          feesMinor,
          totalMinor,
          currency: product.currency,
          idempotencyKey
        }
      });

      // Create sale item (snapshot of product at time of purchase)
      await tx.saleItem.create({
        data: {
          saleId: newSale.id,
          productId: product.id,
          quantity,
          unitMinor,
          lineTotalMinor
        }
      });

      return { ...newSale, product };
    });

    // Phase 2: Payment processing with retry and circuit breaker
    let paymentResult;
    try {
      paymentResult = await paymentService.processPayment({
        amount: sale.totalMinor,
        currency: 'AED',
        paymentMethod: paymentMethod,
        idempotencyKey: sale.id // Use sale ID for idempotency
      });
    } catch (error) {
      console.error(' Payment processing error:', error);
      
      // Rollback: Cancel sale and return stock
      await prisma.$transaction(async (tx) => {
        await tx.sale.update({
          where: { id: sale.id },
          data: { status: 'CANCELED' }
        });

        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } }
        });
      });

      return res.status(500).json({
        success: false,
        error: error.code === 'CIRCUIT_OPEN' 
          ? 'Payment service temporarily unavailable. Please try again later.'
          : 'Payment processing failed. Please try again.'
      });
    }
    
    // Phase 3: Finalize sale based on payment result
    const finalResult = await prisma.$transaction(async (tx) => {
      // Create payment record
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: paymentMethod,
          status: paymentResult.status,
          approvalRef: paymentResult.success ? paymentResult.transactionId : null,
          failureReason: !paymentResult.success ? paymentResult.message : null
        }
      });

      if (paymentResult.success && paymentResult.status === 'APPROVED') {
        // Payment successful - mark sale as completed
        const completedSale = await tx.sale.update({
          where: { id: sale.id, status: 'PENDING' }, // Guarded state change
          data: { 
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });
        
        return { sale: completedSale, payment, success: true };
      } else {
        // Payment failed - cancel sale and return stock
        const canceledSale = await tx.sale.update({
          where: { id: sale.id, status: 'PENDING' }, // Guarded state change
          data: { status: 'CANCELED' }
        });

        // Return reserved stock
        await tx.product.update({
          where: { id: productId },
          data: { stock: { increment: quantity } }
        });

        return { sale: canceledSale, payment, success: false };
      }
    });

    if (finalResult.success) {
      // Get updated product stock for response
      const updatedProduct = await prisma.product.findUnique({
        where: { id: productId }
      });

      res.json({
        success: true,
        message: 'Purchase completed successfully',
        saleId: finalResult.sale.id,
        newStock: updatedProduct.stock
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Payment failed: ${finalResult.payment.failureReason}`,
        saleId: finalResult.sale.id
      });
    }

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

// --- Purchase History endpoint ---
// GET /api/purchases - Get user's completed purchases
app.get('/api/purchases', requiresAuth(), async (req, res) => {
  try {
    const userAuth0Id = req.oidc.user.sub;
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const purchases = await prisma.sale.findMany({
      where: {
        buyerId: user.id,
        status: 'COMPLETED'
      },
      include: {
        items: {
          include: {
            product: true
          }
        },
        payment: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({ success: true, purchases });
  } catch (err) {
    console.error('GET /api/purchases error:', err);
    res.status(500).json({ error: 'Failed to load purchases' });
  }
});

// --- Cart API endpoints ---

// GET /api/cart - Get user's cart
app.get('/api/cart', requiresAuth(), async (req, res) => {
  try {
    const userAuth0Id = req.oidc.user.sub;
    
    // Find the user
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.json({ cart: null, items: [] });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                category: true,
                seller: {
                  select: { 
                    id: true, 
                    name: true, 
                    email: true,
                    role: true,
                    b2b: {
                      select: {
                        businessName: true
                      }
                    }
                  }
                }
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { userId: user.id },
        include: {
          items: {
            include: {
              product: {
                include: {
                  category: true,
                  seller: {
                    select: { 
                      id: true, 
                      name: true, 
                      email: true,
                      role: true,
                      b2b: {
                        select: {
                          businessName: true
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
    }

    res.json({ cart, items: cart.items });
  } catch (err) {
    console.error('GET /api/cart error:', err);
    res.status(500).json({ error: 'Failed to load cart' });
  }
});

// POST /api/cart/add - Add item to cart . can use for integration test
app.post('/api/cart/add', testAuthMiddleware, async (req, res) => {
  try {
    const { productId, quantity = 1 } = req.body;
    const userAuth0Id = req.oidc.user.sub;

    if (!productId || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Find the user
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({ 
      where: { id: productId }
    });

    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Product checks
    if (!product.active) {
      return res.status(404).json({ error: 'Product not found or unavailable' });
    }

    // Check if user is trying to add their own product
    if (product.sellerId === user.id) {
      return res.status(400).json({ error: 'Cannot add your own product to cart' });
    }

    // Check stock availability
    if (product.stock < quantity) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Get or create cart
    let cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      cart = await prisma.cart.create({ data: { userId: user.id } });
    }

    // Check if item already exists in cart
    const existingCartItem = await prisma.cartItem.findUnique({
      where: { 
        cartId_productId: { 
          cartId: cart.id, 
          productId: productId 
        } 
      }
    });

    let cartItem;
    if (existingCartItem) {
      // Update quantity
      const newQuantity = existingCartItem.quantity + quantity;
      
      if (newQuantity > product.stock) {
        return res.status(400).json({ error: 'Cannot add more items than available in stock' });
      }
      
      cartItem = await prisma.cartItem.update({
        where: { id: existingCartItem.id },
        data: { quantity: newQuantity },
        include: { product: true }
      });
    } else {
      // Create new cart item
      cartItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: productId,
          quantity
        },
        include: { product: true }
      });
    }

    res.json({
      success: true,
      message: 'Item added to cart',
      cartItem
    });
  } catch (err) {
    console.error('POST /api/cart/add error:', err);
    res.status(500).json({ error: 'Failed to add item to cart' });
  }
});

// PUT /api/cart/update - Update cart item quantity
app.put('/api/cart/update', requiresAuth(), async (req, res) => {
  try {
    const { productId, quantity } = req.body;
    const userAuth0Id = req.oidc.user.sub;

    if (!productId || quantity < 1) {
      return res.status(400).json({ error: 'Invalid product ID or quantity' });
    }

    // Find the user and cart
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Check product stock
    const product = await prisma.product.findUnique({ where: { id: productId } });
    if (!product || quantity > product.stock) {
      return res.status(400).json({ error: 'Insufficient stock' });
    }

    // Update cart item
    const cartItem = await prisma.cartItem.update({
      where: { cartId_productId: { cartId: cart.id, productId } },
      data: { quantity },
      include: { product: true }
    });

    res.json({
      success: true,
      message: 'Cart item updated',
      cartItem
    });
  } catch (err) {
    console.error('PUT /api/cart/update error:', err);
    res.status(500).json({ error: 'Failed to update cart item' });
  }
});

// DELETE /api/cart/remove - Remove item from cart
app.delete('/api/cart/remove', requiresAuth(), async (req, res) => {
  try {
    const { productId } = req.body;
    const userAuth0Id = req.oidc.user.sub;

    if (!productId) {
      return res.status(400).json({ error: 'Product ID required' });
    }

    // Find the user and cart
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      return res.status(404).json({ error: 'Cart not found' });
    }

    // Remove cart item
    await prisma.cartItem.delete({
      where: { cartId_productId: { cartId: cart.id, productId } }
    });

    res.json({
      success: true,
      message: 'Item removed from cart'
    });
  } catch (err) {
    console.error('DELETE /api/cart/remove error:', err);
    res.status(500).json({ error: 'Failed to remove item from cart' });
  }
});

// POST /api/cart/checkout - Checkout cart items
app.post('/api/cart/checkout', testAuthMiddleware, async (req, res) => {
  try {
    const { paymentMethod = 'CARD', storeCreditAmount = 0 } = req.body;
    const buyerAuth0Id = req.oidc.user.sub;
    const buyerEmail = req.oidc.user.email;
    const idempotencyKey = req.headers['idempotency-key'];
    
    const storeCreditMinor = parseInt(storeCreditAmount) || 0;

    // Check for existing sale with same idempotency key
    if (idempotencyKey) {
      const existingSale = await prisma.sale.findUnique({
        where: { idempotencyKey },
        include: { payment: true }
      });
      
      if (existingSale) {
        return res.json({
          success: true,
          message: 'Cart checkout already processed',
          sale: existingSale,
          payment: existingSale.payment
        });
      }
    }

    // Upsert user to avoid race conditions
    const user = await prisma.user.upsert({
      where: { auth0Id: buyerAuth0Id },
      update: { lastLogin: new Date() },
      create: {
        auth0Id: buyerAuth0Id,
        email: buyerEmail,
        name: req.oidc.user.name,
        picture: req.oidc.user.picture,
        lastLogin: new Date()
      }
    });

    // Validate store credits if being used
    if (storeCreditMinor > 0) {
      if (storeCreditMinor > (user.creditMinor || 0)) {
        return res.status(400).json({
          success: false,
          error: 'Insufficient store credits'
        });
      }
      if (storeCreditMinor < 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid store credit amount'
        });
      }
    }

    // Get cart with items
    const cart = await prisma.cart.findUnique({
      where: { userId: user.id },
      include: {
        items: {
          include: {
            product: true
          }
        }
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Get active flash sales to apply discounts
    const now = new Date();
    const activeFlashSales = await prisma.flashSale.findMany({
      where: {
        startsAt: { lte: now },
        endsAt: { gte: now }
      },
      include: {
        items: {
          select: {
            productId: true
          }
        }
      }
    });

    // Create flash sale map
    const flashSaleMap = new Map();
    activeFlashSales.forEach(sale => {
      sale.items.forEach(item => {
        flashSaleMap.set(item.productId, {
          discountType: sale.discountType,
          discountValue: sale.discountValue
        });
      });
    });

    // Pre-validate items (basic checks only - stock will be validated atomically)
    let subtotalMinor = 0;
    const validatedItems = [];

    for (const cartItem of cart.items) {
      const product = cartItem.product;
      
      if (!product) {
        return res.status(400).json({ error: 'Invalid cart item detected' });
      }

      // Check if product is still available
      if (!product.active) {
        return res.status(400).json({ error: `Product "${product.title}" is no longer available` });
      }

      // Check if user is trying to buy their own product
      if (product.sellerId === user.id) {
        return res.status(400).json({ error: `Cannot purchase your own product: "${product.title}"` });
      }

      // Calculate price with flash sale discount if applicable
      let effectivePrice = product.priceMinor;
      const flashSale = flashSaleMap.get(product.id);
      
      if (flashSale) {
        if (flashSale.discountType === 'PERCENTAGE') {
          effectivePrice = Math.round(product.priceMinor * (1 - flashSale.discountValue / 100));
        } else if (flashSale.discountType === 'FIXED') {
          effectivePrice = Math.max(0, product.priceMinor - flashSale.discountValue);
        }
      }

      const lineTotal = effectivePrice * cartItem.quantity;
      subtotalMinor += lineTotal;

      validatedItems.push({
        cartItem,
        product,
        lineTotal,
        effectivePrice
      });
    }

    const taxMinor = 0; // No tax for now
    const feesMinor = 0; // No fees for now
    const totalMinor = subtotalMinor + taxMinor + feesMinor;

    // Phase 1: Fast atomic stock reservation transaction
    const sale = await prisma.$transaction(async (tx) => {
      // Reserve stock for all items atomically
      const stockReservations = [];
      
      for (const { cartItem, product } of validatedItems) {
        // Update product stock
        const stockUpdate = await tx.product.updateMany({
          where: { 
            id: product.id,
            active: true,
            sellerId: { not: user.id }, // Not user's own product
            stock: { gte: cartItem.quantity } // Sufficient stock
          },
          data: { 
            stock: { decrement: cartItem.quantity } 
          }
        });

        if (stockUpdate.count === 0) {
          // Get current product state for better error message
          const currentProduct = await tx.product.findUnique({ 
            where: { id: product.id } 
          });
          
          if (!currentProduct) {
            throw new Error(`Product "${product.title}" is no longer available`);
          }
          if (!currentProduct.active) {
            throw new Error(`Product "${product.title}" is no longer available`);
          }
          if (currentProduct.stock < cartItem.quantity) {
            throw new Error(`Insufficient stock for "${product.title}". Available: ${currentProduct.stock}, Requested: ${cartItem.quantity}`);
          }
          throw new Error(`Stock reservation failed for "${product.title}"`);
        }
        
        stockReservations.push({ productId: product.id, quantity: cartItem.quantity });
      }

      // Create PENDING sale with reserved stock
      const newSale = await tx.sale.create({
        data: {
          buyerId: user.id,
          status: 'PENDING',
          subtotalMinor,
          taxMinor,
          feesMinor,
          totalMinor,
          currency: 'AED',
          idempotencyKey
        }
      });

      // Create sale items
      for (const { cartItem, product, lineTotal } of validatedItems) {
        await tx.saleItem.create({
          data: {
            saleId: newSale.id,
            productId: product.id,
            quantity: cartItem.quantity,
            unitMinor: product.priceMinor,
            lineTotalMinor: lineTotal
          }
        });
      }

      return { ...newSale, stockReservations };
    });

    // Phase 2: Payment processing with retry and circuit breaker
    // Calculate amount after store credits
    const amountAfterCredits = Math.max(0, sale.totalMinor - storeCreditMinor);
    let paymentResult = null;
    
    // Only process payment if there's remaining amount after credits
    if (amountAfterCredits > 0) {
      try {
        paymentResult = await paymentService.processPayment({
          amount: amountAfterCredits,
          currency: 'AED',
          paymentMethod: paymentMethod,
          idempotencyKey: sale.id // Use sale ID for idempotency
        });
      } catch (error) {
        console.error(' Cart checkout payment error:', error);
        
        // Rollback: Cancel sale and return all reserved stock
        await prisma.$transaction(async (tx) => {
          await tx.sale.update({
            where: { id: sale.id },
            data: { status: 'CANCELED' }
          });

          // Return all reserved stock
          for (const reservation of sale.stockReservations) {
            await tx.product.update({
              where: { id: reservation.productId },
              data: { stock: { increment: reservation.quantity } }
            });
          }
        });

        return res.status(500).json({
          success: false,
          error: error.code === 'CIRCUIT_OPEN' 
            ? 'Payment service temporarily unavailable. Please try again later.'
            : 'Payment processing failed. Please try again.'
        });
      }
    } else {
      // Fully paid with store credits - create success result
      paymentResult = {
        success: true,
        status: 'APPROVED',
        transactionId: `STORE_CREDIT_${sale.id}`,
        message: 'Paid with store credits'
      };
    }
    
    // Phase 3: Finalize sale based on payment result
    const finalResult = await prisma.$transaction(async (tx) => {
      // Deduct store credits if used
      if (storeCreditMinor > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: { creditMinor: { decrement: storeCreditMinor } }
        });
      }

      // Create payment record
      const paymentMethodToRecord = amountAfterCredits === 0 ? 'STORE_CREDIT' : paymentMethod;
      const payment = await tx.payment.create({
        data: {
          saleId: sale.id,
          method: paymentMethodToRecord,
          status: paymentResult.status,
          approvalRef: paymentResult.success ? paymentResult.transactionId : null,
          failureReason: !paymentResult.success ? paymentResult.message : null
        }
      });

      if (paymentResult.success && paymentResult.status === 'APPROVED') {
        // Payment successful - mark sale as completed and clear cart
        const completedSale = await tx.sale.update({
          where: { id: sale.id, status: 'PENDING' }, // Guarded state change
          data: { 
            status: 'COMPLETED',
            completedAt: new Date()
          }
        });

        // Clear the cart after successful purchase
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id }
        });
        
        return { sale: completedSale, payment, success: true };
      } else {
        // Payment failed - cancel sale and return all reserved stock and credits
        const canceledSale = await tx.sale.update({
          where: { id: sale.id, status: 'PENDING' }, // Guarded state change
          data: { status: 'CANCELED' }
        });

        // Return store credits if payment failed
        if (storeCreditMinor > 0) {
          await tx.user.update({
            where: { id: user.id },
            data: { creditMinor: { increment: storeCreditMinor } }
          });
        }

        // Return all reserved stock
        for (const { productId, quantity } of sale.stockReservations) {
          await tx.product.update({
            where: { id: productId },
            data: { stock: { increment: quantity } }
          });
        }

        return { sale: canceledSale, payment, success: false };
      }
    });

    if (finalResult.success) {
      res.json({
        success: true,
        message: 'Purchase completed successfully!',
        sale: finalResult.sale,
        payment: finalResult.payment
      });
    } else {
      res.status(400).json({
        success: false,
        error: `Payment failed: ${finalResult.payment.failureReason}`,
        sale: finalResult.sale
      });
    }

  } catch (err) {
    console.error('POST /api/cart/checkout error:', err);
    res.status(400).json({ 
      error: err.message || 'Checkout failed',
      success: false 
    });
  }
});

// DELETE /api/cart/clear - Clear entire cart
app.delete('/api/cart/clear', requiresAuth(), async (req, res) => {
  try {
    const userAuth0Id = req.oidc.user.sub;

    // Find the user and cart
    const user = await prisma.user.findUnique({ where: { auth0Id: userAuth0Id } });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const cart = await prisma.cart.findUnique({ where: { userId: user.id } });
    if (!cart) {
      return res.json({ success: true, message: 'Cart already empty' });
    }

    // Clear all cart items
    await prisma.cartItem.deleteMany({
      where: { cartId: cart.id }
    });

    res.json({
      success: true,
      message: 'Cart cleared'
    });
  } catch (err) {
    console.error('DELETE /api/cart/clear error:', err);
    res.status(500).json({ error: 'Failed to clear cart' });
  }
});

app.use('/api/business', businessRouter);
app.use('/api/admin', adminDashboardRouter);
app.use('/api/admin/flash-sales', adminFlashSalesRouter);
app.use('/api/pricing', pricingRouter);
app.use('/api/verification', verificationRouter);
app.use('/api/rma', rmaRouter);


// Serve frontend (built) if exists, otherwise redirect root to CRA dev server
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');

// Check multiple possible frontend build locations
const possibleFrontendDirs = [
  path.join(projectRoot, '..', 'frontend', 'build'), // Local development
  '/app/frontend_build', // Docker volume mount
  path.join(projectRoot, 'frontend_build') // Alternative Docker path
];

let frontendDir = null;
let indexHtmlPath = null;

for (const dir of possibleFrontendDirs) {
  const testPath = path.join(dir, 'index.html');
  if (fs.existsSync(testPath)) {
    frontendDir = dir;
    indexHtmlPath = testPath;
    console.log('✅ Serving frontend from:', frontendDir);
    break;
  }
}

if (frontendDir && indexHtmlPath) {
  app.use(express.static(frontendDir));
  app.get('*', (_req, res) => {
    res.sendFile(indexHtmlPath);
  });
} else {
  console.log('⚠️  Frontend build not found. Checked locations:');
  possibleFrontendDirs.forEach(dir => console.log('  -', dir));
  app.get('/', (_req, res) => {
    res.json({ 
      message: 'Retail App Backend API',
      note: 'Frontend not built yet. Run: npm run build in frontend directory',
      endpoints: {
        products: '/api/products',
        cart: '/api/cart', 
        profile: '/api/profile',
        admin: '/api/admin',
        rma: '/api/rma'
      }
    });
  });
}

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`Server listening on ${BASE_URL}`);
  });
}

// Export for testing
export { app };



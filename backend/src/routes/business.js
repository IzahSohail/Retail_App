import express from 'express';
import pkg from 'express-openid-connect';
const { requiresAuth } = pkg;
import { prisma } from '../db.js';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';
import { runETL } from '../services/catalogETL.js';

const router = express.Router();

// Supabase client for file uploads
const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Multer config for file uploads (in-memory)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow PDFs for verification docs and CSV/JSON for catalog
    if (file.mimetype === 'application/pdf' || 
        file.mimetype === 'text/csv' || 
        file.mimetype === 'application/json') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, CSV, and JSON files are allowed'), false);
    }
  }
});

// GET /api/business/profile - Get business user profile
router.get('/profile', requiresAuth(), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;
    
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: { b2b: true }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      user: {
        ...req.oidc.user,
        role: user.role,
        b2b: user.b2b
      }
    });
  } catch (err) {
    console.error('Error fetching business profile:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// POST /api/business/verify - Submit business verification documents
router.post('/verify', requiresAuth(), upload.fields([
  { name: 'tradeLicense', maxCount: 1 },
  { name: 'establishmentCard', maxCount: 1 }
]), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;
    const { businessName, businessDescription, registeredAddress } = req.body;
    
    // Get user and B2B record
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: { b2b: true }
    });
    
    if (!user || !user.b2b) {
      return res.status(404).json({ error: 'Business record not found' });
    }
    
    const b2bId = user.b2b.id;
    let tradeLicenseUrl = user.b2b.tradeLicenseUrl;
    let establishmentCardUrl = user.b2b.establishmentCardUrl;
    
    // Upload files to Supabase if provided
    if (req.files) {
      // Ensure bucket exists
      const bucketName = 'verification-documents';
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets.some(b => b.name === bucketName);
      
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, {
          public: false
        });
      }
      
      // Upload trade license
      if (req.files.tradeLicense) {
        const file = req.files.tradeLicense[0];
        const filePath = `${b2bId}/documents/trade-license.pdf`;
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file.buffer, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        tradeLicenseUrl = urlData.publicUrl;
      }
      
      // Upload establishment card
      if (req.files.establishmentCard) {
        const file = req.files.establishmentCard[0];
        const filePath = `${b2bId}/documents/establishment-card.pdf`;
        
        const { data, error } = await supabase.storage
          .from(bucketName)
          .upload(filePath, file.buffer, {
            contentType: 'application/pdf',
            upsert: true
          });
          
        if (error) throw error;
        
        const { data: urlData } = supabase.storage
          .from(bucketName)
          .getPublicUrl(filePath);
        
        establishmentCardUrl = urlData.publicUrl;
      }
    }
    
    // Update B2B record
    const updatedB2B = await prisma.b2B.update({
      where: { id: b2bId },
      data: {
        businessName,
        businessDescription,
        registeredAddress,
        tradeLicenseUrl,
        establishmentCardUrl,
        status: 'UNDER_REVIEW' // Change status when docs are uploaded
      }
    });
    
    res.json({
      success: true,
      message: 'Verification documents submitted successfully',
      b2b: updatedB2B
    });
  } catch (err) {
    console.error('Error submitting verification:', err);
    res.status(500).json({ error: 'Failed to submit verification documents' });
  }
});

// POST /api/business/catalog - Upload product catalog (CSV/JSON) with ETL
router.post('/catalog', requiresAuth(), upload.single('catalog'), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;
    
    // Get user and B2B record
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: { b2b: true }
    });
    
    if (!user || !user.b2b) {
      return res.status(404).json({ error: 'Business record not found' });
    }
    
    if (user.b2b.status !== 'VERIFIED') {
      return res.status(403).json({ error: 'Business must be verified before uploading catalog' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const b2bId = user.b2b.id;
    
    // ============================================================================
    // RUN ETL PIPELINE (Extract, Transform, Load)
    // ============================================================================
    
    console.log(`📦 [ETL] Starting catalog upload for business: ${user.b2b.businessName || user.email}`);
    console.log(`📦 [ETL] File type: ${req.file.mimetype}, Size: ${req.file.size} bytes`);
    
    // Get all categories from database
    const dbCategories = await prisma.category.findMany();
    
    // Run ETL pipeline
    const etlResult = await runETL(req.file.buffer, req.file.mimetype, dbCategories);
    
    if (!etlResult.success) {
      console.error(`❌ [ETL] Pipeline failed: ${etlResult.error}`);
      return res.status(400).json({ 
        error: etlResult.error,
        extracted: etlResult.results.extracted,
        validated: etlResult.results.validated,
        failed: etlResult.results.failed
      });
    }
    
    const { validProducts, failedProducts } = etlResult.results;
    
    console.log(`✅ [ETL] Extracted: ${etlResult.results.extracted} products`);
    console.log(`✅ [ETL] Validated: ${etlResult.results.validated} products`);
    console.log(`❌ [ETL] Failed: ${etlResult.results.failed} products`);
    
    // ============================================================================
    // LOAD PHASE: Insert valid products into database
    // ============================================================================
    
    const addedProducts = [];
    const loadFailedProducts = [];
    
    for (const productData of validProducts) {
      try {
        const newProduct = await prisma.product.create({
          data: {
            sellerId: user.id, // Business user's ID as seller
            active: true,
            ...productData
          }
        });
        
        addedProducts.push(newProduct);
      } catch (err) {
        console.error(`❌ [ETL LOAD] Failed to insert product:`, err);
        loadFailedProducts.push({
          product: productData.title,
          row: 'N/A',
          errors: [`Database error: ${err.message}`]
        });
      }
    }
    
    console.log(`💾 [ETL LOAD] Successfully loaded ${addedProducts.length} products to database`);
    
    // Combine failed products from validation and load phases
    const allFailedProducts = [...failedProducts, ...loadFailedProducts];
    
    res.json({
      success: true,
      message: `Successfully added ${addedProducts.length} of ${etlResult.results.extracted} products`,
      summary: {
        total: etlResult.results.extracted,
        validated: etlResult.results.validated,
        loaded: addedProducts.length,
        failed: allFailedProducts.length
      },
      failedProducts: allFailedProducts.length > 0 ? allFailedProducts : undefined
    });
    
  } catch (err) {
    console.error('❌ [ETL] Unexpected error:', err);
    res.status(500).json({ error: 'Failed to upload catalog: ' + err.message });
  }
});

// GET /api/business/products - Get all products for this business
router.get('/products', requiresAuth(), async (req, res) => {
  try {
    const auth0Id = req.oidc.user.sub;
    
    const user = await prisma.user.findUnique({
      where: { auth0Id },
      include: { b2b: true }
    });
    
    if (!user || !user.b2b) {
      return res.status(404).json({ error: 'Business record not found' });
    }
    
    const products = await prisma.product.findMany({
      where: { sellerId: user.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ products });
  } catch (err) {
    console.error('Error fetching business products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;


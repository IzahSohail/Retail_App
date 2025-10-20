import express from 'express';
import pkg from 'express-openid-connect';
const { requiresAuth } = pkg;
import { prisma } from '../db.js';
import multer from 'multer';
import { createClient } from '@supabase/supabase-js';

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

// POST /api/business/catalog - Upload product catalog (CSV/JSON)
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
    let products = [];
    
    // Parse file based on type
    if (req.file.mimetype === 'text/csv') {
      // Parse CSV
      const csvText = req.file.buffer.toString('utf-8');
      const lines = csvText.split('\n').filter(line => line.trim());
      
      if (lines.length < 2) {
        return res.status(400).json({ error: 'CSV file is empty or invalid' });
      }
      
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      // Validate required columns
      const required = ['title', 'description', 'price', 'category', 'stock'];
      const missing = required.filter(r => !headers.includes(r));
      if (missing.length > 0) {
        return res.status(400).json({ error: `Missing required columns: ${missing.join(', ')}` });
      }
      
      // Parse rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim());
        const product = {};
        headers.forEach((header, idx) => {
          product[header] = values[idx];
        });
        products.push(product);
      }
    } else if (req.file.mimetype === 'application/json') {
      // Parse JSON
      products = JSON.parse(req.file.buffer.toString('utf-8'));
      
      if (!Array.isArray(products)) {
        return res.status(400).json({ error: 'JSON must be an array of products' });
      }
      
      // Validate required fields
      const required = ['title', 'description', 'price', 'category', 'stock'];
      for (const product of products) {
        const missing = required.filter(r => !product[r]);
        if (missing.length > 0) {
          return res.status(400).json({ error: `Product missing required fields: ${missing.join(', ')}` });
        }
      }
    }
    
    // Get all categories for mapping
    const categories = await prisma.category.findMany();
    const categoryMap = {};
    categories.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat.id;
    });
    
    // Process products and upsert to database
    const addedProducts = [];
    const failedProducts = [];
    
    for (const product of products) {
      try {
        const categoryName = product.category.toLowerCase().trim();
        const categoryId = categoryMap[categoryName];
        
        if (!categoryId) {
          failedProducts.push({
            product: product.title,
            reason: `Category "${product.category}" not found in our categories`
          });
          continue;
        }
        
        // Convert price to minor units (cents)
        const priceMinor = Math.round(parseFloat(product.price) * 100);
        
        const newProduct = await prisma.b2BProduct.create({
          data: {
            b2bId,
            title: product.title,
            description: product.description,
            priceMinor,
            currency: product.currency || 'AED',
            stock: parseInt(product.stock),
            categoryId,
            imageUrl: product.imageUrl || product.imageurl || null
          }
        });
        
        addedProducts.push(newProduct);
      } catch (err) {
        console.error('Error adding product:', product.title, err);
        failedProducts.push({
          product: product.title,
          reason: err.message
        });
      }
    }
    
    res.json({
      success: true,
      message: `Successfully added ${addedProducts.length} products`,
      addedCount: addedProducts.length,
      failedCount: failedProducts.length,
      failedProducts
    });
  } catch (err) {
    console.error('Error uploading catalog:', err);
    res.status(500).json({ error: 'Failed to upload catalog' });
  }
});

// GET /api/business/products - Get all B2B products for this business
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
    
    const products = await prisma.b2BProduct.findMany({
      where: { b2bId: user.b2b.id },
      include: { category: true },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json({ products });
  } catch (err) {
    console.error('Error fetching B2B products:', err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

export default router;


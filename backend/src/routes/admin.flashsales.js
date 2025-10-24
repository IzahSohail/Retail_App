import express from 'express';
import { FlashSaleService } from '../services/flashSale.js';

const router = express.Router();

// Middleware to check admin access
const requireAdmin = (req, res, next) => {
  const adminEmails = ['izahs2003@gmail.com', 'tj2286@nyu.edu'];
  if (adminEmails.includes(req.oidc?.user?.email)) {
    next();
  } else {
    res.status(403).json({ error: 'Admin access required' });
  }
};

// Create a new flash sale
router.post('/', requireAdmin, async (req, res) => {
  try {
    const { title, description, discountType, discountValue, startsAt, endsAt, productIds } = req.body;
    
    const flashSale = await FlashSaleService.createFlashSale({
      title,
      description,
      discountType,
      discountValue,
      startsAt,
      endsAt,
      productIds: productIds || []
    });
    
    res.status(201).json({
      success: true,
      sale: flashSale
    });
  } catch (error) {
    console.error('Error creating flash sale:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all flash sales (admin view)
router.get('/', requireAdmin, async (req, res) => {
  try {
    const flashSales = await FlashSaleService.getAllFlashSales();
    
    // Format the response to include products array
    const formattedSales = flashSales.map(sale => ({
      ...sale,
      products: sale.items?.map(item => item.product) || []
    }));
    
    res.json({
      success: true,
      sales: formattedSales
    });
  } catch (error) {
    console.error('Error fetching flash sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get active flash sales (public)
router.get('/active', async (req, res) => {
  try {
    const flashSales = await FlashSaleService.getActiveFlashSales();
    
    const formattedSales = flashSales.map(sale => ({
      ...sale,
      products: sale.items?.map(item => item.product) || []
    }));
    
    res.json({
      success: true,
      sales: formattedSales
    });
  } catch (error) {
    console.error('Error fetching active flash sales:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get flash sale by ID
router.get('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const flashSale = await FlashSaleService.getFlashSaleById(id);
    
    if (!flashSale) {
      return res.status(404).json({
        success: false,
        error: 'Flash sale not found'
      });
    }
    
    res.json({
      success: true,
      sale: {
        ...flashSale,
        products: flashSale.items?.map(item => item.product) || []
      }
    });
  } catch (error) {
    console.error('Error fetching flash sale:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Update flash sale products
router.patch('/:id/products', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body;
    
    const updatedSale = await FlashSaleService.updateFlashSaleProducts(id, productIds);
    
    res.json({
      success: true,
      sale: {
        ...updatedSale,
        products: updatedSale.items?.map(item => item.product) || []
      }
    });
  } catch (error) {
    console.error('Error updating flash sale products:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Delete a flash sale
router.delete('/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    await FlashSaleService.deleteFlashSale(id);
    
    res.json({
      success: true,
      message: 'Flash sale deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting flash sale:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

export default router;


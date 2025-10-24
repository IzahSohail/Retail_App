import express from 'express';
import { 
  calculateDiscountedPrice,
  calculateOrderTotal,
  formatPrice,
  toMinorUnits,
  toMajorUnits
} from '../utils/pricing_calc.js';

const router = express.Router();

// Calculate product discount
router.post('/calculate-discount', (req, res) => {
  try {
    const { originalPrice, discountType, discountValue } = req.body;

    if (!originalPrice || !discountType || !discountValue) {
      return res.status(400).json({
        error: 'Missing required fields: originalPrice, discountType, discountValue'
      });
    }

    const pricing = calculateDiscountedPrice(originalPrice, discountType, discountValue);
    
    res.json({
      success: true,
      pricing
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Calculate order total
router.post('/calculate-order', (req, res) => {
  try {
    const { items, options = {} } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        error: 'Items array is required and cannot be empty'
      });
    }

    const orderCalculation = calculateOrderTotal(items, options);
    
    res.json({
      success: true,
      orderCalculation
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Format price
router.post('/format-price', (req, res) => {
  try {
    const { price, options = {} } = req.body;

    if (price === undefined || price === null) {
      return res.status(400).json({
        error: 'Price is required'
      });
    }

    const formatted = formatPrice(price, options);
    
    res.json({
      success: true,
      formatted,
      original: price
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

// Convert currency units
router.post('/convert-units', (req, res) => {
  try {
    const { amount, direction } = req.body;

    if (amount === undefined || amount === null || !direction) {
      return res.status(400).json({
        error: 'Amount and direction are required'
      });
    }

    let result;
    if (direction === 'to-minor') {
      result = toMinorUnits(amount);
    } else if (direction === 'to-major') {
      result = toMajorUnits(amount);
    } else {
      return res.status(400).json({
        error: 'Direction must be "to-minor" or "to-major"'
      });
    }

    res.json({
      success: true,
      original: amount,
      converted: result,
      direction
    });
  } catch (error) {
    res.status(400).json({
      error: error.message
    });
  }
});

export default router;



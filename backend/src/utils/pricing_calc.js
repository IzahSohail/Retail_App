/**
 * Pricing calculation utilities
 * All prices are handled in minor units (fils/cents)
 */

/**
 * Convert from minor units to major units (e.g., fils to AED)
 */
export function toMajorUnits(minorUnits) {
  return minorUnits / 100;
}

/**
 * Convert from major units to minor units (e.g., AED to fils)
 */
export function toMinorUnits(majorUnits) {
  return Math.round(majorUnits * 100);
}

/**
 * Calculate discounted price
 * @param {number} originalPrice - Original price in minor units
 * @param {string} discountType - "PERCENTAGE" or "FIXED"
 * @param {number} discountValue - Discount value (percentage 1-99 or fixed amount in major units)
 * @returns {object} Pricing details
 */
export function calculateDiscountedPrice(originalPrice, discountType, discountValue) {
  let discountAmount = 0;
  
  if (discountType === 'PERCENTAGE') {
    // Percentage discount
    discountAmount = Math.round((originalPrice * discountValue) / 100);
  } else if (discountType === 'FIXED') {
    // Fixed amount discount (convert to minor units)
    discountAmount = toMinorUnits(discountValue);
  }
  
  // Ensure discount doesn't exceed original price
  discountAmount = Math.min(discountAmount, originalPrice);
  
  const discountedPrice = originalPrice - discountAmount;
  const savingsPercentage = originalPrice > 0 
    ? Math.round((discountAmount / originalPrice) * 100) 
    : 0;
  
  return {
    originalPrice,
    discountAmount,
    discountedPrice,
    savingsPercentage,
    formattedOriginalPrice: formatPrice(originalPrice),
    formattedDiscountedPrice: formatPrice(discountedPrice),
    formattedSavings: formatPrice(discountAmount)
  };
}

/**
 * Calculate order total with tax and fees
 * @param {Array} items - Array of items with { priceMinor, quantity }
 * @param {object} options - Options for tax rate and fees
 * @returns {object} Order calculation details
 */
export function calculateOrderTotal(items, options = {}) {
  const {
    taxRate = 0.05,  // 5% default tax
    feeRate = 0.02   // 2% default processing fee
  } = options;
  
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => {
    return sum + (item.priceMinor * item.quantity);
  }, 0);
  
  // Calculate tax and fees
  const tax = Math.round(subtotal * taxRate);
  const fees = Math.round(subtotal * feeRate);
  const total = subtotal + tax + fees;
  
  return {
    subtotal,
    tax,
    fees,
    total,
    formattedSubtotal: formatPrice(subtotal),
    formattedTax: formatPrice(tax),
    formattedFees: formatPrice(fees),
    formattedTotal: formatPrice(total)
  };
}

/**
 * Format price for display
 * @param {number} price - Price in minor units
 * @param {object} options - Formatting options
 * @returns {string} Formatted price string
 */
export function formatPrice(price, options = {}) {
  const {
    currency = 'AED',
    locale = 'en-AE'
  } = options;
  
  const majorUnits = toMajorUnits(price);
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(majorUnits);
}

/**
 * Get flash sale price for a product
 * @param {object} product - Product object with priceMinor
 * @param {object} flashSale - Flash sale object with discountType and discountValue
 * @returns {object} Flash sale pricing details
 */
export function getFlashSalePrice(product, flashSale) {
  if (!flashSale) {
    return {
      hasFlashSale: false,
      originalPrice: product.priceMinor,
      finalPrice: product.priceMinor,
      formattedOriginalPrice: formatPrice(product.priceMinor),
      formattedFinalPrice: formatPrice(product.priceMinor)
    };
  }
  
  const pricingDetails = calculateDiscountedPrice(
    product.priceMinor,
    flashSale.discountType,
    flashSale.discountValue
  );
  
  return {
    hasFlashSale: true,
    originalPrice: product.priceMinor,
    finalPrice: pricingDetails.discountedPrice,
    discountAmount: pricingDetails.discountAmount,
    savingsPercentage: pricingDetails.savingsPercentage,
    formattedOriginalPrice: pricingDetails.formattedOriginalPrice,
    formattedFinalPrice: pricingDetails.formattedDiscountedPrice,
    formattedSavings: pricingDetails.formattedSavings,
    flashSale: {
      title: flashSale.title,
      endsAt: flashSale.endsAt
    }
  };
}



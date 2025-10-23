const VALIDATION_PATTERNS = {
  // Product title: 3-200 characters, alphanumeric with spaces and common punctuation
  title: /^[a-zA-Z0-9\s\-_,.'&()]+$/,
  
  // Description: 10-2000 characters, allows most characters
  description: /^[\s\S]{10,2000}$/,
  
  // Price: Positive number with optional decimals (e.g., 99, 99.99, 0.50)
  price: /^\d+(\.\d{1,2})?$/,
  
  // Category: Alphanumeric with spaces, hyphens, underscores
  category: /^[a-zA-Z0-9\s\-_]+$/,
  
  // Stock: Positive integer (0 or more)
  stock: /^\d+$/,
  
  // Image URL (optional): Valid URL format
  imageUrl: /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/i
};

// Valid category names (case-insensitive)
const VALID_CATEGORIES = [
  'electronics',
  'textbooks', 
  'furniture',
  'clothing'
];

// EXTRACT FUNCTIONS

/**
 * Extract products from CSV buffer
 * @param {Buffer} buffer - CSV file buffer
 * @returns {Array} Array of product objects
 */
export function extractFromCSV(buffer) {
  const csvText = buffer.toString('utf-8');
  const lines = csvText.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('CSV file is empty or contains no data rows');
  }
  
  // Parse headers (first row)
  const headers = lines[0]
    .split(',')
    .map(h => h.trim().toLowerCase().replace(/["']/g, ''));
  
  // Validate required columns exist
  const required = ['title', 'description', 'price', 'category', 'stock'];
  const missing = required.filter(r => !headers.includes(r));
  
  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(', ')}`);
  }
  
  // Parse data rows
  const products = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    // Handle CSV with quoted values containing commas
    const values = parseCSVLine(line);
    
    if (values.length !== headers.length) {
      console.warn(`Row ${i + 1}: Column count mismatch. Expected ${headers.length}, got ${values.length}`);
      continue;
    }
    
    const product = {};
    headers.forEach((header, idx) => {
      product[header] = values[idx] ? values[idx].trim() : '';
    });
    
    products.push(product);
  }
  
  if (products.length === 0) {
    throw new Error('No valid products found in CSV file');
  }
  
  return products;
}

/**
 * Parse a single CSV line, handling quoted values
 * @param {string} line - CSV line
 * @returns {Array} Array of values
 */
function parseCSVLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim().replace(/^["']|["']$/g, ''));
      current = '';
    } else {
      current += char;
    }
  }
  
  // Push the last value
  values.push(current.trim().replace(/^["']|["']$/g, ''));
  
  return values;
}

/**
 * Extract products from JSON buffer
 * @param {Buffer} buffer - JSON file buffer
 * @returns {Array} Array of product objects
 */
export function extractFromJSON(buffer) {
  const jsonText = buffer.toString('utf-8');
  let products;
  
  try {
    products = JSON.parse(jsonText);
  } catch (err) {
    throw new Error('Invalid JSON format: ' + err.message);
  }
  
  if (!Array.isArray(products)) {
    throw new Error('JSON must be an array of products');
  }
  
  if (products.length === 0) {
    throw new Error('JSON array is empty');
  }
  
  // Validate required fields in each product
  const required = ['title', 'description', 'price', 'category', 'stock'];
  
  for (let i = 0; i < products.length; i++) {
    const product = products[i];
    const missing = required.filter(r => !(r in product) || product[r] === null || product[r] === undefined || product[r] === '');
    
    if (missing.length > 0) {
      throw new Error(`Product at index ${i} (${product.title || 'unknown'}) missing required fields: ${missing.join(', ')}`);
    }
  }
  
  return products;
}

// TRANSFORM & VALIDATE FUNCTIONS

/**
 * Validate and transform a single product
 * @param {Object} product - Raw product data
 * @param {Object} categoryMap - Map of category names to IDs
 * @returns {Object} { valid: boolean, transformed: Object|null, errors: Array }
 */
export function validateAndTransformProduct(product, categoryMap) {
  const errors = [];
  const transformed = {};
  
  // ---- TITLE VALIDATION ----
  if (!product.title || typeof product.title !== 'string') {
    errors.push('Title is required and must be a string');
  } else if (product.title.length < 3 || product.title.length > 200) {
    errors.push('Title must be between 3 and 200 characters');
  } else if (!VALIDATION_PATTERNS.title.test(product.title)) {
    errors.push('Title contains invalid characters');
  } else {
    transformed.title = product.title.trim();
  }
  
  // ---- DESCRIPTION VALIDATION ----
  if (!product.description || typeof product.description !== 'string') {
    errors.push('Description is required and must be a string');
  } else if (!VALIDATION_PATTERNS.description.test(product.description)) {
    errors.push('Description must be between 10 and 2000 characters');
  } else {
    transformed.description = product.description.trim();
  }
  
  // ---- PRICE VALIDATION ----
  const priceStr = String(product.price).trim();
  if (!VALIDATION_PATTERNS.price.test(priceStr)) {
    errors.push('Price must be a valid positive number (e.g., 99.99)');
  } else {
    const price = parseFloat(priceStr);
    if (price < 0 || price > 999999) {
      errors.push('Price must be between 0 and 999999');
    } else {
      // Convert to minor units (cents)
      transformed.priceMinor = Math.round(price * 100);
      transformed.currency = 'AED';
    }
  }
  
  //CATEGORY VALIDATION 
  if (!product.category || typeof product.category !== 'string') {
    errors.push('Category is required and must be a string');
  } else if (!VALIDATION_PATTERNS.category.test(product.category)) {
    errors.push('Category contains invalid characters');
  } else {
    const categoryName = product.category.toLowerCase().trim();
    
    // Fuzzy match category name
    const matchedCategory = matchCategory(categoryName);
    
    if (!matchedCategory) {
      errors.push(`Category "${product.category}" is not valid. Must be one of: ${VALID_CATEGORIES.join(', ')}`);
    } else {
      const categoryId = categoryMap[matchedCategory];
      if (!categoryId) {
        errors.push(`Category "${matchedCategory}" not found in database`);
      } else {
        transformed.categoryId = categoryId;
      }
    }
  }
  
  // STOCK VALIDATION 
  const stockStr = String(product.stock).trim();
  if (!VALIDATION_PATTERNS.stock.test(stockStr)) {
    errors.push('Stock must be a non-negative integer (e.g., 10)');
  } else {
    const stock = parseInt(stockStr, 10);
    if (stock < 0 || stock > 999999) {
      errors.push('Stock must be between 0 and 999999');
    } else {
      transformed.stock = stock;
    }
  }
  
  // IMAGE URL VALIDATION (optional)
  if (product.imageUrl || product.imageurl) {
    const imageUrl = (product.imageUrl || product.imageurl).trim();
    if (imageUrl) {
      if (!VALIDATION_PATTERNS.imageUrl.test(imageUrl)) {
        errors.push('Image URL is not a valid URL format');
      } else {
        transformed.imageUrl = imageUrl;
      }
    }
  } else {
    transformed.imageUrl = null;
  }
  
  return {
    valid: errors.length === 0,
    transformed: errors.length === 0 ? transformed : null,
    errors
  };
}

/**
 * Match category name using regex patterns (fuzzy matching)
 * Handles variations like "Electronics", "electronic", "ELECTRONICS", etc.
 * @param {string} categoryName - Input category name
 * @returns {string|null} Matched category name or null
 */
function matchCategory(categoryName) {
  const normalized = categoryName.toLowerCase().trim();
  
  // category patterns with regex for flexible matching
  const categoryPatterns = {
    electronics: /^electro?n(ic)?s?$/i,
    textbooks: /^(text)?book?s?$/i,
    furniture: /^furniture?$/i,
    clothing: /^cloth(ing|es)?$/i,
    sports: /^sports?$/i,
    other: /^other$/i
  };
  
  // Try exact match first
  if (VALID_CATEGORIES.includes(normalized)) {
    return normalized;
  }
  
  // Try pattern matching
  for (const [category, pattern] of Object.entries(categoryPatterns)) {
    if (pattern.test(normalized)) {
      return category;
    }
  }
  
  return null;
}

/**
 * Build category map from database categories
 * @param {Array} categories - Array of category objects from database
 * @returns {Object} Map of lowercase category names to IDs
 */
export function buildCategoryMap(categories) {
  const map = {};
  categories.forEach(cat => {
    map[cat.name.toLowerCase()] = cat.id;
  });
  return map;
}


// MAIN ETL PIPELINE
/**
 * Run the complete ETL pipeline for catalog upload
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} mimeType - File MIME type
 * @param {Array} dbCategories - Categories from database
 * @returns {Object} { success: boolean, results: Object }
 */
export async function runETL(fileBuffer, mimeType, dbCategories) {
  const results = {
    extracted: 0,
    validated: 0,
    failed: 0,
    validProducts: [],
    failedProducts: []
  };
  
  try {
    // extract
    let rawProducts = [];
    if (mimeType === 'text/csv') {
      rawProducts = extractFromCSV(fileBuffer);
    } else if (mimeType === 'application/json') {
      rawProducts = extractFromJSON(fileBuffer);
    } else {
      throw new Error('Unsupported file type. Please upload CSV or JSON.');
    }
    
    results.extracted = rawProducts.length;
    
    // build category map
    const categoryMap = buildCategoryMap(dbCategories);
    
    //TRANSFORM & VALIDATE
    for (let i = 0; i < rawProducts.length; i++) {
      const raw = rawProducts[i];
      const validation = validateAndTransformProduct(raw, categoryMap);
      
      if (validation.valid) {
        results.validProducts.push(validation.transformed);
        results.validated++;
      } else {
        results.failedProducts.push({
          product: raw.title || `Product ${i + 1}`,
          row: i + 2, // +2 because: +1 for array index, +1 for header row
          errors: validation.errors
        });
        results.failed++;
      }
    }
    
    return {
      success: true,
      results
    };
    
  } catch (err) {
    return {
      success: false,
      error: err.message,
      results
    };
  }
}


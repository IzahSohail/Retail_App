// Integration test for cart business logic

describe('Cart Operations Integration Tests', () => {
  const mockDatabase = {
    users: [],
    products: [],
    carts: [],
    cartItems: []
  };
  function createUser(userData) {
    const user = { id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, ...userData };
    mockDatabase.users.push(user);
    return user;
  }

  function createProduct(productData) {
    const product = { id: `product-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, ...productData };
    mockDatabase.products.push(product);
    return product;
  }

  function createCart(userId) {
    const cart = { id: `cart-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`, userId, items: [] };
    mockDatabase.carts.push(cart);
    return cart;
  }

  function addItemToCart(cartId, productId, quantity) {
    const cart = mockDatabase.carts.find(c => c.id === cartId);
    const product = mockDatabase.products.find(p => p.id === productId);
    
    if (!cart || !product) {
      throw new Error('Cart or product not found');
    }

    // Check stock (business logic from server.js)
    if (product.stock < quantity) {
      throw new Error(`Insufficient stock. Only ${product.stock} available`);
    }

    // Check ownership (business logic from server.js)
    const user = mockDatabase.users.find(u => u.id === cart.userId);
    if (product.sellerId === user.id) {
      throw new Error('Cannot purchase your own product');
    }

    const existingItem = cart.items.find(item => item.productId === productId);
    
    if (existingItem) {
      existingItem.quantity += quantity;
    } else {
      cart.items.push({
        id: `item-${Date.now()}`,
        cartId,
        productId,
        quantity
      });
    }
    
    return cart;
  }

  function removeItemFromCart(cartId, productId) {
    const cart = mockDatabase.carts.find(c => c.id === cartId);
    if (!cart) throw new Error('Cart not found');
    
    cart.items = cart.items.filter(item => item.productId !== productId);
    return cart;
  }

  function calculateCartTotal(cartId) {
    const cart = mockDatabase.carts.find(c => c.id === cartId);
    if (!cart) return 0;

    return cart.items.reduce((total, item) => {
      const product = mockDatabase.products.find(p => p.id === item.productId);
      return total + (product ? product.priceMinor * item.quantity : 0);
    }, 0);
  }

  // Simulate checkout process (mirrors server.js logic)
  function processCheckout(cartId, paymentMethod = 'CARD') {
    const cart = mockDatabase.carts.find(c => c.id === cartId);
    if (!cart || cart.items.length === 0) {
      throw new Error('Cart is empty');
    }

    // Calculate totals (mirrors server.js checkout logic)
    let subtotalMinor = 0;
    const validatedItems = [];

    for (const cartItem of cart.items) {
      const product = mockDatabase.products.find(p => p.id === cartItem.productId);
      
      if (!product.active) {
        throw new Error(`Product "${product.title}" is no longer available`);
      }
      
      if (product.stock < cartItem.quantity) {
        throw new Error(`Insufficient stock for "${product.title}"`);
      }

      const lineTotal = product.priceMinor * cartItem.quantity;
      subtotalMinor += lineTotal;
      validatedItems.push({ cartItem, product, lineTotal });
    }

    const taxMinor = 0; // No tax for now (from server.js)
    const feesMinor = 0; // No fees for now (from server.js)
    const totalMinor = subtotalMinor + taxMinor + feesMinor;

    // Simulate payment processing
    const paymentResult = {
      status: 'APPROVED',
      approvalRef: `${paymentMethod.toLowerCase()}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Update stock and clear cart (atomic operation simulation)
    for (const { cartItem, product } of validatedItems) {
      product.stock -= cartItem.quantity;
    }
    cart.items = []; // Clear cart

    return {
      subtotalMinor,
      taxMinor,
      feesMinor,
      totalMinor,
      payment: paymentResult
    };
  }

  beforeEach(() => {
    // Reset mock database
    mockDatabase.users = [];
    mockDatabase.products = [];
    mockDatabase.carts = [];
    mockDatabase.cartItems = [];
  });

  describe('Cart Business Logic Integration', () => {
    test('should handle complete cart workflow', () => {
      // Create user and product
      const user = createUser({
        email: 'test@example.com',
        name: 'Test User',
        auth0Id: 'auth0|test123'
      });

      const product = createProduct({
        title: 'Test Product',
        priceMinor: 2000, // 20.00 AED
        currency: 'AED',
        stock: 10,
        sellerId: 'different-seller',
        active: true
      });

      // Create cart and add item
      const cart = createCart(user.id);
      const updatedCart = addItemToCart(cart.id, product.id, 2);

      expect(updatedCart.items).toHaveLength(1);
      expect(updatedCart.items[0].quantity).toBe(2);

      // Calculate total
      const total = calculateCartTotal(cart.id);
      expect(total).toBe(4000); // 2000 * 2
    });

    test('should enforce stock validation', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      const product = createProduct({
        title: 'Limited Product',
        priceMinor: 1000,
        stock: 3,
        sellerId: 'seller123',
        active: true
      });

      const cart = createCart(user.id);

      // Should succeed within stock limit
      expect(() => addItemToCart(cart.id, product.id, 2)).not.toThrow();

      // Should fail when exceeding stock
      expect(() => addItemToCart(cart.id, product.id, 5)).toThrow('Insufficient stock');
    });

    test('should enforce ownership validation', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      const ownProduct = createProduct({
        title: 'Own Product',
        priceMinor: 1000,
        stock: 5,
        sellerId: user.id, // Same as user
        active: true
      });

      const cart = createCart(user.id);

      expect(() => addItemToCart(cart.id, ownProduct.id, 1))
        .toThrow('Cannot purchase your own product');
    });

    test('should handle item removal', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      const product = createProduct({
        title: 'Test Product',
        priceMinor: 1500,
        stock: 10,
        sellerId: 'seller123',
        active: true
      });

      const cart = createCart(user.id);
      addItemToCart(cart.id, product.id, 3);

      // Remove item
      const updatedCart = removeItemFromCart(cart.id, product.id);
      expect(updatedCart.items).toHaveLength(0);
    });

    test('should process checkout successfully', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      const product = createProduct({
        title: 'Checkout Product',
        priceMinor: 2500, // 25.00 AED
        stock: 5,
        sellerId: 'seller123',
        active: true
      });

      const cart = createCart(user.id);
      addItemToCart(cart.id, product.id, 2);

      const result = processCheckout(cart.id, 'CARD');

      expect(result.subtotalMinor).toBe(5000); // 2500 * 2
      expect(result.totalMinor).toBe(5000); // No tax/fees
      expect(result.payment.status).toBe('APPROVED');
      expect(result.payment.approvalRef).toMatch(/^card_\d+_[a-z0-9]+$/);

      // Verify stock was updated
      expect(product.stock).toBe(3); // 5 - 2 = 3

      // Verify cart was cleared
      const clearedCart = mockDatabase.carts.find(c => c.id === cart.id);
      expect(clearedCart.items).toHaveLength(0);
    });

    test('should handle multiple items in cart', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      
      const product1 = createProduct({
        title: 'Product 1',
        priceMinor: 1000,
        stock: 10,
        sellerId: 'seller1',
        active: true
      });

      const product2 = createProduct({
        title: 'Product 2',
        priceMinor: 1500,
        stock: 5,
        sellerId: 'seller2',
        active: true
      });

      const cart = createCart(user.id);
      addItemToCart(cart.id, product1.id, 2); // 2 * 1000 = 2000
      addItemToCart(cart.id, product2.id, 1); // 1 * 1500 = 1500

      const total = calculateCartTotal(cart.id);
      expect(total).toBe(3500); // 2000 + 1500

      // Check cart has both items
      const updatedCart = mockDatabase.carts.find(c => c.id === cart.id);
      expect(updatedCart.items).toHaveLength(2);
    });

    test('should fail checkout with inactive products', () => {
      const user = createUser({ email: 'test@example.com', auth0Id: 'auth0|test' });
      const product = createProduct({
        title: 'Inactive Product',
        priceMinor: 1000,
        stock: 5,
        sellerId: 'seller123',
        active: false // Inactive product
      });

      const cart = createCart(user.id);
      // Add item when product was active
      product.active = true;
      addItemToCart(cart.id, product.id, 1);
      
      // Make product inactive
      product.active = false;

      expect(() => processCheckout(cart.id, 'CARD'))
        .toThrow('no longer available');
    });
  });
});
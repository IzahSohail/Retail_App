# Use Case: Register a Sale / Purchase

**Use Case ID:** UC-002  
**Use Case Name:** Register a Sale / Purchase  
**Primary Actor:** End User (Customer)  
**Supporting Actors:** PaymentService (mock implementation with retry logic)  
**Stakeholders:** Customer (wants to purchase products), Seller (wants to sell products), System (maintains data integrity)  
**Trigger:** User clicks "Purchase" or "Checkout" button in the app

---

## Preconditions

1. **Product catalog loaded** - Products table contains active products with stock information
2. **User authenticated** - User has valid Auth0 session (req.oidc.user exists)
3. **Payment options configured** - At least CARD and CASH payment methods available
4. **Database operational** - PostgreSQL/Prisma connection active
5. **PaymentService initialized** - Mock payment adapter with retry/circuit breaker ready

---

## Postconditions

### Success Postconditions:
1. **Sale record persisted** with:
   - Timestamp (createdAt, completedAt)
   - Line items (SaleItem records)
   - Totals (subtotalMinor, taxMinor, feesMinor, totalMinor)
   - Payment details (Payment record)
   - Status = `COMPLETED`

2. **Stock levels decremented** atomically for each purchased product
3. **Payment record created** with approval reference and status
4. **Cart cleared** (for cart checkout flow)
5. **Store credits deducted** if used
6. **Receipt available** (success response with sale details)

### Failure Postconditions:
1. **Sale record exists** with status = `CANCELED`
2. **Stock levels unchanged** (rolled back)
3. **Payment record created** with failure reason
4. **Store credits restored** if deducted
5. **Cart intact** (for cart checkout flow)

---

## Main Success Scenario (MSS)

### **Step 1: System displays empty cart OR product details**
- **Cart Flow:** User navigates to `/cart`, system fetches CartItem records for user
- **Direct Purchase:** User navigates to `/checkout?productId=X&quantity=N`
- **Frontend:** `Cart.jsx` or `Checkout.jsx` displays products with pricing

### **Step 2: User adds product(s) and enters quantity**
- **Cart Flow:** User clicks "Add to Cart" → `POST /api/cart/add` creates CartItem
- **Direct Purchase:** User enters quantity in product view
- **System validates:** Product ID exists, quantity > 0
- **Database:** CartItem records created/updated in cart table

### **Step 3: System validates product IDs and checks stock**
- **Backend:** `server.js` - Purchase endpoint validates:
  ```javascript
  // Check product exists and is active
  product.active === true
  // Check sufficient stock
  product.stock >= quantity
  // Check not self-purchase
  product.sellerId !== buyer.id
  ```
- **Flash Sale Check:** Query active FlashSale records to apply discounts
- **Error Handling:** Returns 400 with specific error if validation fails

### **Step 4: System computes totals and displays running summary**
- **Pricing Calculation:**
  ```javascript
  // Apply flash sale discount if applicable
  effectivePrice = flashSale ? 
    (discountType === 'PERCENTAGE' ? 
      priceMinor * (1 - discountValue/100) : 
      priceMinor - discountValue) : 
    priceMinor;
  
  lineTotalMinor = effectivePrice * quantity;
  subtotalMinor = sum(lineTotalMinor);
  taxMinor = Math.round(subtotalMinor * 0.05); // 5% tax
  feesMinor = Math.round(subtotalMinor * 0.02); // 2% fee
  totalMinor = subtotalMinor + taxMinor + feesMinor;
  ```
- **Store Credits:** If available, calculate `amountAfterCredits = totalMinor - storeCreditMinor`
- **Frontend:** Real-time display of subtotal, tax, fees, total in Cart/Checkout component

### **Step 5: User chooses payment option**
- **Available Methods:**
  - `CARD` - Credit/debit card (mock payment)
  - `CASH` - Cash on delivery
  - `STORE_CREDIT` - Use store credits only
- **Store Credit Option:** User can toggle "Use Store Credits" checkbox
- **Validation:** If using store credits + remaining amount, CASH not allowed (only CARD)
- **Frontend:** Radio buttons for payment method selection in `Cart.jsx` / `Checkout.jsx`

### **Step 6: System processes payment and receives confirmation**
- **Phase 1 - Atomic Stock Reservation:**
  ```javascript
  await prisma.$transaction(async (tx) => {
    // Atomic stock decrement with validation in WHERE
    const stockUpdate = await tx.product.updateMany({
      where: { 
        id: productId,
        active: true,
        sellerId: { not: buyer.id },
        stock: { gte: quantity }
      },
      data: { stock: { decrement: quantity } }
    });
    
    if (stockUpdate.count === 0) throw Error(...);
    
    // Create PENDING sale
    const sale = await tx.sale.create({
      data: { status: 'PENDING', ... }
    });
  });
  ```

- **Phase 2 - Payment Processing:**
  ```javascript
  const paymentResult = await paymentService.processPayment({
    amount: amountAfterCredits,
    currency: 'AED',
    paymentMethod: paymentMethod,
    idempotencyKey: sale.id
  });
  ```
  - **Retry Logic:** Up to 3 retries with exponential backoff
  - **Circuit Breaker:** Opens after 5 consecutive failures
  - **Idempotency:** Cached by idempotency key to prevent duplicate charges

### **Step 7: System persists sale with all details**
- **Phase 3 - Finalize Sale:**
  ```javascript
  await prisma.$transaction(async (tx) => {
    // Deduct store credits if used
    if (storeCreditMinor > 0) {
      await tx.user.update({
        data: { creditMinor: { decrement: storeCreditMinor } }
      });
    }
    
    // Create payment record
    const payment = await tx.payment.create({
      data: {
        saleId: sale.id,
        method: paymentMethod,
        status: paymentResult.status,
        approvalRef: paymentResult.transactionId
      }
    });
    
    // Mark sale as COMPLETED
    await tx.sale.update({
      where: { id: sale.id, status: 'PENDING' },
      data: { status: 'COMPLETED', completedAt: new Date() }
    });
    
    // Clear cart
    await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
  });
  ```

### **Step 8: System decrements inventory atomically**
- **Already done in Step 6 Phase 1** using `updateMany` with WHERE clause
- **Atomicity guaranteed** by Prisma transaction
- **Concurrency safe** - if another transaction consumes stock first, this fails

### **Step 9: System shows success and offers receipt**
- **Response:**
  ```json
  {
    "success": true,
    "message": "Purchase completed successfully!",
    "sale": { "id": "...", "totalMinor": 5000, "status": "COMPLETED" },
    "payment": { "approvalRef": "TXN_123", "status": "APPROVED" }
  }
  ```
- **Frontend:** Displays success message, redirects to home
- **Receipt:** Sale details available via GET /api/sales/:id (future)

---

## Alternate / Exception Flows

### **A1. Invalid Product ID**
- **Trigger:** Step 3 - Product not found in database
- **System Action:**
  ```javascript
  if (!product) {
    return res.status(400).json({ error: 'Product not found' });
  }
  ```
- **User Action:** Item not added to cart; user can retry with valid ID or cancel

### **A2. Insufficient Stock**
- **Trigger:** Step 3b - `product.stock < quantity`
- **System Action:**
  ```javascript
  if (stockUpdate.count === 0 && product.stock < quantity) {
    throw new Error(`Insufficient stock. Only ${product.stock} available`);
  }
  ```
- **User Options:**
  1. Reduce quantity to available stock
  2. Remove item from cart
  3. Cancel entire purchase
- **Frontend:** Display available stock in error message

### **A3. Pricing/Totals Change Mid-Flow (Flash Sale starts/ends)**
- **Trigger:** Step 4a - Flash sale becomes active/inactive between cart load and checkout
- **System Action:**
  - Recalculates totals at checkout time (not cart load time)
  - Highlights price changes in UI
- **User Action:** Must confirm new total before proceeding to payment

### **A4. Payment Failure/Decline**
- **Trigger:** Step 6a - Payment gateway returns failure
- **System Action:**
  ```javascript
  if (!paymentResult.success) {
    // Rollback: Cancel sale and return stock
    await tx.sale.update({ data: { status: 'CANCELED' } });
    await tx.product.update({ data: { stock: { increment: quantity } } });
    
    return res.status(400).json({
      error: `Payment failed: ${payment.failureReason}`
    });
  }
  ```
- **User Options:**
  1. Choose different payment method
  2. Cancel purchase
- **State:** No sale persisted in COMPLETED state, stock unchanged

### **A5. Concurrency Conflict on Stock**
- **Trigger:** Step 8a - Another transaction consumed stock between validation and commit
- **System Action:**
  ```javascript
  const stockUpdate = await tx.product.updateMany({
    where: { stock: { gte: quantity } }, // This fails if stock insufficient
    data: { stock: { decrement: quantity } }
  });
  
  if (stockUpdate.count === 0) {
    throw new Error('Stock reservation failed'); // Transaction rolls back
  }
  ```
- **Payment Rollback:** If payment already processed, PaymentService marks for refund
- **User Notification:** "Product just sold out. Please try again."
- **Return to:** Step 3 to check current stock

### **A6. User Cancels Before Payment**
- **Trigger:** User clicks "Cancel" or navigates away
- **System Action:** 
  - Cart items remain in database (CartItem records intact)
  - No Sale or Payment records created
  - No stock changes
- **User Action:** Can return to cart later

### **A7. Not Authenticated**
- **Trigger:** Before Step 1 - req.oidc.isAuthenticated() returns false
- **System Action:**
  ```javascript
  if (!req.oidc.isAuthenticated()) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  ```
- **Frontend:** Redirects to Auth0 login page
- **After Login:** Returns to intended purchase page

### **A8. Self-Purchase Detected**
- **Trigger:** Before Step 6 - `product.sellerId === buyer.id`
- **System Action:**
  ```javascript
  if (product.sellerId === buyer.id) {
    return res.status(400).json({ 
      error: 'Cannot purchase your own product' 
    });
  }
  ```
- **User Action:**
  1. Remove item from cart
  2. Switch to different account
- **Frontend:** Displays error message, prevents checkout

### **A9. Circuit Breaker OPEN**
- **Trigger:** Step 6 - PaymentService circuit breaker opened (5+ consecutive failures)
- **System Action:**
  ```javascript
  if (circuitBreaker.state === 'OPEN') {
    throw new Error('Payment service temporarily unavailable');
  }
  ```
- **Response:** 500 error with message "Please try again later"
- **Timeout:** Circuit attempts half-open after 60 seconds

### **A10. Idempotent Retry**
- **Trigger:** Step 6 - Same idempotency-key header sent twice
- **System Action:**
  ```javascript
  const existingSale = await prisma.sale.findUnique({
    where: { idempotencyKey }
  });
  
  if (existingSale) {
    return res.json({
      success: true,
      message: 'Purchase already processed',
      sale: existingSale
    });
  }
  ```
- **No duplicate charge:** Returns cached result
- **Stock not double-decremented:** Only first request processes

### **A11. Store Credits Insufficient**
- **Trigger:** Step 5 - User selects store credits but balance < amount
- **System Action:**
  ```javascript
  if (storeCreditMinor > user.creditMinor) {
    return res.status(400).json({ 
      error: 'Insufficient store credits' 
    });
  }
  ```
- **User Action:** Adjust store credit amount or choose different payment method

---

## Business Rules

### **BR-S1: Atomic Stock Management**
- Stock reservation MUST be atomic with sale creation
- Use `updateMany` with WHERE clause validation
- No separate SELECT then UPDATE (prevents race conditions)

### **BR-S2: Three-Phase Commit Pattern**
1. **Phase 1:** Reserve stock (PENDING sale)
2. **Phase 2:** Process payment (external service)
3. **Phase 3:** Finalize sale (COMPLETED) or rollback

### **BR-S3: Self-Purchase Prevention**
- Users cannot purchase their own products
- Validation in WHERE clause: `sellerId: { not: buyer.id }`

### **BR-S4: Payment Idempotency**
- Each sale has unique idempotency key
- Duplicate requests return cached result
- Prevents double charges

### **BR-S5: Stock Rollback on Failure**
- If payment fails, restore stock atomically
- If sale canceled, restore stock atomically
- Use transaction for consistency

### **BR-S6: Store Credit Limitations**
- Cannot combine CASH payment with store credits
- Can combine CARD payment with store credits
- Store credits deducted in finalization transaction

### **BR-S7: Flash Sale Priority**
- Active flash sales automatically apply discounts
- Discount calculated at checkout time (not cart time)
- Flash sale overrides regular price

---

## Data Integrity Constraints

1. **Sale.status** ∈ {PENDING, COMPLETED, CANCELED}
2. **Payment.status** ∈ {PENDING, APPROVED, DECLINED, ERROR}
3. **Product.stock** ≥ 0 (enforced by WHERE clause)
4. **Sale.totalMinor** = subtotalMinor + taxMinor + feesMinor
5. **SaleItem.lineTotalMinor** = unitMinor × quantity

---

## Performance Considerations

1. **Two-query pattern:** Fast stock reservation, then slower payment processing
2. **Circuit breaker:** Prevents cascading failures to payment service
3. **Retry with backoff:** Handles transient network errors
4. **Idempotency cache:** Prevents duplicate work on retries
5. **Atomic operations:** Single transaction for stock + sale creation

---

## Security Considerations

1. **Authentication required:** All purchase endpoints use `testAuthMiddleware`
2. **Self-purchase prevention:** Backend validation (not just frontend)
3. **Price tampering prevention:** Backend recalculates all totals
4. **Idempotency keys:** Prevent replay attacks
5. **Amount validation:** Backend validates all monetary values

---

## Related Use Cases

- **UC-001:** View Product Catalog (prerequisite)
- **UC-003:** Process Refund (inverse operation)
- **UC-004:** Manage Flash Sales (affects pricing)
- **UC-005:** Manage Cart (alternate flow)

---

## Traceability

| Requirement | Code Location |
|------------|---------------|
| Stock Reservation | `server.js:843-859` (updateMany atomic) |
| Payment Processing | `PaymentService.js:42-125` (retry + circuit breaker) |
| Sale Finalization | `server.js:943-996` (three-phase commit) |
| Self-Purchase Check | `server.js:847` (WHERE not equals buyer) |
| Idempotency | `server.js:806-820` (findUnique check) |
| Store Credits | `server.js:1580-1606` (deduct/restore) |
| Cart Checkout | `server.js:1334-1681` (full flow) |
| Direct Purchase | `server.js:785-1003` (single item flow) |

---

**Last Updated:** November 13, 2025  
**Status:** ✅ Matches Production Code  
**Verified Against:** `/backend/src/server.js`, `/backend/src/services/PaymentService.js`

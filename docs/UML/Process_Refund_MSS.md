# Process Refund - Main Success Scenario (MSS)

## Use Case: Process Refund

**Primary Actor:** Customer  
**Supporting Actors:** Admin  
**System Boundary:** RetailAppSystem  
**Stakeholders and Interests:**
- Customer: Wants a fair and quick refund process for returned items
- Admin: Wants to validate refund requests and maintain business integrity
- Business: Wants to track defective items and maintain customer satisfaction

**Preconditions:**
- Customer has a valid Order with completed Payment
- Customer has initiated a return request
- Admin has appropriate permissions

**Postconditions:**
- RefundRequest is processed (Credit or card refund issued)
- Order status is updated to REFUNDED
- DefectiveItem record created (if applicable)
- MetricsService updated with refund data

---

## Main Success Scenario (MSS)

**1. Customer submits a refund request**
   - Customer provides orderId, productId, and reason for refund
   - System (RetailAppSystem) validates the Order exists and is eligible for refund
   - System creates a RefundRequest with status "PENDING"
   - System records the request in the database
   - System sends confirmation to Customer

**2. System records the request and sets status to PENDING**
   - RefundRequest is persisted via RefundRepository
   - Order is linked to RefundRequest (1 Order can have 0..* RefundRequests)
   - Timestamp and customer information are captured

**3. Admin reviews the request**
   - Admin accesses the admin dashboard
   - System retrieves pending RefundRequests via RefundService
   - Admin selects a specific RefundRequest to review
   - System displays full details: Order info, Payment info, Customer info, product, reason

**4. If valid, Admin approves it**
   - Admin determines the request meets business rules
   - Admin decides on refund method: credit OR card refund

**5. System processes the refund:**

   **5a. Either issues a credit:**
   - Admin approves with method="CREDIT"
   - System creates a Credit entity for the customer
   - RefundProcessor/RefundService issues store credit to customer account
   - Credit balance is updated immediately
   
   **5b. OR issues a refund to card (according to rules):**
   - Admin approves with method="CARD"
   - System initiates card refund via Payment gateway
   - RefundProcessor processes the card refund
   - Payment record is updated with refund transaction

**6. If item is defective:**
   - Admin marks the item as defective during approval
   - System creates a DefectiveItem record (or DefectiveRecord)
   - DefectiveItem includes: productId, defectType, description, orderId, timestamp
   - System links DefectiveItem to the RefundRequest

**7. System updates all relevant records:**
   - **Order:** Status changed to "REFUNDED"
   - **Payment/Refund:** Payment record updated with refund transaction details
   - **RefundRequest:** Status changed to "APPROVED" or "APPROVED_DEFECTIVE"
   - **Defective table:** DefectiveItem record created (if applicable)
   - **Metrics:** MetricsService/MonitoringService updated with:
     - Total refunds count
     - Refund approval rate
     - Defective item count
     - Product return rate

**8. System shows updated refund status**
   - Admin sees success confirmation with updated RefundRequest status
   - Customer receives notification (email/in-app) of approved refund
   - RefundRequest status is visible in customer's order history
   - Dashboard metrics reflect the new refund

---

## Alternative Flows

### 3a. **Request is Invalid/Denied**
- At step 3, Admin determines request is not valid
- Admin selects "Deny Refund"
- System prompts for denial reason
- Admin enters reason (e.g., "outside return window", "item damaged by customer")
- System updates refund status to "DENIED"
- System sends denial notification to customer with reason
- Use case ends

### 4c. **Partial Refund**
- At step 4, Admin determines partial refund is appropriate
- Admin enters partial refund amount
- System calculates and displays refund breakdown
- Admin confirms partial refund
- System processes partial refund amount
- Resume at step 5

### 5a. **Payment Processing Fails**
- At step 5, card refund processing fails
- System logs error and notifies admin
- Admin investigates and can retry or issue credit instead
- System marks refund as "PROCESSING_FAILED"
- Admin resolves issue manually
- Resume at step 5 when resolved

---

## Exception Flows

### E1. **Order Not Found**
- At step 1, system cannot find the order
- System displays error: "Order not found"
- System prompts customer to verify order ID
- Use case ends

### E2. **Refund Window Expired**
- At step 1, order is outside refund eligibility window
- System displays error: "Refund period has expired"
- System suggests contacting customer service
- Use case ends

### E3. **Admin Session Timeout**
- At any step, admin session expires
- System saves draft state of review
- System redirects to login
- After login, admin can resume from saved state

### E4. **System Error During Processing**
- At step 5 or 6, system encounters error
- System rolls back transaction
- System logs error details
- System notifies admin of failure
- Admin can retry or escalate to technical support

---

## Business Rules

**BR1:** Refund requests must be submitted within 30 days of purchase  
**BR2:** Items must be in resalable condition unless defective  
**BR3:** Defective items require photo evidence (optional but recommended)  
**BR4:** Card refunds take 5-7 business days to process  
**BR5:** Store credits are issued immediately  
**BR6:** Customers can have maximum 3 pending refund requests  
**BR7:** Refund amount includes product price but may exclude shipping  

---

## Special Requirements

**SR1:** System must maintain audit trail of all refund decisions  
**SR2:** Defective item data must be anonymized for analytics  
**SR3:** Refund processing must comply with payment gateway requirements  
**SR4:** System must send email notifications at each status change  
**SR5:** Admin actions must be logged with timestamp and user ID  

---

## Technology and Data Variations

**TD1:** Customer submits refund via web interface or mobile app  
**TD2:** Admin reviews via admin dashboard (web only)  
**TD3:** Refund can be store credit or original payment method  
**TD4:** Defective item tracking integrates with inventory system  

---

## Frequency of Occurrence

- Estimated: 50-100 refund requests per month
- Peak during post-holiday periods
- Admin reviews: Daily batches

---

## Open Issues

- Should customers be able to upload images of defective items?
- What happens if customer disputes a denied refund?
- Integration requirements with external payment processors
- Automated refund approval for low-value items?

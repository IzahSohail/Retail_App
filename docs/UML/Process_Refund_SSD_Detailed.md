# System Sequence Diagram - Process Refund

## Visual Representation

```
Customer          System          Admin
   |                |               |
   |                |               |
   |--- submitRefundRequest() ----->|
   |    (orderID, productID,        |
   |     reason, description)       |
   |                |               |
   |<-- confirmationMessage() ------|
   |    (requestID, "PENDING")      |
   |                |               |
   |                |               |
   |                |<-- viewPendingRefunds() ---|
   |                |                            |
   |                |--- refundRequestsList() -->|
   |                |                            |
   |                |<-- selectRefundRequest() --|
   |                |    (requestID)             |
   |                |                            |
   |                |--- refundDetails() ------->|
   |                |    (order, customer,       |
   |                |     product, reason)       |
   |                |                            |
   
   ┌────────────────────────────────────────────────────┐
   │  Decision Point: Admin Evaluates Request           │
   └────────────────────────────────────────────────────┘
   
   ╔═══════════════════════════════════════════════════╗
   ║  Path 1: Approve - Credit (Non-Defective)        ║
   ╚═══════════════════════════════════════════════════╝
   
   |                |<-- approveRefund() --------|
   |                |    (requestID, "CREDIT")   |
   |                |                            |
   |                |--- validateRequest() ------|
   |                |--- issueStoreCredit() -----|
   |                |--- updateOrderStatus() ----|
   |                |--- updateRefundStatus() ---|
   |                |--- updateMetrics() --------|
   |                |                            |
   |                |--- success() ------------->|
   |<-- refundNotification() -------------------|
   |    ("APPROVED", "CREDIT", amount)          |
   |                |                            |
   
   
   ╔═══════════════════════════════════════════════════╗
   ║  Path 2: Approve - Card Refund (Non-Defective)   ║
   ╚═══════════════════════════════════════════════════╝
   
   |                |<-- approveRefund() --------|
   |                |    (requestID, "CARD")     |
   |                |                            |
   |                |--- validateRequest() ------|
   |                |--- initiateCardRefund() ---|
   |                |--- updateOrderStatus() ----|
   |                |--- updateRefundStatus() ---|
   |                |--- updateMetrics() --------|
   |                |                            |
   |                |--- success() ------------->|
   |<-- refundNotification() -------------------|
   |    ("APPROVED", "CARD", amount, "5-7 days")|
   |                |                            |
   
   
   ╔═══════════════════════════════════════════════════╗
   ║  Path 3: Approve - Defective Item                ║
   ╚═══════════════════════════════════════════════════╝
   
   |                |<-- approveRefundDefective() ----|
   |                |    (requestID, defectCategory,  |
   |                |     defectDescription)          |
   |                |                                 |
   |                |--- validateRequest() -----------|
   |                |--- recordDefectiveItem() -------|
   |                |--- issueStoreCredit() ----------|
   |                |--- updateOrderStatus() ---------|
   |                |--- updateRefundStatus() --------|
   |                |--- updateDefectiveMetrics() ----|
   |                |--- updateInventoryStatus() -----|
   |                |                                 |
   |                |--- success() ------------------>|
   |<-- refundNotification() -------------------------|
   |    ("APPROVED", "CREDIT", amount,                |
   |     "Defective item recorded")                   |
   |                |                                 |
   
   
   ╔═══════════════════════════════════════════════════╗
   ║  Path 4: Deny Request                            ║
   ╚═══════════════════════════════════════════════════╝
   
   |                |<-- denyRefund() ------------|
   |                |    (requestID, reason)      |
   |                |                             |
   |                |--- validateRequest() -------|
   |                |--- updateRefundStatus() ----|
   |                |--- updateMetrics() ---------|
   |                |                             |
   |                |--- success() -------------->|
   |<-- refundNotification() --------------------|
   |    ("DENIED", denialReason)                 |
   |                |                             |
   
   
   ┌────────────────────────────────────────────────────┐
   │  Status Checks                                     │
   └────────────────────────────────────────────────────┘
   
   |--- checkRefundStatus() ----->|
   |    (requestID)                |
   |                               |
   |<-- refundStatusInfo() --------|
   |    (status, method, amount)   |
   |                               |
   
   |                |<-- viewRefundAnalytics() ---|
   |                |                             |
   |                |--- analyticsReport() ------>|
   |                |    (totalRefunds,           |
   |                |     approvalRate,           |
   |                |     defectiveRate, etc.)    |
   |                |                             |
```

## Message Descriptions

### Customer → System Messages

| Message | Parameters | Description |
|---------|-----------|-------------|
| `submitRefundRequest()` | orderID, productID, reason, description | Customer initiates refund request for a purchased item |
| `checkRefundStatus()` | requestID | Customer checks current status of their refund request |

### Admin → System Messages

| Message | Parameters | Description |
|---------|-----------|-------------|
| `viewPendingRefunds()` | - | Admin requests list of all pending refund requests |
| `selectRefundRequest()` | requestID | Admin selects a specific request to review |
| `approveRefund()` | requestID, method ("CREDIT" or "CARD_REFUND") | Admin approves non-defective item refund |
| `approveRefundDefective()` | requestID, defectCategory, defectDescription | Admin approves refund and records defective item |
| `denyRefund()` | requestID, denialReason | Admin denies the refund request |
| `viewRefundAnalytics()` | - | Admin views refund metrics and analytics |

### System → Customer Messages

| Message | Parameters | Description |
|---------|-----------|-------------|
| `confirmationMessage()` | requestID, status | System confirms refund request received |
| `refundNotification()` | status, method, amount, [reason/note] | System notifies customer of refund decision |
| `refundStatusInfo()` | status, method, amount, timestamp | System provides current refund status |

### System → Admin Messages

| Message | Parameters | Description |
|---------|-----------|-------------|
| `refundRequestsList()` | requests[] | System returns list of pending requests |
| `refundDetails()` | orderInfo, customerInfo, productInfo, reason | System provides full details of selected request |
| `success()` | message | System confirms admin action completed |
| `analyticsReport()` | totalRefunds, approvalRate, defectiveRate, avgProcessingTime | System provides refund analytics |

## Internal System Operations (shown for completeness)

These are internal system operations that happen during the refund process:

1. **validateRequest()** - Verifies request exists and is in valid state
2. **issueStoreCredit()** - Credits customer account with refund amount
3. **initiateCardRefund()** - Processes refund to original payment method
4. **recordDefectiveItem()** - Logs defective product in defective_products table
5. **updateOrderStatus()** - Changes order status to "REFUNDED"
6. **updateRefundStatus()** - Changes refund request status (APPROVED/DENIED)
7. **updateMetrics()** - Updates analytics counters and statistics
8. **updateDefectiveMetrics()** - Updates product defect tracking metrics
9. **updateInventoryStatus()** - Marks inventory item as defective

## System States

### Refund Request States
- **PENDING** - Initial state, awaiting admin review
- **APPROVED** - Approved, refund issued (non-defective)
- **APPROVED_DEFECTIVE** - Approved, defective item recorded
- **DENIED** - Request denied by admin
- **PROCESSING_FAILED** - Technical error during processing

### Order States
- **REFUNDED** - Order has been refunded
- **PARTIALLY_REFUNDED** - Only some items refunded (if applicable)

## Business Rules (reflected in SSD)

1. **BR-R1**: All refund requests must be validated before processing
2. **BR-R2**: Customers receive immediate notification of request receipt
3. **BR-R3**: Admins can approve with credit, card refund, or mark defective
4. **BR-R4**: Defective items are recorded separately for analytics
5. **BR-R5**: All actions update relevant metrics and analytics
6. **BR-R6**: System maintains audit trail (logged automatically)
7. **BR-R7**: Card refunds indicate processing time (5-7 days)
8. **BR-R8**: Store credits are issued immediately

## Notes

- **System Boundary**: All operations shown are within the Retail App system
- **Asynchronous**: Card refund processing may be asynchronous with external payment gateway
- **Notifications**: Email/SMS notifications sent in addition to in-app updates
- **Audit Trail**: All state changes logged with timestamp, user ID, and details
- **Concurrency**: System handles multiple concurrent refund reviews
- **Idempotency**: Refund operations are idempotent (can retry safely)

# UML Diagram Verification Report

**Date**: 2024-12-04  
**Purpose**: Verify that all updated UML diagrams accurately reflect the current codebase structure

## Diagrams Updated

1. ✅ **Class_Diagram_Updated.puml**
2. ✅ **Module_Diagram_Updated.puml**
3. ✅ **Deployment_Diagram_Updated.puml**
4. ✅ **Register_Sale_Class_Diagram.puml**
5. ✅ **Sequence_Diagram_Admin_Low_Stock_Alert_And_Filtering.puml** (NEW)
6. ✅ **System_Sequence_Purchase_With_Notification_Diagram.puml** (NEW)
7. ✅ **Sequence_Diagram_OrderSearch.puml**

---

## Verification Checklist

### 1. Class Diagram (Class_Diagram_Updated.puml)

#### Routes Verified
- ✅ `admin.dashboard.js` - verification requests, business verification, purchase filtering
- ✅ `admin.flashsales.js` - flash sale management
- ✅ `business.js` - business verification submission
- ✅ `verification.js` - student verification
- ✅ `rma.js` - return/refund processing
- ✅ `pricing.js` - pricing calculations

#### Services Verified
- ✅ `PaymentService.js` - payment processing with retry and circuit breaker
- ✅ `MockPaymentAdapter.js` - payment simulation
- ✅ `rmaService.js` - RMA workflow management
- ✅ `flashSale.js` - flash sale service
- ✅ `catalogETL.js` - product catalog management

#### Database Models Verified (19 models)
- ✅ User (with RMA relations, credit tracking)
- ✅ Product (with stock management)
- ✅ Category
- ✅ Sale (with refund tracking)
- ✅ SaleItem
- ✅ Payment (with refund relations)
- ✅ Cart
- ✅ CartItem
- ✅ FlashSale
- ✅ FlashSaleItem
- ✅ ReturnRequest (complete RMA model)
- ✅ ReturnItem
- ✅ ReturnShipment
- ✅ Inspection
- ✅ Refund
- ✅ RmaAuditLog
- ✅ DefectiveItems
- ✅ B2B
- ✅ VerificationRequest

#### Enums Verified
- ✅ `UserRole`: USER, BUSINESS, ADMIN
- ✅ `SaleStatus`: PENDING, COMPLETED, CANCELED, REFUND_PENDING, REFUNDED
- ✅ `PaymentMethod`: CASH, CARD, STORE_CREDIT
- ✅ `PaymentStatus`: APPROVED, DECLINED, REFUNDED, PARTIALLY_REFUNDED
  - **Note**: Updated from previous diagram which had PENDING and ERROR. Current schema (prisma/schema.prisma lines 148-154) only defines the 4 values shown above.
- ✅ `RmaStatus`: INSPECTION, APPROVED_AWAITING_SHIPMENT, REJECTED, SHIPPED, COMPLETED, CLOSED
- ✅ `RefundMethod`: ORIGINAL_PAYMENT, STORE_CREDIT, MANUAL
- ✅ `B2BStatus`: PENDING, UNDER_REVIEW, VERIFIED, REJECTED
- ✅ `DiscountType`: PERCENTAGE, FIXED
- ✅ `InspectionResult`: PASS, FAIL, INCONCLUSIVE

---

### 2. Module Diagram (Module_Diagram_Updated.puml)

#### Backend Modules Verified
- ✅ Core: `server.js`, `db.js`, `supabase.js`
- ✅ Routes: All 6 route files correctly mapped
- ✅ Services: All 5 service files correctly mapped
- ✅ External Systems: PostgreSQL (Aiven), Supabase Storage, Auth0 OIDC

#### Key Routes in server.js
- ✅ `POST /api/purchase` - direct product purchase
- ✅ `POST /api/cart/checkout` - cart checkout
- ✅ `GET /api/purchases` - user purchase history with filters
- ✅ `GET /api/products` - product listing
- ✅ `POST /api/cart/add` - cart operations

---

### 3. Deployment Diagram (Deployment_Diagram_Updated.puml)

#### Container Ports Verified
- ✅ PostgreSQL: `5433:5432` (external:internal)
- ✅ Backend: `3001:3001`
- ✅ Frontend: `8000:80`

#### Docker Services Verified
- ✅ `postgres` container (postgres:15-alpine)
- ✅ `backend` container (Node.js + Express)
- ✅ `frontend` container (Nginx serving React/Vite build)
- ✅ Network: `retail-network` (bridge driver)

#### External Services Verified
- ✅ Auth0 OIDC (authentication)
- ✅ Aiven PostgreSQL (managed cloud database)
- ✅ Supabase Storage (image/document storage)

#### Environment Variables Verified
- ✅ DATABASE_URL (Aiven or local PostgreSQL)
- ✅ AUTH0_* variables (client ID, secret, issuer URL)
- ✅ SUPABASE_* variables (URL, service role key)

---

### 4. Register Sale Class Diagram (Register_Sale_Class_Diagram.puml)

#### Payment Flow Components Verified
- ✅ PaymentService with circuit breaker
- ✅ Circuit breaker thresholds:
  - Failure threshold: 5
  - Success threshold: 2
  - Timeout: 60000ms (60 seconds)
- ✅ Retry configuration:
  - Max retries: 3
  - Initial delay: 1000ms
  - Backoff multiplier: 2 (exponential)

#### Three-Phase Purchase Flow Verified
- ✅ Phase 1: Stock Reservation (atomic transaction)
- ✅ Phase 2: Payment Processing (with retry)
- ✅ Phase 3: Sale Finalization (based on payment result)

#### Tax and Fee Calculations Verified
- ✅ Tax: 5% of subtotal (line 944 in server.js)
- ✅ Processing fee: 2% of subtotal (line 945 in server.js)
- ✅ All amounts in minor units (cents)

---

### 5. Admin Low Stock Alert and Filtering Sequence Diagram (NEW)

#### Search Implementation Verified
- ✅ Admin middleware: checks email in `['izahs2003@gmail.com', 'tj2286@nyu.edu']`
- ✅ Filters supported:
  - Status: single or comma-separated (e.g., "COMPLETED,PENDING")
  - Date range: startDate, endDate (ISO format)
  - Keyword: searches across multiple fields

#### Admin Search Keyword Matching
- ✅ `sale.id` (contains)
- ✅ `product.title` (case-insensitive contains)
- ✅ `buyer.email` (case-insensitive contains)
- ✅ `buyer.name` (case-insensitive contains)

#### Notes on Low Stock Alerts
- ✅ Documented that explicit low stock notification system doesn't exist yet
- ✅ Current implementation: atomic stock updates, real-time tracking
- ✅ Suggested future enhancements for automated alerts

---

### 6. Purchase with Notification Sequence Diagram (NEW)

#### Purchase Phases Verified
- ✅ Authentication via Auth0 OIDC
- ✅ Idempotency check using idempotency-key header
- ✅ User upsert on first login
- ✅ Atomic stock reservation with WHERE clause validation:
  - Product active
  - Not seller's own product
  - Sufficient stock
- ✅ Payment processing with exponential backoff
- ✅ Circuit breaker integration
- ✅ Transaction rollback on payment failure

#### Notification Status
- ✅ Documented that explicit notification service doesn't exist yet
- ✅ Current: Immediate HTTP response feedback
- ✅ Suggested future enhancements:
  - Email confirmations
  - SMS notifications
  - Push notifications for mobile
  - Event-driven architecture

---

### 7. Order Search Sequence Diagram (Updated)

#### User Search Flow Verified
- ✅ Scoped to user's own purchases (buyerId filter)
- ✅ Keyword matches: `sale.id`, `product.title`
- ✅ Filters out:
  - Sales with REFUNDED status
  - Sales with active return requests (status not CLOSED/REJECTED)
- ✅ Purpose: Show only eligible purchases for returns

#### Admin Search Flow Verified
- ✅ Global search (no buyerId filter)
- ✅ Enhanced keyword matches: `sale.id`, `product.title`, `buyer.email`, `buyer.name`
- ✅ Includes full buyer information
- ✅ No filtering of refunded/returned items
- ✅ Purpose: Admin oversight and support

#### Query Building Verified
- ✅ Dynamic Prisma where clause construction
- ✅ OR conditions for keyword matching
- ✅ Status can be single value or array
- ✅ Date range using `gte` and `lte`
- ✅ Case-insensitive search using `mode: 'insensitive'`

---

## Code References

### Key Files Analyzed
1. `backend/src/server.js` (2042 lines) - main API routes
2. `backend/src/routes/admin.dashboard.js` - admin endpoints
3. `backend/src/routes/rma.js` - RMA endpoints
4. `backend/src/services/PaymentService.js` - payment processing
5. `backend/src/services/rmaService.js` - RMA logic
6. `prisma/schema.prisma` - database models and relations
7. `docker-compose.yml` - deployment configuration

### Payment Service Configuration (PaymentService.js)
```javascript
maxRetries: 3
retryDelay: 1000ms
retryBackoffMultiplier: 2
failureThreshold: 5
successThreshold: 2
circuitTimeout: 60000ms
```

**Idempotency Mechanism**:
- **Sale-level**: Uses `idempotency-key` from request header to prevent duplicate sales
- **Payment-level**: Uses `saleId` as cache key to prevent duplicate payment processing
- PaymentService receives `idempotencyKey: sale.id` in processPayment call (server.js line 983)

### Admin Emails (⚠️ Hardcoded and Duplicated)
```javascript
['izahs2003@gmail.com', 'tj2286@nyu.edu']
```

**Maintainability Concern**: These admin emails are hardcoded and duplicated across 4 files:
- `backend/src/server.js`
- `backend/src/routes/admin.dashboard.js`
- `backend/src/routes/admin.flashsales.js`
- `backend/src/routes/rma.js`

**Recommendation**: Externalize to environment variables or database table to:
- Reduce duplication
- Prevent inconsistencies
- Enable dynamic admin management
- Improve security

---

## Consistency Verification

### Architecture Patterns
- ✅ All diagrams use Prisma ORM for database access
- ✅ Auth0 OIDC consistently shown for authentication
- ✅ Supabase Storage for file uploads
- ✅ Express.js for backend routing
- ✅ React/Vite for frontend

### Data Flow
- ✅ Frontend → API Client → Express Routes → Services → Prisma → PostgreSQL
- ✅ Consistent error handling and response formats
- ✅ Transaction boundaries clearly defined

### Naming Conventions
- ✅ Database tables use snake_case (e.g., `sale_items`, `return_requests`)
- ✅ Prisma models use PascalCase (e.g., `SaleItem`, `ReturnRequest`)
- ✅ Routes use kebab-case (e.g., `/api/admin/dashboard/purchases`)
- ✅ Services use camelCase (e.g., `processPayment`, `createReturnRequest`)

---

## Summary

**All diagrams have been verified and are consistent with the current codebase.**

### Changes Made
1. Updated all existing diagrams with current models, services, and routes
2. Created new sequence diagrams for admin filtering and purchase flow
3. Added comprehensive notes about current implementation and future enhancements
4. Documented all enum values, status flows, and configuration parameters
5. Verified all code references and implementation details

### Future Enhancements Identified
1. Low stock alert notification system
2. Email/SMS notification service for purchases
3. Seller notifications for sales
4. Real-time dashboard updates
5. Event-driven architecture for notifications

---

**Verification Completed**: ✅ All diagrams match the current codebase structure as of December 4, 2024.

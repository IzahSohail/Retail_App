# Process Refund - Complete Documentation Summary

## 📊 Documentation Overview

This document provides a comprehensive overview of the "Process Refund" use case implementation, linking all diagrams and documentation together.

---

## 🎯 Use Case Summary

**Name:** Process Refund  
**Actors:** Customer (primary), Admin (supporting)  
**System Boundary:** RetailAppSystem  
**Goal:** Enable customers to request refunds and admins to process them efficiently while tracking defective items and maintaining metrics

---

## 📝 1. Main Success Scenario (MSS)

**File:** [Process_Refund_MSS.md](./Process_Refund_MSS.md)

### The 8-Step Process

| Step | Actor | Action | System Response |
|------|-------|--------|-----------------|
| 1 | Customer | Submits refund request (orderId, productId, reason) | Creates RefundRequest with status=PENDING |
| 2 | System | Records the request | Persists via RefundRepository, links to Order |
| 3 | Admin | Reviews pending requests | Displays RefundRequest details via RefundService |
| 4 | Admin | Approves if valid | Determines refund method (CREDIT or CARD) |
| 5 | System | Processes refund | Issues Credit OR initiates card refund via RefundProcessor |
| 6 | System | If defective | Creates DefectiveItem record with defectType |
| 7 | System | Updates all records | Order→REFUNDED, Payment updated, Metrics updated |
| 8 | System | Shows updated status | Confirms to Admin, notifies Customer |

### Key Business Rules
- **30-day** refund window from purchase date
- **Immediate** store credit issuance
- **5-7 days** for card refunds
- **Automatic approval** for defective items
- **Maximum 3** pending requests per customer

---

## 🔄 2. System Sequence Diagram (SSD)

**Files:** 
- [Process_Refund_SSD.puml](./Process_Refund_SSD.puml) - PlantUML diagram
- [Process_Refund_SSD_Detailed.md](./Process_Refund_SSD_Detailed.md) - Detailed documentation

### Message Flow

```
SUBMISSION:
Customer -> RetailAppSystem: submitRefundRequest(orderId, productId, reason)
RetailAppSystem -> Customer: confirmationMessage(refundId, status="PENDING")

REVIEW:
Admin -> RetailAppSystem: getPendingRefunds()
RetailAppSystem -> Admin: refundRequestList[]

Admin -> RetailAppSystem: reviewRefundRequest(refundId)
RetailAppSystem -> Admin: refundDetails(...)

APPROVAL PATH 1 - CREDIT:
Admin -> RetailAppSystem: approveRefund(refundId, method="CREDIT")
RetailAppSystem -> RetailAppSystem: validateRefundRequest(refundId)
RetailAppSystem -> RetailAppSystem: issueCredit(customerId, amount)
RetailAppSystem -> RetailAppSystem: updateOrderStatus(orderId, "REFUNDED")
RetailAppSystem -> RetailAppSystem: updateMetrics(...)
RetailAppSystem -> Admin: showUpdatedRefundStatus(refundId, "APPROVED")
RetailAppSystem -> Customer: refundNotification(method="CREDIT", amount)

APPROVAL PATH 2 - CARD:
Admin -> RetailAppSystem: approveRefund(refundId, method="CARD")
[Similar flow with processCardRefund instead of issueCredit]

APPROVAL PATH 3 - DEFECTIVE:
Admin -> RetailAppSystem: markDefective(refundId, defectType, description)
RetailAppSystem -> RetailAppSystem: createDefectiveRecord(...)
RetailAppSystem -> RetailAppSystem: issueCredit(...)
[Continues with updates and notifications]

DENIAL PATH:
Admin -> RetailAppSystem: denyRefund(refundId, reason)
[Updates status and notifies]
```

### Key Characteristics
- **Synchronous** operations for request submission and approval
- **Asynchronous** card refund processing (external gateway)
- **Internal operations** shown for completeness
- **Audit trail** maintained via MonitoringService

---

## 🏗️ 3. Class Diagram

**File:** [Process_Refund_Class_Diagram.puml](./Process_Refund_Class_Diagram.puml)

### Architecture Layers

#### Layer 1: Controllers (Presentation)
```
RefundController
├── submitRefundRequest(orderId, productId, reason): RefundRequest
├── getPendingRefunds(): List<RefundRequest>
├── reviewRefundRequest(refundId): RefundDetails
├── approveRefund(refundId, method): Result
├── markDefective(refundId, defectType, description): Result
├── denyRefund(refundId, reason): Result
└── checkRefundStatus(refundId): RefundStatus

AdminController
├── showRefundDashboard(): DashboardView
└── showUpdatedRefundStatus(refundId): RefundStatusView
```

#### Layer 2: Services (Business Logic)
```
RefundService (Orchestrator)
├── Uses: RefundRepository, OrderRepository, PaymentService
├── Uses: CreditService, DefectiveItemRepository, MetricsService
└── Methods: createRefundRequest, processRefund, validateRefundRequest

RefundProcessor (Executor)
├── Uses: PaymentGateway, CreditSystem
└── Methods: processCredit, processCardRefund, validateRefundEligibility

PaymentService
└── Methods: getPaymentByOrderId, processRefund, updatePaymentStatus

CreditService
└── Methods: issueCredit, getCreditBalance, updateCreditBalance

MetricsService
└── Methods: updateMetrics, getRefundMetrics, trackRefundApproval

MonitoringService
└── Methods: logRefundActivity, generateAuditTrail
```

#### Layer 3: Domain Models
```
Order (1) ←→ (0..*) RefundRequest
Order (1) ←→ (1) Payment
RefundRequest (1) ←→ (0..1) DefectiveItem
RefundRequest (1) ←→ (0..1) Credit
RefundRequest (1) ←→ (0..1) RefundTransaction
Payment (1) ←→ (0..*) RefundTransaction

RefundRequest
├── refundId: Long
├── orderId: Long
├── customerId: Long
├── productId: Long
├── reason: String
├── amount: decimal
├── status: RefundStatus {PENDING, APPROVED, APPROVED_DEFECTIVE, DENIED}
├── method: RefundMethod {CREDIT, CARD}
└── Methods: approve(), deny(), markAsDefective()

DefectiveItem
├── defectiveId: Long
├── productId: Long
├── orderId: Long
├── refundId: Long
├── defectType: String
├── description: String
└── reportedDate: DateTime

Credit
├── creditId: Long
├── customerId: Long
├── amount: decimal
├── balance: decimal
├── refundId: Long
└── Methods: apply(), getAvailableBalance()
```

#### Layer 4: Repositories (Data Access)
```
RefundRepository
├── save(refund): RefundRequest
├── findById(refundId): RefundRequest
├── findByStatus(status): List<RefundRequest>
└── update(refund): void

[Similar interfaces for Order, Payment, Credit, DefectiveItem, Metrics]
```

### Key Design Patterns
- **Repository Pattern:** Data access abstraction
- **Service Layer Pattern:** Business logic isolation
- **Dependency Injection:** Loose coupling between layers
- **Facade Pattern:** RefundService orchestrates multiple services

---

## 🐳 4. Deployment Diagram

**File:** [Process_Refund_Deployment_Diagram.puml](./Process_Refund_Deployment_Diagram.puml)

### Physical Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Docker Host (macOS)                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  Docker Network: retail-network (bridge)              │  │
│  │                                                        │  │
│  │  ┌──────────────────────┐  ┌──────────────────────┐  │  │
│  │  │ Frontend Container   │  │ Backend Container    │  │  │
│  │  │ ├─ Nginx (Port 80)   │  │ ├─ Node.js 20        │  │  │
│  │  │ └─ Static Files      │  │ ├─ Express (3001)    │  │  │
│  │  │                      │  │ ├─ RefundController  │  │  │
│  │  │                      │  │ ├─ RefundService     │  │  │
│  │  │                      │  │ ├─ Prisma ORM        │  │  │
│  │  │                      │  │ └─ Volume mounted    │  │  │
│  │  └──────────────────────┘  └──────────────────────┘  │  │
│  │             │                         │               │  │
│  │             └─────────API calls───────┘               │  │
│  │                                       │               │  │
│  │  ┌──────────────────────────────────────────────┐    │  │
│  │  │ Docker Volume: frontend_build                 │    │  │
│  │  │ (Shared between frontend-build and backend)   │    │  │
│  │  └──────────────────────────────────────────────┘    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  External Connections:                                      │
│  ├─→ Aiven PostgreSQL (Port 19447, SSL)                    │
│  ├─→ Auth0 (HTTPS, OAuth 2.0)                              │
│  ├─→ Supabase Storage (HTTPS)                              │
│  └─→ Payment Gateway (HTTPS, Card Refunds)                 │
└─────────────────────────────────────────────────────────────┘

Client Browser
├─→ Frontend Container (Port 3000, HTTP)
└─→ Backend Container (Port 3001, HTTP REST API)
```

### Container Details

**Frontend Container:**
- **Base Image:** node:20-alpine (build stage)
- **Runtime:** Nginx or served by backend
- **Build Tool:** Vite 5.4.11
- **Output:** Static HTML/CSS/JS files
- **Volume:** Outputs to `frontend_build` volume

**Backend Container:**
- **Base Image:** node:20-alpine
- **Runtime:** Node.js v20.19.5
- **Framework:** Express.js
- **ORM:** Prisma 6.19.0
- **Port:** 3001
- **Environment:** NODE_ENV=production
- **Healthcheck:** `wget http://localhost:3001/api/greet`
- **Entrypoint:**
  1. Regenerate Prisma Client
  2. Run database migrations
  3. Check frontend build
  4. Start server with `npm run dev`

**Database (Aiven Cloud):**
- **Type:** PostgreSQL
- **Host:** pg-mmedcon-finance25.d.aivencloud.com
- **Port:** 19447
- **Database:** retail_app_clean
- **SSL:** Required
- **Tables:** orders, refund_requests, payments, credits, defective_items, metrics

### Docker Configuration

**docker-compose-vite.yml:**
```yaml
services:
  backend:
    build: {context: ., dockerfile: backend/Dockerfile.vite}
    ports: ["3001:3001"]
    volumes:
      - ./backend/src:/app/src
      - ./prisma:/app/prisma
      - frontend_build:/app/frontend_build
    depends_on: [frontend-build]
    
  frontend-build:
    build: {context: ./frontend, dockerfile: Dockerfile.build}
    volumes: [frontend_build:/app/build]

volumes:
  frontend_build:
```

### Network Communication

1. **Browser → Frontend:** HTTP on port 3000
2. **Browser → Backend:** HTTP REST API on port 3001
3. **Frontend → Backend:** Internal API calls via /api/*
4. **Backend → Database:** PostgreSQL protocol, SSL, port 19447
5. **Backend → Auth0:** HTTPS, OAuth 2.0 authentication
6. **Backend → Supabase:** HTTPS, REST API for image storage
7. **Backend → Payment Gateway:** HTTPS, card refund processing

---

## 🔗 How Everything Connects

### From MSS to SSD
- **MSS Step 1** (Customer submits) → **SSD Message:** `submitRefundRequest(orderId, productId, reason)`
- **MSS Step 3** (Admin reviews) → **SSD Message:** `reviewRefundRequest(refundId)`
- **MSS Step 5** (System processes) → **SSD Messages:** `approveRefund()` or `markDefective()`
- **MSS Step 7** (Updates records) → **SSD Messages:** `updateOrderStatus()`, `updateMetrics()`
- **MSS Step 8** (Shows status) → **SSD Message:** `showUpdatedRefundStatus()`

### From SSD to Class Diagram
- **SSD Message:** `submitRefundRequest()` → **Class:** `RefundController.submitRefundRequest()`
- **SSD Message:** `approveRefund()` → **Class:** `RefundService.processRefund()` → `RefundProcessor.processCredit()`
- **SSD Message:** `markDefective()` → **Class:** `RefundService.recordDefectiveItem()` → `DefectiveItemRepository.save()`
- **SSD Message:** `updateMetrics()` → **Class:** `MetricsService.updateMetrics()`
- **SSD Internal:** System operations → **Classes:** Service layer methods

### From Class Diagram to Deployment
- **RefundController** → Runs in **Backend Container** (Node.js/Express)
- **RefundService/RefundProcessor** → **Backend Container** business logic
- **RefundRepository** → Connects to **Aiven PostgreSQL** via Prisma
- **MonitoringService** → Logs to external monitoring (optional)
- **Frontend Components** → Built by **Frontend Container**, served from volume

### From Deployment to Code
- **Backend Container** → File: `backend/src/server.js`
- **RefundController** → File: `backend/src/routes/rma.js`
- **RefundService** → File: `backend/src/services/rmaService.js`
- **Database Schema** → File: `prisma/schema.prisma`
- **Frontend Component** → File: `frontend/src/components/ReturnRefunds.jsx`
- **Docker Config** → File: `docker-compose-vite.yml`

---

## 📊 Traceability Matrix

| Requirement | MSS Step | SSD Message | Class | Code File | Test |
|-------------|----------|-------------|-------|-----------|------|
| Submit refund | Step 1 | submitRefundRequest() | RefundController.submitRefundRequest() | routes/rma.js | - |
| Record request | Step 2 | - | RefundRepository.save() | db.js | - |
| Review request | Step 3 | reviewRefundRequest() | RefundService.getRefundDetails() | services/rmaService.js | - |
| Approve refund | Step 4-5 | approveRefund() | RefundService.processRefund() | services/rmaService.js | - |
| Issue credit | Step 5a | - | CreditService.issueCredit() | (planned) | - |
| Process card refund | Step 5b | - | RefundProcessor.processCardRefund() | (planned) | - |
| Mark defective | Step 6 | markDefective() | DefectiveItemRepository.save() | services/rmaService.js | - |
| Update metrics | Step 7 | updateMetrics() | MetricsService.updateMetrics() | (planned) | - |
| Show status | Step 8 | showUpdatedRefundStatus() | AdminController.showUpdatedRefundStatus() | routes/admin.dashboard.js | - |

---

## ✅ Completeness Checklist

### Documentation ✅
- [x] Main Success Scenario (MSS) - 8 steps
- [x] Alternative flows (3)
- [x] Exception flows (4)
- [x] Business rules documented
- [x] System Sequence Diagram (PlantUML)
- [x] SSD detailed documentation
- [x] Class Diagram with all layers
- [x] Deployment Diagram with Docker
- [x] Traceability matrix
- [x] Index and navigation

### Naming Consistency ✅
- [x] RefundRequest (not RefundRequest/refundRequest variation)
- [x] Order, Payment, Credit, DefectiveItem
- [x] RefundService, RefundProcessor
- [x] orderId, refundId, customerId (camelCase)
- [x] PENDING, APPROVED, DENIED (enum values)
- [x] RetailAppSystem (system boundary)

### Architecture ✅
- [x] Layered: Controllers → Services → Repositories
- [x] Domain models defined
- [x] Associations documented (1-to-many, etc.)
- [x] Docker deployment shown
- [x] External services included

### Implementation Alignment 🟡
- [x] Backend routes exist (rma.js)
- [x] Services exist (rmaService.js)
- [ ] Credit system implementation (planned)
- [ ] Metrics system implementation (planned)
- [ ] Frontend refund component (ReturnRefunds.jsx exists)

---

## 📚 Quick Reference

### View Diagrams
```bash
# PlantUML online
http://www.plantuml.com/plantuml/uml/

# VS Code extension
code --install-extension jebbs.plantuml
```

### Run Application
```bash
# Docker
./docker-run.sh

# Access
http://localhost:3001
```

### Key Files
- **MSS:** `docs/UML/Process_Refund_MSS.md`
- **SSD:** `docs/UML/Process_Refund_SSD.puml`
- **Class:** `docs/UML/Process_Refund_Class_Diagram.puml`
- **Deployment:** `docs/UML/Process_Refund_Deployment_Diagram.puml`
- **Index:** `docs/UML/README.md`
- **Main Docs:** `docs/README.md`

---

*This summary provides a complete overview of the Process Refund use case documentation. All diagrams use consistent naming and terminology as specified in the problem statement.*

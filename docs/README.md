# Retail App - Documentation Hub

Welcome to the comprehensive documentation for the Retail App project. This hub provides access to all technical documentation, architectural decisions, and UML diagrams.

---

## 📚 Documentation Structure

```
docs/
├── README.md (this file)
├── UML/
│   ├── README.md - UML Diagrams Index
│   ├── Process_Refund_MSS.md - Refund Main Success Scenario
│   ├── Process_Refund_SSD.puml - System Sequence Diagram
│   ├── Process_Refund_SSD_Detailed.md - SSD Documentation
│   ├── Process_Refund_Class_Diagram.puml - Class Structure
│   └── Process_Refund_Deployment_Diagram.puml - Deployment Architecture
└── ADRs/
    └── (Architecture Decision Records)
```

---

## 🚀 Quick Start

1. **Setup:** [Main README](../readme.md)
2. **Docker:** [Docker Quick Start](../DOCKER_QUICKSTART.md)
3. **API:** [Backend Routes](../backend/src/routes/)
4. **Frontend:** [React Components](../frontend/src/components/)

---

## 📊 UML Documentation

### Process Refund Use Case

Complete documentation for the refund management system:

#### 1. [Main Success Scenario (MSS)](./UML/Process_Refund_MSS.md)
**8-Step Refund Process:**
1. Customer submits refund request
2. System records request as PENDING
3. Admin reviews the request  
4. Admin approves if valid
5. System issues credit OR card refund
6. If defective, system records DefectiveItem
7. System updates all records (Order, Payment, Metrics)
8. System shows updated status

**Alternative Flows:**
- Invalid/Denied requests
- Partial refunds
- Payment processing failures

**Exception Flows:**
- Order not found
- Refund window expired
- Session timeouts
- System errors

#### 2. [System Sequence Diagram (SSD)](./UML/Process_Refund_SSD.puml)
**Actors:**
- Customer
- Admin
- RetailAppSystem (System Boundary)

**Key Messages:**
```
Customer -> System: submitRefundRequest(orderId, productId, reason)
Admin -> System: reviewRefundRequest(refundId)
Admin -> System: approveRefund(refundId, method="CREDIT"|"CARD")
Admin -> System: markDefective(refundId, defectType, description)
System -> System: updateMetrics(type)
System -> Admin: showUpdatedRefundStatus(refundId, status)
```

[View Detailed SSD Documentation](./UML/Process_Refund_SSD_Detailed.md)

#### 3. [Class Diagram](./UML/Process_Refund_Class_Diagram.puml)
**Layered Architecture:**

**Controllers (Presentation):**
- RefundController
- AdminController

**Services (Business Logic):**
- RefundService
- RefundProcessor
- PaymentService
- CreditService
- MetricsService
- MonitoringService

**Domain Models:**
- Order (1 ↔ 0..* RefundRequest)
- RefundRequest
- Payment (1 ↔ 1 Order)
- Credit
- DefectiveItem
- RefundTransaction
- MetricsRecord

**Repositories (Data Access):**
- RefundRepository
- OrderRepository
- PaymentRepository
- CreditRepository
- DefectiveItemRepository
- MetricsRepository

#### 4. [Deployment Diagram](./UML/Process_Refund_Deployment_Diagram.puml)
**Docker Components:**

```
┌─────────────────────────────────────────────┐
│  Client Browser                             │
│  └── React App (Vite)                       │
└─────────────────────────────────────────────┘
              ↓ HTTP/HTTPS
┌─────────────────────────────────────────────┐
│  Frontend Container (Port 3000)             │
│  └── Nginx + Static Assets                  │
└─────────────────────────────────────────────┘
              ↓ API Calls
┌─────────────────────────────────────────────┐
│  Backend Container (Port 3001)              │
│  ├── Node.js 20 + Express                   │
│  ├── RefundController/Services              │
│  ├── Prisma ORM                             │
│  └── Volume: /app/frontend_build            │
└─────────────────────────────────────────────┘
              ↓ PostgreSQL Protocol
┌─────────────────────────────────────────────┐
│  Database Container (Aiven Cloud)           │
│  └── PostgreSQL (Port 19447, SSL)           │
│      ├── orders                             │
│      ├── refund_requests                    │
│      ├── payments                           │
│      ├── credits                            │
│      ├── defective_items                    │
│      └── metrics                            │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│  External Services                          │
│  ├── Auth0 (Authentication)                 │
│  ├── Supabase (Image Storage)               │
│  └── Payment Gateway (Card Refunds)         │
└─────────────────────────────────────────────┘
```

---

## 🏗️ Architecture Overview

### System Boundary
**RetailAppSystem** encompasses:
- Frontend (React + Vite)
- Backend (Node.js + Express)
- Database (PostgreSQL via Prisma)
- Business Logic Services
- Refund Processing System

### Key Components

| Component | Technology | Port | Purpose |
|-----------|-----------|------|---------|
| Frontend | React 18 + Vite | 3000 | User interface |
| Backend | Node.js 20 + Express | 3001 | API server |
| Database | PostgreSQL (Aiven) | 19447 | Data persistence |
| Auth | Auth0 | - | Authentication |
| Storage | Supabase | - | Image storage |
| ORM | Prisma 6.19.0 | - | Database access |

### Data Flow

```
Customer Request
      ↓
RefundController (validates input)
      ↓
RefundService (business logic)
      ↓
RefundProcessor (processes refund)
      ↓
RefundRepository (data persistence)
      ↓
PostgreSQL Database
      ↓
MetricsService (analytics)
      ↓
MonitoringService (audit logs)
```

---

## 🗄️ Database Schema

### Core Tables

**orders**
- orderId (PK)
- customerId (FK)
- orderDate
- totalAmount
- status (PENDING, COMPLETED, REFUNDED)

**refund_requests**
- refundId (PK)
- orderId (FK)
- customerId (FK)
- productId (FK)
- reason
- amount
- status (PENDING, APPROVED, APPROVED_DEFECTIVE, DENIED)
- method (CREDIT, CARD)
- requestDate
- processedDate

**payments**
- paymentId (PK)
- orderId (FK)
- amount
- paymentMethod
- transactionId
- status

**credits**
- creditId (PK)
- customerId (FK)
- amount
- balance
- refundId (FK)
- issuedDate
- expiryDate

**defective_items**
- defectiveId (PK)
- productId (FK)
- orderId (FK)
- refundId (FK)
- defectType
- description
- reportedDate
- status

**metrics**
- metricId (PK)
- metricType
- value
- timestamp
- refundId (FK)

[View Complete Schema](../prisma/schema.prisma)

---

## 🔌 API Endpoints

### Refund Management

```
POST   /api/refunds                    - Submit refund request
GET    /api/refunds                    - Get all refunds (admin)
GET    /api/refunds/pending            - Get pending refunds (admin)
GET    /api/refunds/:refundId          - Get refund details
PUT    /api/refunds/:refundId/approve  - Approve refund
PUT    /api/refunds/:refundId/deny     - Deny refund
POST   /api/refunds/:refundId/defective - Mark as defective
GET    /api/refunds/metrics            - Get refund metrics (admin)
```

### Orders & Payments

```
GET    /api/orders                     - Get user orders
GET    /api/orders/:orderId            - Get order details
GET    /api/payments/:paymentId        - Get payment details
```

### Credits

```
GET    /api/credits                    - Get user credits
POST   /api/credits/apply              - Apply credit to order
```

[View Backend Routes](../backend/src/routes/)

---

## 🎨 Frontend Components

### Customer-Facing
- `ProductsList.jsx` - Browse products
- `Cart.jsx` - Shopping cart
- `Checkout.jsx` - Payment processing
- `UserListings.jsx` - View orders
- **`ReturnRefunds.jsx`** - Submit refund requests
- `ViewProfile.jsx` - User profile

### Admin-Facing
- `AdminPanel.jsx` - Admin dashboard
- `CreateFlashSale.jsx` - Flash sale management
- Refund review interface (planned)

[View Frontend Components](../frontend/src/components/)

---

## 🐳 Docker Setup

### Quick Commands

```bash
# Start application
./docker-run.sh

# Or manually
docker-compose -f docker-compose-vite.yml up -d --build

# View logs
docker-compose -f docker-compose-vite.yml logs -f backend

# Stop application
docker-compose -f docker-compose-vite.yml down
```

### Configuration Files
- `docker-compose-vite.yml` - Main compose configuration
- `backend/Dockerfile.vite` - Backend container
- `frontend/Dockerfile.build` - Frontend build container

[Complete Docker Guide](../DOCKER_README.md)

---

## 📋 Business Rules

### Refund Eligibility
- **BR-R1:** Refunds must be requested within 30 days of purchase
- **BR-R2:** Items must be in resalable condition (unless defective)
- **BR-R3:** Maximum 3 pending refund requests per customer
- **BR-R4:** Card refunds take 5-7 business days
- **BR-R5:** Store credits issued immediately

### Refund Methods
- **CREDIT:** Immediate store credit to customer account
- **CARD:** Refund to original payment method (5-7 days)

### Defective Items
- **BR-D1:** Defective items automatically approved for refund
- **BR-D2:** Defect type and description required
- **BR-D3:** Defective items tracked for quality metrics
- **BR-D4:** Multiple defects on same product trigger review

---

## 🔐 Security & Monitoring

### Authentication
- Auth0 OAuth 2.0 for user authentication
- Role-based access control (Customer, Admin, B2B)
- Secure session management

### Audit Trail
- All refund actions logged with:
  - Timestamp
  - User ID (Admin)
  - Action taken (approve/deny/defective)
  - RefundRequest details
  - IP address (optional)

### Monitoring
- MetricsService tracks:
  - Total refunds
  - Approval/denial rates
  - Defective item trends
  - Processing times
  - Customer refund history

---

## 🧪 Testing

### Test Files
```
tests/
├── unit/
│   ├── payment.test.js
│   └── priceCalculation.test.js
├── integration/
│   └── cart.test.js
├── performance/
│   └── high-volume-upload.test.js
└── concurrency/
    └── run-concurrency-test.js
```

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
npm run test:integration

# Performance tests
npm run test:performance
```

---

## 📖 Additional Resources

### External Documentation
- [Prisma Docs](https://www.prisma.io/docs)
- [Express.js](https://expressjs.com/)
- [React](https://react.dev/)
- [Vite](https://vitejs.dev/)
- [Docker](https://docs.docker.com/)

### PlantUML Resources
- [PlantUML Online](http://www.plantuml.com/plantuml/uml/)
- [PlantUML Language Reference](https://plantuml.com/guide)
- [VS Code PlantUML Extension](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml)

---

## 🤝 Contributing

When adding documentation:

1. Follow existing naming conventions
2. Update relevant index files (this README)
3. Add links between related documents
4. Include diagrams where helpful
5. Keep documentation in sync with code
6. Review and test all examples

---

## 📝 Document Status

| Document | Status | Last Updated |
|----------|--------|--------------|
| Process Refund MSS | ✅ Complete | Nov 13, 2025 |
| Process Refund SSD | ✅ Complete | Nov 13, 2025 |
| Class Diagram | ✅ Complete | Nov 13, 2025 |
| Deployment Diagram | ✅ Complete | Nov 13, 2025 |
| API Documentation | 🟡 In Progress | - |
| Testing Guide | 🟡 In Progress | - |
| ADRs | 🟡 In Progress | - |

Legend: ✅ Complete | 🟡 In Progress | ⏳ Planned | ❌ Outdated

---

## 🆘 Need Help?

- **Setup Issues:** See [DOCKER_README.md](../DOCKER_README.md)
- **API Questions:** Check [backend/src/routes/](../backend/src/routes/)
- **Frontend:** Review [frontend/src/components/](../frontend/src/components/)
- **Database:** See [prisma/schema.prisma](../prisma/schema.prisma)
- **General:** Refer to [main README](../readme.md)

---

*Last Updated: November 13, 2025*  
*Maintained by: Development Team*

# Retail App Documentation Index

## 📋 Table of Contents

### 1. Project Overview
- [README.md](../../readme.md) - Project introduction and setup instructions
- [ADRs](../ADRs/) - Architecture Decision Records

### 2. Docker & Deployment
- [Docker README](../../DOCKER_README.md) - Comprehensive Docker setup guide
- [Docker Quick Start](../../DOCKER_QUICKSTART.md) - Quick reference commands
- [Docker Guide](../../DOCKER_GUIDE.md) - Detailed Docker documentation

### 3. UML Diagrams - Process Refund Use Case

#### 3.1 Main Success Scenario (MSS)
- **File:** [Process_Refund_MSS.md](./Process_Refund_MSS.md)
- **Description:** Complete use case documentation with:
  - 8-step main success scenario
  - Alternative flows (invalid request, partial refund, payment failure)
  - Exception flows (order not found, expired window, system errors)
  - Business rules and special requirements

#### 3.2 System Sequence Diagram (SSD)
- **PlantUML File:** [Process_Refund_SSD.puml](./Process_Refund_SSD.puml)
- **Detailed Documentation:** [Process_Refund_SSD_Detailed.md](./Process_Refund_SSD_Detailed.md)
- **Description:** Shows interactions between actors (Customer, Admin) and System (RetailAppSystem)
- **Key Messages:**
  - `submitRefundRequest(orderId, productId, reason)`
  - `reviewRefundRequest(refundId)`
  - `approveRefund(refundId, method)`
  - `markDefective(refundId, defectType, description)`
  - `updateMetrics(type)`
  - `showUpdatedRefundStatus(refundId)`

#### 3.3 Class Diagram
- **PlantUML File:** [Process_Refund_Class_Diagram.puml](./Process_Refund_Class_Diagram.puml)
- **Description:** Complete class structure showing:
  - **Controllers:** RefundController, AdminController
  - **Services:** RefundService, RefundProcessor, PaymentService, CreditService, MetricsService, MonitoringService
  - **Domain Models:** Order, RefundRequest, Payment, Credit, DefectiveItem, RefundTransaction
  - **Repositories:** RefundRepository, OrderRepository, DefectiveItemRepository, PaymentRepository, CreditRepository, MetricsRepository
  - **Layering:** Controllers → Services → Repositories → Database

#### 3.4 Deployment Diagram
- **PlantUML File:** [Process_Refund_Deployment_Diagram.puml](./Process_Refund_Deployment_Diagram.puml)
- **Description:** Dockerized system architecture showing:
  - Frontend Container (Nginx serving React/Vite build)
  - Backend Container (Node.js + Express on port 3001)
  - Database Container (Aiven PostgreSQL cloud)
  - Docker Volume (frontend_build)
  - Docker Network (retail-network)
  - External Services (Auth0, Supabase, Payment Gateway)

### 3. Other UML Diagrams
- [Process_Refund_Complete_Summary.md](./Process_Refund_Complete_Summary.md) - **Complete overview connecting all diagrams**
- [SSD_Business_Verification_Checkpoint2.png](./SSD_Business_Verification_Checkpoint2.png.crdownload) - Business verification sequence diagram

### 5. Database Schema
- [Prisma Schema](../../prisma/schema.prisma) - Complete database schema with all models

### 6. API Documentation
- Backend routes located in: [backend/src/routes/](../../backend/src/routes/)
  - `rma.js` - Refund/RMA endpoints
  - `admin.dashboard.js` - Admin dashboard endpoints
  - `pricing.js` - Pricing and cart endpoints
  - `verification.js` - Verification endpoints
  - `business.js` - B2B business endpoints

### 7. Frontend Components
- Components located in: [frontend/src/components/](../../frontend/src/components/)
  - `ReturnRefunds.jsx` - Customer refund request interface
  - Admin components in: [frontend/src/admin/](../../frontend/src/admin/)

---

## 📊 Diagram Quick Reference

### How to View PlantUML Diagrams

1. **Online:** Copy the `.puml` file content to [PlantUML Online Server](http://www.plantuml.com/plantuml/uml/)
2. **VS Code:** Install "PlantUML" extension by jebbs
3. **Command Line:** Use PlantUML jar with: `java -jar plantuml.jar diagram.puml`

### Diagram Relationships

```
Process Refund Use Case
├── MSS (Narrative)
│   └── Describes: 8-step refund process
├── SSD (Interactions)
│   └── Shows: Customer ↔ System ↔ Admin messages
├── Class Diagram (Structure)
│   └── Shows: Classes, attributes, methods, associations
└── Deployment Diagram (Physical Architecture)
    └── Shows: Containers, networks, external services
```

---

## 🗂️ Directory Structure

```
docs/
├── UML/
│   ├── README.md (this file)
│   ├── Process_Refund_MSS.md
│   ├── Process_Refund_SSD.puml
│   ├── Process_Refund_SSD_Detailed.md
│   ├── Process_Refund_Class_Diagram.puml
│   ├── Process_Refund_Deployment_Diagram.puml
│   └── SSD_Business_Verification_Checkpoint2.png.crdownload
└── ADRs/
    └── (Architecture Decision Records)
```

---

## 🔑 Key Concepts

### Refund Process Flow

1. **Customer submits** refund request via `ReturnRefunds.jsx`
2. **System records** as RefundRequest with status=PENDING
3. **Admin reviews** via Admin Dashboard
4. **Admin approves** with method (CREDIT or CARD)
5. **System processes** refund via RefundProcessor
6. **If defective**, system creates DefectiveItem record
7. **System updates** Order, Payment, RefundRequest, Metrics
8. **System shows** updated status to Admin and Customer

### Entity Relationships

- **Order** (1) ←→ (0..*) **RefundRequest**: One order can have multiple refund requests
- **Order** (1) ←→ (1) **Payment**: One order has one payment
- **RefundRequest** (1) ←→ (0..1) **DefectiveItem**: Refund may be for defective item
- **RefundRequest** (1) ←→ (0..1) **Credit**: Refund may result in store credit
- **RefundRequest** (1) ←→ (0..1) **RefundTransaction**: Refund may have card transaction
- **Payment** (1) ←→ (0..*) **RefundTransaction**: Payment can be refunded multiple times (partial)

### Layered Architecture

```
┌─────────────────────────────────────────┐
│  Presentation Layer                     │
│  - RefundController                     │
│  - AdminController                      │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Business Logic Layer                   │
│  - RefundService                        │
│  - RefundProcessor                      │
│  - PaymentService                       │
│  - CreditService                        │
│  - MetricsService                       │
│  - MonitoringService                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Data Access Layer                      │
│  - RefundRepository                     │
│  - OrderRepository                      │
│  - PaymentRepository                    │
│  - CreditRepository                     │
│  - DefectiveItemRepository              │
│  - MetricsRepository                    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│  Database Layer                         │
│  - PostgreSQL (Aiven Cloud)             │
│  - Tables: orders, refund_requests,     │
│    payments, credits, defective_items   │
└─────────────────────────────────────────┘
```

---

## 📝 Naming Conventions

### Consistent Terminology

| Concept | Class/Entity Name | Variable Name | Route Name |
|---------|------------------|---------------|------------|
| Refund Request | RefundRequest | refundRequest, refundId | /api/refunds |
| Order | Order | order, orderId | /api/orders |
| Payment | Payment | payment, paymentId | /api/payments |
| Credit | Credit | credit, creditId | /api/credits |
| Defective Item | DefectiveItem | defectiveItem, defectiveId | /api/defective |
| Customer | Customer/User | customer, customerId | /api/users |
| Admin | Admin | admin, adminId | /api/admin |

### Status Enums

- **RefundStatus:** PENDING, APPROVED, APPROVED_DEFECTIVE, DENIED, PROCESSING_FAILED
- **OrderStatus:** PENDING, COMPLETED, REFUNDED, PARTIALLY_REFUNDED, CANCELLED
- **RefundMethod:** CREDIT, CARD

---

## 🚀 Quick Links

- [Start Docker](../../DOCKER_QUICKSTART.md#-start-application)
- [View Logs](../../DOCKER_README.md#view-logs)
- [Database Schema](../../prisma/schema.prisma)
- [Backend Routes](../../backend/src/routes/)
- [Frontend Components](../../frontend/src/components/)

---

## 📞 Documentation Maintenance

- **Last Updated:** November 13, 2025
- **Maintained By:** Development Team
- **Review Cycle:** End of each sprint
- **Feedback:** Submit issues to repository

---

## ✅ Checklist for New Diagrams

When adding new UML diagrams:

- [ ] Create PlantUML `.puml` file
- [ ] Add detailed Markdown documentation
- [ ] Update this README.md index
- [ ] Link from relevant code files
- [ ] Verify diagram renders correctly
- [ ] Add to version control
- [ ] Update related documentation

---

*For questions or clarifications, refer to the [main README](../../readme.md) or contact the development team.*

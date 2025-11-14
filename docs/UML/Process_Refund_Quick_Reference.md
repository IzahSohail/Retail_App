# Process Refund - Quick Reference Card

## 📋 At a Glance

**Use Case:** Process Refund  
**System:** RetailAppSystem  
**Actors:** Customer (primary), Admin (supporting)  
**Goal:** Enable refund processing with defective item tracking

---

## 🎯 Main Flow (8 Steps)

```
1. Customer submits refund request
   ↓
2. System records as PENDING
   ↓
3. Admin reviews request
   ↓
4. Admin approves if valid
   ↓
5. System issues CREDIT or CARD refund
   ↓
6. If defective → create DefectiveItem record
   ↓
7. System updates all records
   ↓
8. System shows updated status
```

---

## 💬 Key Messages (SSD)

```javascript
// Customer Actions
submitRefundRequest(orderId, productId, reason)
checkRefundStatus(refundId)

// Admin Actions
getPendingRefunds()
reviewRefundRequest(refundId)
approveRefund(refundId, method="CREDIT"|"CARD")
markDefective(refundId, defectType, description)
denyRefund(refundId, reason)

// System Responses
showUpdatedRefundStatus(refundId, status)
updateMetrics(type)
```

---

## 🏗️ Architecture Layers

```
┌─────────────────────────────────┐
│  Controllers                    │
│  - RefundController             │
│  - AdminController              │
└─────────────────────────────────┘
         ↓ uses
┌─────────────────────────────────┐
│  Services                       │
│  - RefundService                │
│  - RefundProcessor              │
│  - PaymentService               │
│  - CreditService                │
│  - MetricsService               │
└─────────────────────────────────┘
         ↓ uses
┌─────────────────────────────────┐
│  Repositories                   │
│  - RefundRepository             │
│  - OrderRepository              │
│  - DefectiveItemRepository      │
└─────────────────────────────────┘
         ↓ persists
┌─────────────────────────────────┐
│  Database (PostgreSQL)          │
│  - refund_requests              │
│  - orders                       │
│  - payments                     │
│  - credits                      │
│  - defective_items              │
└─────────────────────────────────┘
```

---

## 🗂️ Domain Models

```
Order (1) ←→ (0..*) RefundRequest
Order (1) ←→ (1) Payment
RefundRequest (1) ←→ (0..1) DefectiveItem
RefundRequest (1) ←→ (0..1) Credit
```

### RefundRequest
- refundId, orderId, customerId, productId
- reason, amount
- status: PENDING | APPROVED | APPROVED_DEFECTIVE | DENIED
- method: CREDIT | CARD

### DefectiveItem
- defectiveId, productId, orderId, refundId
- defectType, description
- reportedDate

---

## 🐳 Deployment

```
Browser
  ↓ HTTP
Frontend Container (Nginx:80)
  ↓ API
Backend Container (Node:3001)
  ↓ PostgreSQL
Database (Aiven Cloud:19447)
```

**External Services:**
- Auth0 (Authentication)
- Supabase (Image Storage)
- Payment Gateway (Card Refunds)

---

## 📁 Key Files

| Component | File Location |
|-----------|--------------|
| Routes | `backend/src/routes/rma.js` |
| Service | `backend/src/services/rmaService.js` |
| Frontend | `frontend/src/components/ReturnRefunds.jsx` |
| Schema | `prisma/schema.prisma` |
| Docker | `docker-compose-vite.yml` |

---

## 🔑 Business Rules

- ⏰ 30-day refund window
- ⚡ Immediate credit issuance
- 💳 5-7 days for card refunds
- ✅ Auto-approve defective items
- 🚫 Max 3 pending requests/customer

---

## 🚀 Quick Commands

```bash
# Start
./docker-run.sh

# View logs
docker-compose -f docker-compose-vite.yml logs -f backend

# Test API
curl http://localhost:3001/api/refunds

# Stop
docker-compose -f docker-compose-vite.yml down
```

---

## 📚 Documentation

- **MSS:** `docs/UML/Process_Refund_MSS.md`
- **SSD:** `docs/UML/Process_Refund_SSD.puml`
- **Class:** `docs/UML/Process_Refund_Class_Diagram.puml`
- **Deployment:** `docs/UML/Process_Refund_Deployment_Diagram.puml`
- **Summary:** `docs/UML/Process_Refund_Complete_Summary.md`

---

## ✅ Status Enums

```typescript
enum RefundStatus {
  PENDING = "PENDING"
  APPROVED = "APPROVED"
  APPROVED_DEFECTIVE = "APPROVED_DEFECTIVE"
  DENIED = "DENIED"
  PROCESSING_FAILED = "PROCESSING_FAILED"
}

enum RefundMethod {
  CREDIT = "CREDIT"
  CARD = "CARD"
}

enum OrderStatus {
  PENDING = "PENDING"
  COMPLETED = "COMPLETED"
  REFUNDED = "REFUNDED"
  PARTIALLY_REFUNDED = "PARTIALLY_REFUNDED"
  CANCELLED = "CANCELLED"
}
```

---

*Quick Reference Card - Print or keep handy!*  
*Last Updated: November 13, 2025*

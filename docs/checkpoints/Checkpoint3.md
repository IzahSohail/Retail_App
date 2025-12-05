# 🧪 Checkpoint 3 - Testing Guide

## 📋 Overview

This document provides comprehensive instructions for running all test suites in the Retail App project. The testing framework covers unit tests, integration tests, performance tests, concurrency tests, and specialized flash sale surge tests.

---

## 🏗️ Test Architecture

### **Test Categories:**
1. **Unit Tests** - Core business logic validation
2. **Integration Tests** - End-to-end workflow testing
3. **Performance Tests** - Scalability and throughput validation
4. **Concurrency Tests** - Race condition and stock integrity testing
5. **Flash Sales Surge Tests** - High-load scenario validation

### **Technology Stack:**
- **Test Framework:** Jest
- **HTTP Testing:** Supertest & Axios
- **Database:** Prisma ORM with PostgreSQL
- **Performance Monitoring:** Custom metrics collection
- **Load Generation:** Concurrent promise execution

---

## 🚀 Quick Start Commands

### **Prerequisites:**
```bash
# 1. Ensure Docker is running
docker --version

# 2. Start the application stack
cd /Users/tereza/Downloads/Retail_App-checkpoint3
docker compose up --build

# 3. Verify services are running
curl http://localhost:3001/api/greet
curl http://localhost:8000
```

### **Run All Tests:**
```bash
# Run complete test suite
npm test

# Run specific test categories
npm run test:cart          # Integration tests
npm run test:performance   # Performance tests
npm run test:flashsales    # Flash sale surge tests
```

---

## 🔬 Unit Tests

### **Payment Service Tests**
**File:** `tests/unit/payment.test.js`  
**Purpose:** Validates payment processing logic, retry mechanisms, and error handling

```bash
# Run payment tests
npx jest tests/unit/payment.test.js

# Run with verbose output
npx jest tests/unit/payment.test.js --verbose
```

**Test Coverage:**
- ✅ Successful payment processing
- ✅ Payment failure scenarios
- ✅ Retry logic validation
- ✅ Idempotency key enforcement
- ✅ Network error handling

**Expected Results:**
```
Payment Service Unit Tests
  ✓ should process payment successfully
  ✓ should handle payment failures gracefully
  ✓ should retry failed payments
  ✓ should enforce idempotency keys
  ✓ should handle network errors

Tests: 5 passed, 5 total
```

### **Price Calculation Tests**
**File:** `tests/unit/priceCalculation.test.js`  
**Purpose:** Validates business logic for purchase totals, tax, and fee calculations

```bash
# Run price calculation tests
npx jest tests/unit/priceCalculation.test.js
```

**Test Coverage:**
- ✅ Single item calculations (tax 5%, fees 2%)
- ✅ Multiple item scenarios
- ✅ Edge cases (zero quantity, high amounts)
- ✅ Rounding logic validation

**Expected Results:**
```
Price Calculation Unit Tests
  ✓ should calculate correct totals for single item
  ✓ should handle multiple items correctly
  ✓ should handle edge cases
  ✓ should round calculations properly

Tests: 4 passed, 4 total
```

---

## 🔗 Integration Tests

### **Cart Operations**
**File:** `tests/integration/cart.test.js`  
**Purpose:** End-to-end cart workflow testing

```bash
# Run cart integration tests
npm run test:cart
# OR
npx jest tests/integration/cart.test.js
```

**Test Coverage:**
- ✅ Add items to cart
- ✅ Remove items from cart
- ✅ Update quantities
- ✅ User authentication integration
- ✅ Product availability validation

**Expected Results:**
```
Cart Operations Integration Tests
  ✓ should add items to cart successfully
  ✓ should remove items from cart
  ✓ should update item quantities
  ✓ should validate product availability
  ✓ should handle authentication correctly

Tests: 5 passed, 5 total
```

---

## ⚡ Performance Tests

### **High Volume Product Upload**
**File:** `tests/performance/high-volume-upload.test.js`  
**Purpose:** Tests system performance under high concurrent upload loads

```bash
# Run performance tests
npm run test:performance
# OR
TEST_MODE=true node tests/performance/run-performance-test.js
```

**Test Configuration:**
- **Concurrent Sellers:** 5
- **Products per Seller:** 20
- **Total Products:** 100
- **Image Size:** 5MB per product
- **Target Completion:** <30 seconds
- **Max CPU Usage:** <80%

**Expected Results:**
```
🚀 High Volume Product Upload Performance Test
Configuration:
   - Concurrent Sellers: 5
   - Products per Seller: 20
   - Total Products: 100
   - Image Size: 5MB per product
   - Target Completion Time: 30s

📊 Results:
   ✓ Total Time: 24.3s (PASS)
   ✓ Success Rate: 100% (100/100)
   ✓ Average Upload Time: 1.2s per product
   ✓ Peak CPU Usage: 75% (PASS)
   ✓ Database Integrity: All products saved correctly

🎉 PERFORMANCE TEST PASSED
```

---

## 🏁 Concurrency Tests

### **Stock Management Race Conditions**
**Files:** `tests/concurrency/setup-concurrency-test.js`, `tests/concurrency/run-concurrency-test.js`  
**Purpose:** Validates atomic stock updates under concurrent purchase attempts

```bash
# 1. Setup test data
node tests/concurrency/setup-concurrency-test.js

# 2. Run concurrency test
node tests/concurrency/run-concurrency-test.js
```

**Test Scenario:**
- **Product Stock:** 5 items available
- **Concurrent Buyers:** 10 buyers
- **Expected Outcome:** Exactly 5 successful purchases, 5 failures
- **Validation:** No overselling, stock integrity maintained

**Expected Results:**
```
🧪 Starting Concurrency Integration Test

Test Setup Complete:
   Product: Apple AirPods (ID: concurrency-test-product)
   Initial Stock: 5
   Concurrent Requests: 10
   Expected Success: 5
   Expected Failure: 5

============================================================
 TEST RESULTS
============================================================
 ✓ Successful purchases: 5
 ✓ Failed purchases: 5
 ✓ Final stock: 0
 ✓ Stock integrity: MAINTAINED
 ✓ No overselling detected

🎉 CONCURRENCY TEST PASSED
```

---

## 🔥 Flash Sales Surge Tests

### **High-Load Flash Sale Scenarios**
**Files:** `tests/flash_sales/surge-test.js`, `tests/flash_sales/run-surge-test.js`  
**Purpose:** Tests system behavior during flash sale surges with high concurrent load

```bash
# Run flash sale surge tests
npm run test:flashsales
# OR
TEST_MODE=true node tests/flash_sales/run-surge-test.js
```

**Test Configuration:**
- **Products:** 10 flash sale items
- **Stock per Product:** 100 items
- **Concurrent Buyers:** 50
- **Discount:** 50% off
- **Max Latency Target:** 5000ms
- **Success Rate Target:** ≥95%

**Expected Results:**
```
🔥 Flash Sales Surge Test
============================================================
Testing system behavior during order surges:

📊 Test Configuration:
   - Products: 10
   - Stock per Product: 100
   - Concurrent Buyers: 50
   - Flash Sale Discount: 50%
   - Max Latency Target: 5000ms

============================================================
 FLASH SALES SURGE TEST RESULTS
============================================================

📈 Orders:
   Total Orders: 50
   Successful: 48 (96.00%)
   Failed: 2

⚡ Latency Statistics:
   Average: 1250ms
   Min: 890ms
   Max: 2100ms
   P95: 1800ms
   P99: 2050ms

✅ Performance Criteria:
   ✓ Bounded Latency (≤5000ms): PASS (max: 2100ms)
   ✓ Success Rate (≥95%): PASS (96.00%)
   ✓ Stock Integrity: PASS (0 violations)

🎉 FLASH SALES SURGE TEST PASSED
```

---

## 🛠️ Test Environment Setup

### **Backend Test Mode:**
```bash
# Start backend in test mode
cd backend
TEST_MODE=true npm run dev
```

### **Database Setup:**
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed test data (optional)
npx prisma db seed
```

### **Environment Variables:**
```bash
# Required for testing
export TEST_MODE=true
export NODE_ENV=test
export DATABASE_URL="your-test-database-url"
```

---

## 📊 Test Results Interpretation

### **Success Criteria:**

#### **Unit Tests:**
- All tests pass with 100% success rate
- Execution time <100ms per test suite
- Coverage >85% for tested components

#### **Integration Tests:**
- End-to-end workflows complete successfully
- Database state remains consistent
- Authentication and authorization work correctly

#### **Performance Tests:**
- Upload completion time <30 seconds
- CPU usage remains <80%
- Memory usage stable throughout test
- 100% success rate for uploads

#### **Concurrency Tests:**
- Zero overselling incidents
- Stock count matches expected final state
- Exactly 5 successful purchases from 10 attempts
- Database integrity maintained

#### **Flash Sale Surge Tests:**
- Success rate ≥95%
- Maximum latency ≤5000ms
- Zero stock violations
- P95 latency <2000ms for good user experience

---

## 🚨 Troubleshooting

### **Common Issues:**

#### **Backend Not Running:**
```bash
# Error: ECONNREFUSED
# Solution: Start backend first
docker compose up backend

# Verify backend is running
curl http://localhost:3001/api/greet
```

#### **Database Connection Issues:**
```bash
# Error: Can't connect to database
# Solution: Check database container
docker compose logs postgres

# Reset database if needed
docker compose down
docker compose up --build
```

#### **Test Mode Not Enabled:**
```bash
# Error: Test mode required
# Solution: Set environment variable
export TEST_MODE=true

# Or start backend with test mode
cd backend && TEST_MODE=true npm run dev
```

#### **Port Conflicts:**
```bash
# Error: Port already in use
# Solution: Stop conflicting services
lsof -ti:3001 | xargs kill -9  # Kill backend
lsof -ti:8000 | xargs kill -9  # Kill frontend
```

### **Performance Issues:**
- **Slow Tests:** Increase timeout values in test configuration
- **Memory Issues:** Reduce concurrent load or batch size
- **Database Locks:** Ensure proper cleanup between tests

---

## 📈 Continuous Integration

### **Automated Test Pipeline:**
```bash
# Full CI pipeline commands
npm install                    # Install dependencies
npx prisma generate           # Generate Prisma client
npm run test:unit             # Run unit tests
npm run test:integration      # Run integration tests  
npm run test:performance      # Run performance tests
npm run test:concurrency      # Run concurrency tests
npm run test:flashsales       # Run flash sale tests
```

### **Test Reports:**
- **Unit Tests:** Jest HTML reports in `coverage/`
- **Performance Tests:** Custom metrics logged to console
- **Load Tests:** Detailed timing and throughput analysis

---

## 🎯 Next Steps

1. **Expand Test Coverage:** Add more edge cases and error scenarios
2. **Load Testing:** Scale up to 100+ concurrent users
3. **Monitoring Integration:** Add APM tools for production testing
4. **Automated CI/CD:** Integrate with GitHub Actions or similar
5. **Stress Testing:** Test system limits and failure modes

---

*Testing Guide - Last Updated: November 15, 2025*
*For support, check logs or contact the development team*
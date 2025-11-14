# Retail_App-SE — Student Marketplace

A forward-compatible student marketplace with secure Auth (OIDC), a PostgreSQL + Prisma backend, and switchable image storage:
- v1 (Local/Dev): Supabase Storage
- v2 (Cloud): Aiven Object Storage (S3-compatible)

## Architecture

- **Auth**: Auth0 (OIDC)
- **API**: Node.js + Express
- **ORM/DB**: Prisma + PostgreSQL
- **Storage**: Supabase (local) or Aiven Object Storage (S3-compatible)
- **Jobs**: Cron for flash-sale housekeeping
- **Frontend**: React calling /api/*

## Setup

### 1) Clone the Repository

```bash
git clone <your-repo-url> Retail_App-SE
cd Retail_App-SE
```

### 2) Install Dependencies

**From repo root:**
```bash
npm install
```

This will install dependencies for both frontend and backend.

**Frontend (if needed separately):**
```bash
cd frontend
npm install --legacy-peer-deps
```

**Backend (if needed separately):**
```bash
cd backend
npm install --legacy-peer-deps

# If you plan to use Aiven Object Storage (S3-compatible):
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --legacy-peer-deps
```

### 3) Environment Setup

Create a `.env` at the repo root. Choose one of the two variants below.

**Variant A — Local (Supabase Storage)**

```env
# ---------- Database ----------
DATABASE_URL=postgres://devuser:devpassword@localhost:5432/retail_app_local

# ---------- Auth0 (OIDC) ----------
AUTH0_ISSUER_BASE_URL=https://dev-yourtenant.us.auth0.com
AUTH0_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_AUTH0_CLIENT_SECRET
APP_SESSION_SECRET=a-very-long-random-session-secret
AUTH0_BASE_URL=http://localhost:3000

# ---------- Supabase (local/dev) ----------
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_BUCKET=products

# ---------- App ----------
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
```

Note: Prefer the anon key for local dev. Do not expose service-role keys in frontend code.

**Variant B — Cloud (Aiven PostgreSQL + Aiven Object Storage)**

```env
# ---------- Aiven PostgreSQL ----------
DATABASE_URL=postgres://avnadmin:RandomPwd123!@pg-yourproject.aivencloud.com:19447/retail_app_clean?sslmode=require

# ---------- Auth0 (OIDC) ----------
AUTH0_ISSUER_BASE_URL=https://dev-yourtenant.us.auth0.com
AUTH0_CLIENT_ID=YOUR_AUTH0_CLIENT_ID
AUTH0_CLIENT_SECRET=YOUR_AUTH0_CLIENT_SECRET
APP_SESSION_SECRET=a-very-long-random-session-secret
AUTH0_BASE_URL=https://your-deployed-frontend.example.com

# ---------- Aiven Object Storage (S3-compatible) ----------
S3_ENDPOINT=https://<project-name>-<service-name>.aivencloud.com
S3_REGION=us-east-1
S3_BUCKET=products
S3_ACCESS_KEY_ID=YOUR_AIVEN_ACCESS_KEY
S3_SECRET_ACCESS_KEY=YOUR_AIVEN_SECRET
S3_FORCE_PATH_STYLE=true

# ---------- App ----------
PORT=3001
NODE_ENV=production
FRONTEND_URL=https://your-deployed-frontend.example.com
```

**Aiven S3 endpoint format:**
```
https://<project-name>-<service-name>.aivencloud.com
```

**Notes:**
- Update the backend storage integration (e.g., `utils/supabase.js` → `utils/s3.js`) to use these S3 env vars.
- Ensure the backend host can reach Aiven PostgreSQL and Object Storage (egress/firewall).

### 4) Database Setup

From the repo root (where `prisma/` lives):

```bash
npx prisma generate
npx prisma migrate dev --name init
```

For production/Aiven DB:
```bash
npx prisma migrate deploy
```

Optional: Seed the database with sample data:
```bash
cd backend && node src/seed.js
```

### 5) Run the Application

**Backend:**
```bash
cd backend
npm run dev
```

Expected logs:
```
Database connected
Sale expiration service started
Server listening at http://localhost:3001
```

Quick smoke test:
```bash
curl http://localhost:3001/api/greet
```

**Frontend:**
```bash
cd frontend
npm start
```

Or from root:
```bash
npm run dev
```

### 6) Deploy & Push (Aiven Cloud)

1. Deploy the backend (Render/Railway/Vercel/VM).
2. Set Aiven env vars in your deployment.
3. Push your code:
   ```bash
   git add .
   git commit -m "deploy: aiven storage + cloud env"
   git push origin main
   ```
4. Ensure outbound access from your backend to Aiven PostgreSQL and Aiven Object Storage.

## Testing

### Running Tests

**All tests:**
```bash
npm test
```

**Specific test suites:**
```bash
# Unit tests
npm run test:refund          # Refund validation unit tests
npm run test:cart           # Cart integration tests

# Performance tests (requires backend running with TEST_MODE=true)
npm run test:performance    # High-volume product upload test
npm run test:flashsales     # Flash sales surge test
```

### Test Types

**Unit Tests:**
- Refund validation functions (reason normalization, input sanitization, quantity validation)
- Payment processing & price calculations (currency minor units and rounding)
- Flash-sale price derivation

**Integration Tests:**
- Cart operations with mock DB (stock validation, ownership checks, checkout flow)
- Auth flow (OIDC token), product upload (mock storage)

**Performance Tests:**
- High-volume uploads (100+ concurrent sellers, connection limiting, retry logic)
- Flash-sales concurrency (50+ concurrent buyers, stock integrity, latency bounds)

**Test Configuration:**
- Performance tests require `TEST_MODE=true` and backend running
- Tests use test authentication middleware to bypass Auth0
- All tests are located in `tests/` directory

### Suggested Coverage Targets

- Unit tests: ≥ 85% for pricing/flash-sale logic
- Integration: cart + auth flows
- Performance: sustained RPS on product listing, concurrent uploads

## Project Structure

```
prisma/                          # Prisma schema and migrations
backend/
  src/
    db.js                        # Single Prisma client export
    services/
      rmaService.js              # Return/refund business logic
      PaymentService.js           # Payment processing with retry/circuit breaker
      catalogETL.js               # Catalog upload ETL pipeline
      flashSale.js                # Flash-sale domain logic
      saleExpirationService.js   # Cron job for expirations
    routes/
      rma.js                     # Return/refund API endpoints
      business.js                 # Business catalog upload
      admin.flashsales.js         # Admin endpoints
    utils/
      supabase.js                # Storage (local/dev)
      s3.js                      # Storage (Aiven S3)
    server.js                    # Express app, Auth0, routes, cron
frontend/
  src/
    components/                  # React components
    admin/                       # Admin panel
    business_panel/              # Business dashboard
tests/
  unit/                          # Unit tests
  integration/                   # Integration tests
  performance/                   # Performance tests
  flash_sales/                  # Flash sales tests
  concurrency/                   # Concurrency tests
sample_data/                     # Sample catalog files
.env.example                     # Required env vars
.gitignore                       # Excludes node_modules, .env, builds
```

## Key Features

- **Authentication**: Secure login with Auth0 (OIDC)
- **Product Management**: Upload, edit, delete listings (regular users)
- **Shopping Cart**: Add items, manage quantities, checkout
- **Business Features**: Catalog upload (CSV/JSON) and business verification
- **Admin Panel**: Business verification, flash sales management, return/refund management, audit logs
- **Flash Sales**: Time-limited discounts with admin controls
- **Returns & Refunds**: Return request workflow with admin approval, refund processing, defective item tracking
- **Store Credits**: Users can receive and use store credits for refunds
- **Payments**: Mock payment system with retry logic and circuit breaker
- **Image Storage**: Supabase (local) or Aiven Object Storage (cloud)
- **Database**: PostgreSQL with Prisma ORM
- **Role-Based Access**: USER, BUSINESS, ADMIN roles with appropriate permissions

## Usage

1. Log in with Auth0.
2. Browse products on the home page.
3. Add to cart or buy items from other students.
4. Upload your items via "List Item."
5. Business users: upload product catalogs via CSV/JSON.
6. Admins: verify businesses, manage flash sales, and process returns/refunds.
7. Complete purchase via the cart checkout flow.
8. Request returns for completed purchases.
9. On Aiven Cloud, ensure backend reachability to Aiven endpoints and use S3-compatible APIs for images.

## Troubleshooting

- **Peer-deps conflicts**: Use `--legacy-peer-deps` flag.
- **Storage switching**: Ensure only one storage module is active (supabase.js vs s3.js) and env vars match.
- **Auth callback URLs**: Align Auth0 app settings with AUTH0_BASE_URL.
- **SSL (Aiven DB)**: Keep `?sslmode=require` in DATABASE_URL.
- **Performance tests failing**: Ensure backend is running with `TEST_MODE=true`.
- **Prisma client errors**: Run `npx prisma generate` after schema changes.

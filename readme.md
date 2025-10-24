Retail_App-SE — Student Marketplace (Auth0 • PostgreSQL/Prisma • Pluggable Image Storage)
A forward-compatible student marketplace with secure Auth (OIDC), a PostgreSQL + Prisma backend, and switchable image storage:
v1 (Local/Dev): Supabase Storage
v2 (Cloud): Aiven Object Storage (S3-compatible)
Architecture (at a glance)
Auth: Auth0 (OIDC)
API: Node.js + Express
ORM/DB: Prisma + PostgreSQL
Storage: Supabase (local) or Aiven Object Storage (S3-compatible)
Jobs: Cron for flash-sale housekeeping
Frontend: Next.js/React calling /api/*
1) Clone the Repository
git clone <your-repo-url> Retail_App-SE
cd Retail_App-SE
2) Install Dependencies
Frontend
# From repo root:
cd frontend

# Install all dependencies (ignore peer-deps conflicts)
npm install --legacy-peer-deps

# Pin ajv (v8 line) if needed by your libs
npm install ajv@^8.12.0 --legacy-peer-deps

# Common extras (optional)
npm install react-router-dom@latest --legacy-peer-deps
npm install axios@latest --legacy-peer-deps
Backend
# From repo root:
cd backend

# Install all dependencies (ignore peer-deps conflicts)
npm install --legacy-peer-deps

# Backend libs (if not already present)
npm install @prisma/client express@latest cors@latest --legacy-peer-deps

# If you plan to use Aiven Object Storage (S3-compatible):
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner --legacy-peer-deps
3) Environment Setup
Create a .env at the repo root. Choose one of the two variants below.
Variant A — Local (Supabase Storage)
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
Note: Prefer the anon key for local dev. Do not expose service-role keys in frontend code.
Variant B — Cloud (Aiven PostgreSQL + Aiven Object Storage)
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
Aiven S3 endpoint format:
https://<project-name>-<service-name>.aivencloud.com
Notes:
Update the backend storage integration (e.g., utils/supabase.js → utils/s3.js) to use these S3 env vars.
Ensure the backend host can reach Aiven PostgreSQL and Object Storage (egress/firewall).
4) Database Setup
From the repo root (where prisma/ lives):
npx prisma generate
npx prisma migrate dev --name init
# For production/Aiven DB:
# npx prisma migrate deploy
5) Run the Application
Backend
cd backend
npm run dev     # or: npm start
Expected logs:
Database connected
Sale expiration service started
Server listening at http://localhost:3001
Quick smoke test:
curl http://localhost:3001/api/flash-sales/active
Frontend
cd frontend
npm run dev     # or: npm start
6) Deploy & Push (Aiven Cloud)
Deploy the backend (Render/Railway/Vercel/VM).
Set Aiven env vars in your deployment.
Push your code:
git add .
git commit -m "deploy: aiven storage + cloud env"
git push origin main
Ensure outbound access from your backend to Aiven PostgreSQL and Aiven Object Storage.
Testing
Unit Tests
Payment processing & price calculations (currency minor units and rounding)
Flash-sale price derivation
Integration Tests
Cart operations with a mock DB
Auth flow (OIDC token), product upload (mock storage)
Performance Tests
High-volume uploads (Supabase local or Aiven S3 endpoint)
Flash-sales concurrency (active selection under load)
Suggested Coverage Targets
Unit tests: ≥ 85% for pricing/flash-sale logic
Integration: cart + auth flows
Performance: sustained RPS on product listing, concurrent uploads
Project Structure (reference)
prisma/                          # Prisma schema and migrations
backend/
  src/
    db.js                        # single Prisma client export shared everywhere
    services/
      flashSale.js               # flash-sale domain logic
      saleExpirationService.js   # cron job for expirations
    routes/
      admin.flashsales.js        # admin endpoints
    utils/
      supabase.js                # storage (local/dev)
      s3.js                      # storage (Aiven S3)
    server.js                    # Express app, Auth0, routes, cron
frontend/                        # Next.js app
.env.example                     # list of required env vars
.gitignore                       # excludes node_modules, .env, builds, large binaries


Key Features

Authentication: Secure login with Auth0 (OIDC)
Product Management: Upload, edit, delete listings (regular users)
Shopping Cart: Add items, manage quantities, checkout (mock)
Business Features: Catalog upload (CSV/JSON) and business verification
Admin Panel: Business verification, flash sales management, audit logs
Flash Sales: Time-limited discounts with admin controls
Payments: Mock payment system
Image Storage: Supabase (local) or Aiven Object Storage (cloud)
Database: PostgreSQL with Prisma ORM

Usage

Log in with Auth0.
Browse products on the home page.
Add to cart or buy items from other students.
Upload your items via “List Item.”
Business users: upload product catalogs via CSV/JSON.
Admins: verify businesses and manage flash sales.
Complete purchase via the cart checkout flow.
On Aiven Cloud, ensure backend reachability to Aiven endpoints and use S3-compatible APIs for images.

Troubleshooting (quick)

Peer-deps conflicts: use --legacy-peer-deps.
Storage switching: ensure only one storage module is active (supabase.js vs s3.js) and env vars match.
Auth callback URLs: align Auth0 app settings with AUTH0_BASE_URL.
SSL (Aiven DB): keep ?sslmode=require in DATABASE_URL.

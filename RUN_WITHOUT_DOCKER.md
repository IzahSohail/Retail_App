# 🚀 Run Retail App Without Docker

Complete guide to run the frontend and backend locally without Docker.

## 📋 Prerequisites

- Node.js (v16 or higher)
- npm
- PostgreSQL database (you have Aiven cloud DB configured in .env)

---

## ⚡ Quick Start (Copy-Paste)

### **Terminal 1: Backend Setup & Start**

```bash
# Navigate to project
cd /Users/tereza/Downloads/Retail_App-checkpoint3

# Install backend dependencies
npm install --prefix backend

# Install frontend dependencies
npm install --prefix frontend --legacy-peer-deps

# Generate Prisma client
npx prisma generate --schema=prisma/schema.prisma

# Fix migration issue (if PaymentMethod already exists)
npx prisma migrate resolve --applied 20251104205928_add_refund_return_system --schema=prisma/schema.prisma

# Deploy remaining migrations
npx prisma migrate deploy --schema=prisma/schema.prisma

# (Optional) Seed database with sample data
node backend/src/seed.js

# Start backend server
npm --prefix backend run dev
```

**Backend will be available at:** http://localhost:3001

---

### **Terminal 2: Frontend Start**

Open a **NEW terminal window** and run:

```bash
# Navigate to project
cd /Users/tereza/Downloads/Retail_App-checkpoint3

# Start frontend development server
npm --prefix frontend start
```

**Frontend will be available at:** http://localhost:3000

---

## 🎯 Alternative: Start with Test Mode (Bypass Auth0)

If you want to test without Auth0 authentication:

### **Terminal 1: Backend with Test Mode**

```bash
cd /Users/tereza/Downloads/Retail_App-checkpoint3

# Start backend with Auth0 bypassed
TEST_MODE=true npm --prefix backend run dev
```

### **Terminal 2: Frontend (same as before)**

```bash
cd /Users/tereza/Downloads/Retail_App-checkpoint3
npm --prefix frontend start
```

---

## 📝 Step-by-Step Breakdown

### **1. Install Dependencies**

```bash
# Backend dependencies
npm install --prefix backend

# Frontend dependencies (with legacy peer deps to avoid conflicts)
npm install --prefix frontend --legacy-peer-deps
```

### **2. Setup Database**

```bash
# Generate Prisma client (required before running backend)
npx prisma generate --schema=prisma/schema.prisma

# Apply database migrations
npx prisma migrate deploy --schema=prisma/schema.prisma
```

**If you get "PaymentMethod already exists" error:**

```bash
# Mark the migration as already applied
npx prisma migrate resolve --applied 20251104205928_add_refund_return_system --schema=prisma/schema.prisma

# Then deploy remaining migrations
npx prisma migrate deploy --schema=prisma/schema.prisma
```

### **3. Seed Database (Optional)**

```bash
# Add sample data to database
node backend/src/seed.js
```

### **4. Start Backend**

```bash
# Normal mode (with Auth0)
npm --prefix backend run dev

# OR Test mode (bypass Auth0)
TEST_MODE=true npm --prefix backend run dev
```

### **5. Start Frontend**

```bash
# In a new terminal
npm --prefix frontend start
```

---

## 🌐 Access Points

- **Frontend:** http://localhost:3000
- **Backend API:** http://localhost:3001
- **Database:** Configured via DATABASE_URL in .env (Aiven cloud)

---

## 🛠️ Useful Commands

### View Database with Prisma Studio

```bash
npx prisma studio --schema=prisma/schema.prisma
```

Opens a web UI at http://localhost:5555 to view/edit database.

### Reset Database (⚠️ Deletes All Data)

```bash
npx prisma migrate reset --schema=prisma/schema.prisma --force
npx prisma generate --schema=prisma/schema.prisma
node backend/src/seed.js
```

### Check Backend Health

```bash
# Test if backend is running
curl http://localhost:3001/

# Test RMA endpoint
curl http://localhost:3001/api/rma
```

### Reinstall Frontend Dependencies (if errors occur)

```bash
rm -rf frontend/node_modules
npm install --prefix frontend --legacy-peer-deps
```

---

## 🛑 Stop the Application

Press `Ctrl + C` in each terminal to stop the servers.

---

## 🐛 Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend

# Kill the process
kill -9 <PID>
```

### Prisma Client Not Found

```bash
npx prisma generate --schema=prisma/schema.prisma
```

### Frontend Build Errors (AJV/React-Scripts)

```bash
npm install --prefix frontend --legacy-peer-deps
```

### Database Connection Error

Check your `.env` file has the correct `DATABASE_URL`:

```env
DATABASE_URL="postgres://avnadmin:PASSWORD@HOST:PORT/DATABASE?sslmode=require"
```

### Auth0 Errors

If you see "secret is required" or Auth0 errors, either:
1. Set all Auth0 variables in `.env`, OR
2. Run backend with `TEST_MODE=true npm --prefix backend run dev`

---

## 📦 What Each Command Does

| Command | Purpose |
|---------|---------|
| `npm install --prefix backend` | Installs backend Node.js dependencies |
| `npm install --prefix frontend --legacy-peer-deps` | Installs frontend dependencies (avoids peer dep conflicts) |
| `npx prisma generate` | Creates Prisma client from schema |
| `npx prisma migrate deploy` | Applies database migrations |
| `node backend/src/seed.js` | Populates database with sample data |
| `npm --prefix backend run dev` | Starts backend with nodemon (auto-reload) |
| `npm --prefix frontend start` | Starts React development server |

---

## 🎉 You're Done!

Your retail app is now running without Docker:
- ✅ Backend: http://localhost:3001
- ✅ Frontend: http://localhost:3000
- ✅ Database: Connected via Aiven cloud

Happy coding! 🚀

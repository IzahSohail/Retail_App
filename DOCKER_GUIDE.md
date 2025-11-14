# 🐳 Docker Setup - Retail App

Complete Docker setup for the Retail App with frontend (React), backend (Node.js + Express), and PostgreSQL database.

## 📋 Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (comes with Docker Desktop)

## 🚀 Quick Start (2 Steps)

### Step 1: Make Sure .env is Configured

Your `.env` file should already have:
- Aiven PostgreSQL connection (DATABASE_URL)
- Auth0 credentials
- Supabase credentials for image uploads

### Step 2: Start Everything with One Command

```bash
./docker-start.sh
```

Or manually:

```bash
# Build frontend
docker-compose build frontend-build

# Start backend (serves both API and frontend)
docker-compose up backend
```

This will:
- Build the frontend with Vite
- Run database migrations automatically
- Start backend server on port 3001
- Backend serves frontend static files

### Step 3: Access the Application

- **Application:** http://localhost:3001 (both frontend and API)
- **Database:** Your Aiven cloud PostgreSQL (already configured)

---

## 📝 Detailed Commands

### First Time Setup

```bash
# 1. Copy environment template
cp .env.example .env

# 2. Generate secrets for .env
openssl rand -base64 32  # Use for AUTH0_SECRET
openssl rand -base64 32  # Use for APP_SESSION_SECRET

# 3. Edit .env with your values
nano .env  # or use your preferred editor

# 4. Build and start (with logs)
docker-compose up --build
```

### Subsequent Runs

```bash
# Start all services
docker-compose up

# Start in background (detached mode)
docker-compose up -d

# Stop all services
docker-compose down

# Stop and remove all data (including database)
docker-compose down -v
```

### View Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### Database Operations

```bash
# Seed the database
docker-compose exec backend node src/seed.js

# Run Prisma Studio (database GUI)
docker-compose exec backend npx prisma studio --schema=./prisma/schema.prisma --browser none
# Then open: http://localhost:5555

# Run migrations manually (done automatically on startup)
docker-compose exec backend npx prisma migrate deploy --schema=./prisma/schema.prisma

# Check database connection
docker-compose exec backend node -e "import('@prisma/client').then(({PrismaClient})=>{const p=new PrismaClient();p.\$connect().then(()=>console.log('✅ Connected')).catch(e=>console.log('❌',e.message))})"
```

### Development Commands

```bash
# Restart a service
docker-compose restart backend

# Rebuild specific service
docker-compose up --build backend

# Shell into backend container
docker-compose exec backend sh

# Shell into postgres
docker-compose exec postgres psql -U retailuser -d retaildb

# Check running containers
docker-compose ps

# View container resource usage
docker stats
```

---

## 🧪 Testing the Setup

### Quick API Test

```bash
# Test if server is running
curl -i http://localhost:3001/api/greet

# Test products endpoint
curl -i http://localhost:3001/api/products?limit=5

# Test RMA endpoint
curl -i http://localhost:3001/api/rma

# Check frontend is being served
curl -I http://localhost:3001/
```

### Create a Test Return Request

```bash
curl -i -X POST http://localhost:3001/api/rma \
  -H "Content-Type: application/json" \
  -d '{
    "saleId": 1,
    "items": [{"productId": 1, "quantity": 1}],
    "reason": "Defective item"
  }'
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend Build (Vite)                           │
│  Container: retail-frontend-build                │
│  Builds once, outputs to shared volume           │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓ Build artifacts
┌──────────────────────────────────────────────────┐
│  Backend Server (Node.js + Express)              │
│  Container: retail-backend                       │
│  Port: 3001                                      │
│  Serves: Frontend (/) + API (/api/*)            │
└──────────────────┬───────────────────────────────┘
                   │
                   ↓ Database Queries (SSL)
┌──────────────────────────────────────────────────┐
│  Aiven PostgreSQL (Cloud)                        │
│  Connection: pg-mmedcon-finance25.aivencloud.com │
│  Port: 19447 (SSL required)                      │
└──────────────────────────────────────────────────┘
                   │
                   ↓ Image Uploads
┌──────────────────────────────────────────────────┐
│  Supabase Storage (Cloud)                        │
│  Bucket: products                                │
│  URL: gygowixdornrokpaxrwv.supabase.co          │
└──────────────────────────────────────────────────┘
```

**Key Features:**
- ✅ Single server on port 3001 (frontend + API)
- ✅ Vite build with hot module replacement in dev
- ✅ Cloud database (no local postgres container)
- ✅ Supabase for image storage
- ✅ Automatic database migrations on startup
- ✅ Shared volume for frontend build artifacts

---

## 🔧 Troubleshooting

### Port Already in Use

```bash
# Find what's using the port
lsof -i :3000  # Frontend
lsof -i :3001  # Backend
lsof -i :5432  # PostgreSQL

# Kill the process
kill -9 <PID>

# Or change ports in docker-compose.yml
```

### Prisma Client Issues

```bash
# Regenerate Prisma client
docker-compose exec backend npx prisma generate --schema=./prisma/schema.prisma

# Restart backend
docker-compose restart backend
```

### Database Connection Errors

```bash
# Check postgres is healthy
docker-compose exec postgres pg_isready -U retailuser

# Check DATABASE_URL
docker-compose exec backend printenv DATABASE_URL

# Restart postgres
docker-compose restart postgres
```

### Frontend Build Fails

```bash
# Check frontend logs
docker-compose logs frontend

# Rebuild with no cache
docker-compose build --no-cache frontend
docker-compose up frontend
```

### Complete Reset

```bash
# Stop everything
docker-compose down -v

# Remove images
docker-compose down --rmi all

# Rebuild from scratch
docker-compose up --build
```

---

## 📁 File Structure

```
Retail_App-checkpoint3/
├── docker-compose.yml          # Orchestrates all services
├── .env                         # Your environment variables
├── .env.example                 # Template for .env
├── backend/
│   ├── Dockerfile              # Backend container definition
│   ├── .dockerignore           # Files to exclude from image
│   └── src/                    # Application code
├── frontend/
│   ├── Dockerfile              # Frontend container (multi-stage)
│   ├── .dockerignore           # Files to exclude from image
│   ├── nginx.conf              # Nginx configuration for SPA
│   └── src/                    # React application code
└── prisma/
    └── schema.prisma           # Database schema
```

---

## 🔐 Environment Variables

Required variables in `.env`:

| Variable | Description | Example |
|----------|-------------|---------|
| `POSTGRES_USER` | Database username | `retailuser` |
| `POSTGRES_PASSWORD` | Database password | `retailpass` |
| `POSTGRES_DB` | Database name | `retaildb` |
| `AUTH0_SECRET` | Auth0 secret (32+ chars) | Generate with `openssl rand -base64 32` |
| `APP_SESSION_SECRET` | Session secret | Generate with `openssl rand -base64 32` |
| `TEST_MODE` | Bypass Auth0 for testing | `true` or `false` |
| `SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `SUPABASE_KEY` | Supabase anon key | Your key from Supabase |

---

## 🚀 Production Deployment

For production, consider:

1. **Use managed database** (AWS RDS, Google Cloud SQL, etc.)
2. **Add SSL/TLS** with nginx or load balancer
3. **Set NODE_ENV=production**
4. **Use secrets management** (Docker Secrets, Kubernetes Secrets)
5. **Add monitoring** (Prometheus, Datadog, etc.)
6. **Enable health checks** (already configured)
7. **Set resource limits** in docker-compose.yml

Example production docker-compose snippet:
```yaml
backend:
  deploy:
    resources:
      limits:
        cpus: '1'
        memory: 512M
```

---

## 💡 Tips

- **Volume Mounting:** Backend source is mounted for hot reload during development
- **Database Persistence:** Data persists in `postgres_data` volume even when containers stop
- **Network:** All services communicate via `retail-network` bridge network
- **Health Checks:** PostgreSQL has health checks; backend waits for healthy DB
- **Multi-stage Build:** Frontend uses multi-stage Dockerfile (Node build → Nginx serve) for smaller image

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

---

## 🆘 Need Help?

```bash
# Check all container status
docker-compose ps

# View specific service logs
docker-compose logs <service-name>

# Shell into container for debugging
docker-compose exec <service-name> sh

# Restart everything
docker-compose restart
```

Happy Dockerizing! 🐳

# 🐳 Docker Setup - Retail App (Vite Single-Server Configuration)

Complete Docker setup for Retail App with:
- **Frontend**: React + Vite (builds to static files)
- **Backend**: Node.js + Express (serves frontend + API on port 3001)
- **Database**: Aiven Cloud PostgreSQL
- **Storage**: Supabase for image uploads

## ✨ Key Features

- ✅ Single server on port 3001 (frontend + API)
- ✅ Vite for fast frontend builds
- ✅ Automatic database migrations on startup
- ✅ Hot reload for backend development
- ✅ Cloud database (no local postgres needed)
- ✅ Image uploads to Supabase
- ✅ Health checks for reliability

---

## 📋 Prerequisites

- **Docker Desktop** installed ([Download here](https://www.docker.com/products/docker-desktop))
- **`.env` file** with your credentials (should already exist)

---

## 🚀 Quick Start (2 Commands)

### 1. Test the Setup

```bash
./test-docker.sh
```

This will verify all Docker files are in place and Docker is running.

### 2. Start the Application

```bash
./docker-run.sh
```

This will:
1. Build the frontend with Vite
2. Build the backend Docker image
3. Run database migrations
4. Start the server on port 3001
5. Serve frontend static files from backend

### 3. Access the Application

🌐 **Application**: http://localhost:3001

That's it! Both frontend and backend are running on the same port.

---

## 📝 Detailed Commands

### Start Services

```bash
# Build and start all services
docker-compose -f docker-compose-vite.yml up --build

# Start in background (detached mode)
docker-compose -f docker-compose-vite.yml up -d --build

# Start without rebuilding
docker-compose -f docker-compose-vite.yml up -d
```

### Stop Services

```bash
# Stop all services
docker-compose -f docker-compose-vite.yml down

# Stop and remove volumes (careful: removes frontend build)
docker-compose -f docker-compose-vite.yml down -v
```

### View Logs

```bash
# All services
docker-compose -f docker-compose-vite.yml logs -f

# Backend only
docker-compose -f docker-compose-vite.yml logs -f backend

# Frontend build only
docker-compose -f docker-compose-vite.yml logs frontend-build
```

### Database Operations

```bash
# Seed the database with sample data
docker-compose -f docker-compose-vite.yml exec backend node src/seed.js

# Run migrations manually (done automatically on startup)
docker-compose -f docker-compose-vite.yml exec backend npx prisma migrate deploy --schema=./prisma/schema.prisma

# Open Prisma Studio (database GUI)
docker-compose -f docker-compose-vite.yml exec backend npx prisma studio --schema=./prisma/schema.prisma --browser none
# Then open: http://localhost:5555

# Check database connection
docker-compose -f docker-compose-vite.yml exec backend node -e "import('@prisma/client').then(({PrismaClient})=>{const p=new PrismaClient();p.\$connect().then(()=>console.log('✅ Connected')).catch(e=>console.log('❌',e.message))})"
```

### Development Commands

```bash
# Restart services
docker-compose -f docker-compose-vite.yml restart

# Rebuild backend only
docker-compose -f docker-compose-vite.yml up --build -d backend

# Rebuild frontend only
docker-compose -f docker-compose-vite.yml up --build frontend-build

# Shell into backend container
docker-compose -f docker-compose-vite.yml exec backend sh

# Check running containers
docker-compose -f docker-compose-vite.yml ps

# View container resource usage
docker stats
```

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend Build Container                        │
│  Name: retail-frontend-build                     │
│  - Builds React app with Vite                    │
│  - Outputs to shared volume                      │
│  - Exits after build completes                   │
└───────────────────┬──────────────────────────────┘
                    │
                    ↓ frontend_build volume
┌──────────────────────────────────────────────────┐
│  Backend Container                               │
│  Name: retail-backend                            │
│  Port: 3001                                      │
│  - Serves API at /api/*                          │
│  - Serves frontend static files at /            │
│  - Runs database migrations on startup           │
└───────────────────┬──────────────────────────────┘
                    │
                    ├→ Aiven PostgreSQL (Cloud)
                    │  - Connection via DATABASE_URL
                    │  - SSL required
                    │
                    └→ Supabase Storage (Cloud)
                       - Image uploads
                       - Bucket: products
```

---

## 🧪 Testing

### Run the Test Suite

```bash
./test-docker.sh
```

This tests:
- ✅ Docker installation
- ✅ Docker daemon running
- ✅ Docker Compose installation
- ✅ Configuration file validity
- ✅ All required files exist
- ✅ Directory structure

### Manual API Tests

```bash
# Test server is running
curl http://localhost:3001/api/greet

# Test products endpoint
curl http://localhost:3001/api/products?limit=5

# Test frontend is being served
curl -I http://localhost:3001/

# Test RMA endpoint
curl http://localhost:3001/api/rma
```

---

## 🔧 Troubleshooting

### Port 3001 Already in Use

```bash
# Find what's using the port
lsof -i :3001

# Kill the process
kill -9 <PID>

# Or change the port in docker-compose-vite.yml
```

### Docker Daemon Not Running

```bash
# Start Docker Desktop
open -a Docker

# Wait for it to start (about 10 seconds)
sleep 10

# Verify it's running
docker ps
```

### Frontend Not Showing

```bash
# Check if frontend was built
docker-compose -f docker-compose-vite.yml exec backend ls -la /app/frontend_build

# Rebuild frontend
docker-compose -f docker-compose-vite.yml up --build frontend-build

# Restart backend to pick up new build
docker-compose -f docker-compose-vite.yml restart backend

# Check logs
docker-compose -f docker-compose-vite.yml logs backend | grep frontend
```

### Database Connection Errors

```bash
# Check DATABASE_URL is set
docker-compose -f docker-compose-vite.yml exec backend printenv DATABASE_URL

# Test connection to Aiven
docker-compose -f docker-compose-vite.yml exec backend wget --spider --timeout=5 pg-mmedcon-finance25.d.aivencloud.com

# Check migration logs
docker-compose -f docker-compose-vite.yml logs backend | grep migration
```

### Image Upload Not Working

```bash
# Check Supabase credentials
docker-compose -f docker-compose-vite.yml exec backend printenv | grep SUPABASE

# Test Supabase connection
docker-compose -f docker-compose-vite.yml exec backend node -e "console.log(process.env.SUPABASE_URL)"
```

### Complete Reset

```bash
# Stop everything and remove volumes
docker-compose -f docker-compose-vite.yml down -v

# Remove all images
docker-compose -f docker-compose-vite.yml down --rmi all

# Rebuild from scratch
docker-compose -f docker-compose-vite.yml up --build
```

---

## 📁 File Structure

```
Retail_App-checkpoint3/
├── docker-compose-vite.yml     # Main Docker Compose configuration
├── docker-run.sh               # Quick start script
├── test-docker.sh              # Test suite
├── .env                        # Environment variables
│
├── backend/
│   ├── Dockerfile.vite         # Backend container definition
│   ├── .dockerignore           # Files to exclude
│   ├── package.json
│   └── src/
│       └── server.js           # Serves frontend + API
│
├── frontend/
│   ├── Dockerfile.build        # Frontend build container
│   ├── .dockerignore
│   ├── package.json
│   ├── vite.config.js          # Vite configuration
│   └── src/                    # React application
│
└── prisma/
    └── schema.prisma           # Database schema
```

---

## 🔐 Environment Variables

Your `.env` file should have:

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Aiven PostgreSQL connection string | ✅ Yes |
| `SHADOW_DATABASE_URL` | Shadow database for migrations | ⚠️  Optional |
| `AUTH0_SECRET` | Auth0 secret key | ✅ Yes |
| `AUTH0_CLIENT_ID` | Auth0 client ID | ✅ Yes |
| `AUTH0_CLIENT_SECRET` | Auth0 client secret | ✅ Yes |
| `AUTH0_ISSUER_BASE_URL` | Auth0 domain | ✅ Yes |
| `APP_SESSION_SECRET` | Session secret | ✅ Yes |
| `SUPABASE_URL` | Supabase project URL | ✅ Yes |
| `SUPABASE_KEY` | Supabase service key | ✅ Yes |
| `SUPABASE_BUCKET` | Supabase storage bucket | ⚠️  Optional (default: products) |
| `TEST_MODE` | Bypass Auth0 for testing | ⚠️  Optional (default: false) |
| `NODE_ENV` | Environment mode | ⚠️  Optional (default: production) |

---

## 💡 Development Tips

### Hot Reload

The backend source is mounted as a volume, so changes to `/backend/src` will trigger nodemon to restart automatically:

```bash
# Edit a file
vim backend/src/server.js

# Watch logs to see restart
docker-compose -f docker-compose-vite.yml logs -f backend
```

### Rebuild Frontend

If you make changes to the frontend, rebuild it:

```bash
# Rebuild frontend
docker-compose -f docker-compose-vite.yml up --build frontend-build

# Restart backend to pick up changes
docker-compose -f docker-compose-vite.yml restart backend
```

### Debug Mode

To see more detailed logs:

```bash
# Set NODE_ENV to development in docker-compose-vite.yml
# Then restart
docker-compose -f docker-compose-vite.yml restart backend
```

---

## 🚀 Production Deployment

For production:

1. **Set NODE_ENV=production** in `.env`
2. **Use secrets management** (Docker Secrets, AWS Secrets Manager, etc.)
3. **Add resource limits**:
   ```yaml
   backend:
     deploy:
       resources:
         limits:
           cpus: '1'
           memory: 512M
   ```
4. **Enable HTTPS** with a reverse proxy (nginx, traefik)
5. **Add monitoring** (Prometheus, Datadog, CloudWatch)
6. **Set up CI/CD** for automated deployments

---

## 📚 Additional Resources

- [Docker Documentation](https://docs.docker.com/)
- [Docker Compose Documentation](https://docs.docker.com/compose/)
- [Vite Documentation](https://vitejs.dev/)
- [Prisma Docker Guide](https://www.prisma.io/docs/guides/deployment/deployment-guides/deploying-to-docker)

---

## 🆘 Need Help?

```bash
# Check container status
docker-compose -f docker-compose-vite.yml ps

# View logs for debugging
docker-compose -f docker-compose-vite.yml logs -f

# Run tests
./test-docker.sh

# Restart everything
docker-compose -f docker-compose-vite.yml restart
```

Happy Dockerizing! 🐳

---

## 📝 Changelog

- **v2.0** - Migrated to Vite from Create React App
- **v2.0** - Single-server architecture (port 3001 only)
- **v2.0** - Cloud database (Aiven PostgreSQL)
- **v2.0** - Cloud storage (Supabase for images)
- **v2.0** - Improved health checks and startup scripts

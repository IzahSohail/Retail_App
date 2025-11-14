# Retail App - Docker Quick Reference

## 🚀 Start Application
```bash
./docker-run.sh
```
**OR**
```bash
docker-compose -f docker-compose-vite.yml up -d --build
```

## 🛑 Stop Application
```bash
docker-compose -f docker-compose-vite.yml down
```

## 📊 View Logs
```bash
docker-compose -f docker-compose-vite.yml logs -f backend
```

## 🗄️ Seed Database
```bash
docker-compose -f docker-compose-vite.yml exec backend node src/seed.js
```

## 🔄 Restart
```bash
docker-compose -f docker-compose-vite.yml restart
```

## 🧪 Run Tests
```bash
./test-docker.sh
```

## 🌐 Access Application
- **Application**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Prisma Studio**: Run migration command then visit http://localhost:5555

## 📖 Full Documentation
See [DOCKER_README.md](./DOCKER_README.md) for complete documentation.

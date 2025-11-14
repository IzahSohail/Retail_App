#!/bin/bash

# Docker startup script for Retail App
# This script ensures proper startup order and builds the frontend

set -e  # Exit on any error

echo "🐳 Starting Retail App with Docker..."
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop."
    exit 1
fi

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    if [ -f .env.example ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
        echo "✅ Please edit .env with your actual credentials before proceeding."
        echo "   Then run this script again."
        exit 1
    else
        echo "❌ No .env.example found. Please create .env manually."
        exit 1
    fi
fi

echo "📦 Building frontend with Vite..."
echo ""
docker-compose build frontend-build

echo ""
echo "🚀 Starting backend server..."
echo ""
docker-compose up -d backend

echo ""
echo "⏳ Waiting for backend to be ready..."
sleep 5

# Wait for backend health check
max_attempts=30
attempt=0
while [ $attempt -lt $max_attempts ]; do
    if docker-compose exec -T backend wget --quiet --tries=1 --spider http://localhost:3001/api/greet 2>/dev/null; then
        echo "✅ Backend is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start. Check logs with: docker-compose logs backend"
    exit 1
fi

echo ""
echo "🎉 Retail App is running!"
echo ""
echo "🌐 Access your application at: http://localhost:3001"
echo ""
echo "📊 Useful commands:"
echo "   View logs:           docker-compose logs -f"
echo "   View backend logs:   docker-compose logs -f backend"
echo "   Stop services:       docker-compose down"
echo "   Restart:             docker-compose restart"
echo "   Seed database:       docker-compose exec backend node src/seed.js"
echo ""
echo "Press Ctrl+C to stop watching logs..."
docker-compose logs -f backend

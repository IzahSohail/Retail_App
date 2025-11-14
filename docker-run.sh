#!/bin/bash

# Docker Run Script for Retail App (Vite + Single Server)
# This script starts the application using Docker Compose

set -e  # Exit on any error

echo "🐳 Starting Retail App with Docker (Vite Configuration)"
echo "========================================================="
echo ""

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Starting Docker Desktop..."
    open -a Docker
    echo "⏳ Waiting for Docker to start..."
    sleep 10
    
    # Check again
    if ! docker info > /dev/null 2>&1; then
        echo "❌ Docker failed to start. Please start Docker Desktop manually."
        exit 1
    fi
fi

echo "✅ Docker is running"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo "⚠️  .env file not found!"
    if [ -f .env.example ]; then
        echo "📋 Copying .env.example to .env..."
        cp .env.example .env
        echo "✅ Please edit .env with your actual credentials"
        echo "   Then run this script again."
        exit 1
    else
        echo "❌ No .env.example found. Please create .env manually."
        exit 1
    fi
fi

echo "✅ .env file found"
echo ""

# Clean up old containers if any
echo "🧹 Cleaning up old containers..."
docker-compose -f docker-compose-vite.yml down 2>/dev/null || true
echo ""

# Build and start services
echo "🏗️  Building Docker images..."
echo ""
docker-compose -f docker-compose-vite.yml build

echo ""
echo "🚀 Starting services..."
echo ""
docker-compose -f docker-compose-vite.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
sleep 10

# Check if backend is healthy
echo "🔍 Checking backend health..."
max_attempts=30
attempt=0

while [ $attempt -lt $max_attempts ]; do
    if curl -s http://localhost:3001/api/greet > /dev/null 2>&1; then
        echo "✅ Backend is ready!"
        break
    fi
    attempt=$((attempt + 1))
    echo "   Attempt $attempt/$max_attempts..."
    sleep 2
done

if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start. Check logs with:"
    echo "   docker-compose -f docker-compose-vite.yml logs backend"
    exit 1
fi

echo ""
echo "========================================================="
echo "🎉 Retail App is running!"
echo "========================================================="
echo ""
echo "🌐 Access your application:"
echo "   Application: http://localhost:3001"
echo "   API:         http://localhost:3001/api"
echo ""
echo "📊 Useful commands:"
echo "   View all logs:       docker-compose -f docker-compose-vite.yml logs -f"
echo "   View backend logs:   docker-compose -f docker-compose-vite.yml logs -f backend"
echo "   Stop services:       docker-compose -f docker-compose-vite.yml down"
echo "   Restart services:    docker-compose -f docker-compose-vite.yml restart"
echo "   Seed database:       docker-compose -f docker-compose-vite.yml exec backend node src/seed.js"
echo ""
echo "Press Ctrl+C to stop watching logs or run:"
echo "   docker-compose -f docker-compose-vite.yml logs -f"
echo ""

#!/bin/bash

echo "🐳 Starting Retail App with Docker..."
echo ""

# Build and start services
docker-compose up --build

echo ""
echo "✅ Services started!"
echo ""
echo "🌐 Access your application at: http://localhost:3001"
echo ""

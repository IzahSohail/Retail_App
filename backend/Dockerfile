# Backend Dockerfile for Retail App
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files from backend directory (context is root)
COPY backend/package*.json ./

# Install dependencies
RUN npm install

# Copy application source from backend directory
COPY backend/src ./src

# Copy prisma schema from root directory
COPY prisma ./prisma

# Generate Prisma Client (done at build time)
RUN npx prisma generate --schema=./prisma/schema.prisma

# Expose backend port
EXPOSE 3001

# Create entrypoint script that will run migrations then start the app
RUN echo '#!/bin/sh' > /entrypoint.sh && \
    echo 'echo "🔄 Running Prisma migrations..."' >> /entrypoint.sh && \
    echo 'npx prisma migrate deploy --schema=./prisma/schema.prisma' >> /entrypoint.sh && \
    echo 'echo "✅ Migrations complete!"' >> /entrypoint.sh && \
    echo 'echo "🚀 Starting server..."' >> /entrypoint.sh && \
    echo 'npm run dev' >> /entrypoint.sh && \
    chmod +x /entrypoint.sh

# Use the entrypoint script
ENTRYPOINT ["/entrypoint.sh"]

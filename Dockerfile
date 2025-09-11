# 🐳 Multi-stage Docker build for Test Automation Harness
# This Dockerfile creates an optimized production image

# ================================
# Stage 1: Builder (Development Dependencies)
# ================================
FROM node:20-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files for dependency installation
COPY package*.json ./
COPY tsconfig.json ./

# Install ALL dependencies (including devDependencies for building)
RUN npm ci --include=dev

# Copy source code
COPY src/ ./src/

# Build the TypeScript application
RUN npm run build

# ================================
# Stage 2: Production Runtime
# ================================
FROM node:20-alpine AS production

# Install security updates and required tools
RUN apk update && apk upgrade && \
    apk add --no-cache \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S testharness -u 1001

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install only production dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Copy configuration files
COPY config/ ./config/

# Create required directories
RUN mkdir -p artifacts/logs artifacts/reports artifacts/screenshots artifacts/test-results && \
    chown -R testharness:nodejs /app

# Switch to non-root user
USER testharness

# Expose the application port
EXPOSE 3000

# Health check to ensure the application is running
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Default command
CMD ["node", "dist/index.js"]

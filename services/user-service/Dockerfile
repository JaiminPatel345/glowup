# Multi-stage build for user-service
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install curl for healthchecks and openssl for Prisma
RUN apk add --no-cache curl openssl

# Copy shared package files first (for better caching)
COPY ./shared/package.json ./shared/yarn.lock* ./shared/

# Install shared dependencies first
RUN cd shared && yarn install --frozen-lockfile --network-timeout 100000

# Copy service package files
COPY ./services/user-service/package.json ./services/user-service/yarn.lock ./

# Install all dependencies (including dev dependencies) with increased timeout
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copy shared source code
COPY ./shared ./shared

#-------------------------------------------------------------
# Development stage
FROM base AS development

WORKDIR /app

# Copy source code (including prisma if it exists)
COPY ./services/user-service .

# Generate Prisma client if schema exists
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/api/v1/health || exit 1

# Start with hot reload
CMD ["yarn", "dev"]

#-------------------------------------------------------------
# Builder stage (for production build)
FROM base AS builder

WORKDIR /app

# Copy source code (including prisma if it exists)
COPY ./services/user-service .

# Generate Prisma client if schema exists
RUN if [ -f "prisma/schema.prisma" ]; then npx prisma generate; fi

# Build TypeScript
RUN yarn build

#-------------------------------------------------------------
# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Install curl for healthcheck
RUN apk add --no-cache curl

# Copy shared folder
COPY ./shared ./shared

# Copy package files
COPY ./services/user-service/package.json ./services/user-service/yarn.lock ./

# Install shared dependencies first
RUN cd shared && yarn install --frozen-lockfile

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy Prisma files if exists
COPY --from=builder /app/prisma ./prisma/
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma/

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3002/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]

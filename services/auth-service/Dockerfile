# Multi-stage build for auth-service
FROM node:20-alpine AS base

# Set working directory
WORKDIR /app

# Install curl for healthchecks
RUN apk add --no-cache curl

# Copy shared package files first (for better caching)
COPY ./shared/package.json ./shared/yarn.lock* ./shared/

# Install shared dependencies first
RUN cd shared && yarn install --frozen-lockfile --network-timeout 100000

# Copy service package files
COPY ./services/auth-service/package.json ./services/auth-service/yarn.lock ./

# Install all dependencies (including dev dependencies) with increased timeout
RUN yarn install --frozen-lockfile --network-timeout 100000

# Copy shared source code
COPY ./shared ./shared

#-------------------------------------------------------------
# Development stage
FROM base AS development

WORKDIR /app

# Copy source code for development
COPY ./services/auth-service .

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Start with hot reload
CMD ["yarn", "dev"]

#-------------------------------------------------------------
# Builder stage (for production build)
FROM base AS builder

WORKDIR /app

# Copy source code
COPY ./services/auth-service .

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
COPY ./services/auth-service/package.json ./services/auth-service/yarn.lock ./

# Install shared dependencies first
RUN cd shared && yarn install --frozen-lockfile

# Install production dependencies only
RUN yarn install --production --frozen-lockfile

# Copy built files from builder
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the service
CMD ["node", "dist/index.js"]

# Multi-stage build for API Gateway with NGINX and Node.js middleware

# Stage 1: Base middleware setup
FROM node:18-alpine AS middleware-base

WORKDIR /app

# Copy shared dependencies first
COPY ./shared/ ./shared/

# Copy middleware package files
COPY ./api-gateway/middleware/package.json ./api-gateway/middleware/yarn.lock* ./middleware/

# Install dependencies
WORKDIR /app/middleware
RUN yarn install --frozen-lockfile

#-------------------------------------------------------------
# Stage 2: Development image with NGINX
FROM nginx:alpine AS development

# Install Node.js runtime for middleware
RUN apk add --no-cache nodejs npm curl yarn

# Create app directory for middleware
WORKDIR /app/middleware

# Copy shared folder
COPY ./shared /app/shared

# Copy middleware package files and node_modules from base
COPY --from=middleware-base /app/middleware/node_modules ./node_modules
COPY --from=middleware-base /app/middleware/package.json ./

# Copy middleware source for development
COPY ./api-gateway/middleware/ ./

# Copy NGINX configuration
COPY ./api-gateway/nginx.conf /etc/nginx/nginx.conf
COPY ./api-gateway/locations.conf /etc/nginx/conf.d/locations.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /app/uploads /app/middleware/logs && \
    chown -R nginx:nginx /var/log/nginx /app/uploads /app/middleware/logs

# Create startup script for development
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting API Gateway (Development Mode)..."' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start Node.js middleware in background with hot reload' >> /start.sh && \
    echo 'echo "Starting Node.js middleware on port 3005 (hot reload enabled)..."' >> /start.sh && \
    echo 'cd /app/middleware && yarn dev &' >> /start.sh && \
    echo 'MIDDLEWARE_PID=$!' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Wait for middleware to be ready' >> /start.sh && \
    echo 'echo "Waiting for middleware to start..."' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start NGINX in foreground' >> /start.sh && \
    echo 'echo "Starting NGINX on port 80..."' >> /start.sh && \
    echo 'nginx -g "daemon off;" &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "API Gateway started successfully"' >> /start.sh && \
    echo 'echo "  - NGINX: http://localhost:80"' >> /start.sh && \
    echo 'echo "  - Middleware: http://localhost:3005 (hot reload)"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Wait for both processes' >> /start.sh && \
    echo 'wait $NGINX_PID $MIDDLEWARE_PID' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80 443 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start both NGINX and middleware
CMD ["/start.sh"]

#-------------------------------------------------------------
# Stage 3: Build Node.js middleware (for production)
FROM middleware-base AS middleware-builder

WORKDIR /app/middleware

# Copy middleware source
COPY ./api-gateway/middleware/ ./

# Build TypeScript
RUN yarn build

#-------------------------------------------------------------
# Stage 4: Production image with NGINX
FROM nginx:alpine AS production

# Install Node.js runtime for middleware
RUN apk add --no-cache nodejs npm curl

# Create app directory for middleware
WORKDIR /app/middleware

# Copy shared folder
COPY --from=middleware-builder /app/shared /app/shared

# Copy built middleware from builder stage
COPY --from=middleware-builder /app/middleware/dist ./dist
COPY --from=middleware-builder /app/middleware/node_modules ./node_modules
COPY --from=middleware-builder /app/middleware/package.json ./

# Copy NGINX configuration
COPY ./api-gateway/nginx.conf /etc/nginx/nginx.conf
COPY ./api-gateway/locations.conf /etc/nginx/conf.d/locations.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /app/uploads /app/middleware/logs && \
    chown -R nginx:nginx /var/log/nginx /app/uploads /app/middleware/logs

# Create startup script for production
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting API Gateway (Production Mode)..."' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start Node.js middleware in background' >> /start.sh && \
    echo 'echo "Starting Node.js middleware on port 3005..."' >> /start.sh && \
    echo 'cd /app/middleware && node dist/index.js &' >> /start.sh && \
    echo 'MIDDLEWARE_PID=$!' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Wait for middleware to be ready' >> /start.sh && \
    echo 'echo "Waiting for middleware to start..."' >> /start.sh && \
    echo 'sleep 3' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Start NGINX in foreground' >> /start.sh && \
    echo 'echo "Starting NGINX on port 80..."' >> /start.sh && \
    echo 'nginx -g "daemon off;" &' >> /start.sh && \
    echo 'NGINX_PID=$!' >> /start.sh && \
    echo '' >> /start.sh && \
    echo 'echo "API Gateway started successfully"' >> /start.sh && \
    echo 'echo "  - NGINX: http://localhost:80"' >> /start.sh && \
    echo 'echo "  - Middleware: http://localhost:3005"' >> /start.sh && \
    echo '' >> /start.sh && \
    echo '# Wait for both processes' >> /start.sh && \
    echo 'wait $NGINX_PID $MIDDLEWARE_PID' >> /start.sh && \
    chmod +x /start.sh

# Expose ports
EXPOSE 80 443 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Start both NGINX and middleware
CMD ["/start.sh"]

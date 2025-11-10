# Multi-stage build for API Gateway with NGINX and Node.js middleware

# Stage 1: Build Node.js middleware
FROM node:18-alpine AS middleware-builder

WORKDIR /middleware

# Copy middleware package files
COPY middleware/package.json middleware/yarn.lock* ./

# Install dependencies
RUN yarn install --production --frozen-lockfile

# Copy middleware source
COPY middleware/ ./

# Build TypeScript
RUN yarn build

# Stage 2: Final image with NGINX
FROM nginx:alpine

# Install Node.js runtime for middleware
RUN apk add --no-cache nodejs npm curl

# Create app directory for middleware
WORKDIR /app/middleware

# Copy built middleware from builder stage
COPY --from=middleware-builder /middleware/dist ./dist
COPY --from=middleware-builder /middleware/node_modules ./node_modules
COPY --from=middleware-builder /middleware/package.json ./

# Copy NGINX configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY locations.conf /etc/nginx/conf.d/locations.conf

# Create necessary directories
RUN mkdir -p /var/log/nginx /app/uploads /app/middleware/logs && \
    chown -R nginx:nginx /var/log/nginx /app/uploads /app/middleware/logs

# Create startup script
RUN echo '#!/bin/sh' > /start.sh && \
    echo 'echo "Starting API Gateway..."' >> /start.sh && \
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

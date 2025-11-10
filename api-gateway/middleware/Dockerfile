# Use Node.js 18 Alpine as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    && rm -rf /var/cache/apk/*

# Copy package files
COPY package.json yarn.lock* ./

# Install dependencies
RUN yarn install --production --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript
RUN yarn build

# Create logs directory
RUN mkdir -p logs

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S gatewayuser -u 1001

# Change ownership of app directory
RUN chown -R gatewayuser:nodejs /app

# Switch to non-root user
USER gatewayuser

# Expose port
EXPOSE 3005

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3005/health', (res) => { process.exit(res.statusCode === 200 ? 0 : 1) }).on('error', () => process.exit(1))"

# Start the application
CMD ["yarn", "start"]
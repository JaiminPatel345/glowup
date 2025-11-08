# Use official nginx image
FROM nginx:1.25-alpine

# Install additional packages
RUN apk add --no-cache \
    curl \
    openssl \
    && rm -rf /var/cache/apk/*

# Create directories
RUN mkdir -p /var/www/static \
    && mkdir -p /etc/nginx/ssl \
    && mkdir -p /etc/nginx/conf.d

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf
COPY locations.conf /etc/nginx/conf.d/locations.conf

# Generate self-signed SSL certificate for development
RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/nginx/ssl/key.pem \
    -out /etc/nginx/ssl/cert.pem \
    -subj "/C=US/ST=State/L=City/O=Organization/CN=localhost"

# Create nginx user and set permissions
RUN addgroup -g 101 -S nginx \
    && adduser -S -D -H -u 101 -h /var/cache/nginx -s /sbin/nologin -G nginx -g nginx nginx \
    && chown -R nginx:nginx /var/www/static \
    && chown -R nginx:nginx /etc/nginx/ssl

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost/health || exit 1

# Expose ports
EXPOSE 80 443

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
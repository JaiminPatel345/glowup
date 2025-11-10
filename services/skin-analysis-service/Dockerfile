# Skin Analysis Service Dockerfile with GPU detection
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (minimal set, no CUDA)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    bash \
    && rm -rf /var/lib/apt/lists/*

# Copy application code and setup script
COPY . .

# Make setup script executable
RUN chmod +x setup.sh

# Set environment variable to indicate Docker build
ENV DOCKER_BUILD=1

# Run setup script which auto-detects GPU and installs appropriate dependencies
# This will install PyTorch with CUDA only if GPU is available
RUN bash setup.sh || true

# Create necessary directories
RUN mkdir -p /app/uploads /app/models /app/logs && \
    chmod -R 755 /app

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

# Start the service
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "3003"]

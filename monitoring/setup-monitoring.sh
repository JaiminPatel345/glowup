#!/bin/bash

# GrowUp Monitoring Setup Script
# This script sets up Prometheus, Grafana, and Alertmanager for monitoring

set -e

echo "🔧 Setting up GrowUp monitoring stack..."

# Create monitoring network if it doesn't exist
docker network create growup-monitoring 2>/dev/null || true

# Create directories for persistent data
mkdir -p ./data/prometheus
mkdir -p ./data/grafana
mkdir -p ./data/alertmanager

# Set proper permissions
sudo chown -R 472:472 ./data/grafana  # Grafana user
sudo chown -R 65534:65534 ./data/prometheus  # Nobody user
sudo chown -R 65534:65534 ./data/alertmanager  # Nobody user

echo "📊 Starting Prometheus..."
docker run -d \
  --name growup-prometheus \
  --network growup-monitoring \
  -p 9090:9090 \
  -v $(pwd)/prometheus/prometheus.yml:/etc/prometheus/prometheus.yml \
  -v $(pwd)/prometheus/alert_rules.yml:/etc/prometheus/alert_rules.yml \
  -v $(pwd)/data/prometheus:/prometheus \
  --restart unless-stopped \
  prom/prometheus:latest \
  --config.file=/etc/prometheus/prometheus.yml \
  --storage.tsdb.path=/prometheus \
  --web.console.libraries=/etc/prometheus/console_libraries \
  --web.console.templates=/etc/prometheus/consoles \
  --storage.tsdb.retention.time=200h \
  --web.enable-lifecycle

echo "📈 Starting Grafana..."
docker run -d \
  --name growup-grafana \
  --network growup-monitoring \
  -p 3000:3000 \
  -v $(pwd)/data/grafana:/var/lib/grafana \
  -v $(pwd)/grafana/dashboards:/etc/grafana/provisioning/dashboards \
  -e "GF_SECURITY_ADMIN_PASSWORD=admin123" \
  -e "GF_USERS_ALLOW_SIGN_UP=false" \
  --restart unless-stopped \
  grafana/grafana:latest

echo "🚨 Starting Alertmanager..."
docker run -d \
  --name growup-alertmanager \
  --network growup-monitoring \
  -p 9093:9093 \
  -v $(pwd)/data/alertmanager:/alertmanager \
  --restart unless-stopped \
  prom/alertmanager:latest \
  --config.file=/etc/alertmanager/alertmanager.yml \
  --storage.path=/alertmanager

echo "📡 Starting Node Exporter..."
docker run -d \
  --name growup-node-exporter \
  --network growup-monitoring \
  -p 9100:9100 \
  -v "/proc:/host/proc:ro" \
  -v "/sys:/host/sys:ro" \
  -v "/:/rootfs:ro" \
  --restart unless-stopped \
  prom/node-exporter:latest \
  --path.procfs=/host/proc \
  --path.rootfs=/rootfs \
  --path.sysfs=/host/sys \
  --collector.filesystem.mount-points-exclude='^/(sys|proc|dev|host|etc)($$|/)'

echo "🐳 Starting cAdvisor..."
docker run -d \
  --name growup-cadvisor \
  --network growup-monitoring \
  -p 8080:8080 \
  -v /:/rootfs:ro \
  -v /var/run:/var/run:ro \
  -v /sys:/sys:ro \
  -v /var/lib/docker/:/var/lib/docker:ro \
  -v /dev/disk/:/dev/disk:ro \
  --privileged \
  --device=/dev/kmsg \
  --restart unless-stopped \
  gcr.io/cadvisor/cadvisor:latest

echo "🔍 Starting Redis Exporter..."
docker run -d \
  --name growup-redis-exporter \
  --network growup-monitoring \
  -p 9121:9121 \
  -e REDIS_ADDR=redis://redis:6379 \
  --restart unless-stopped \
  oliver006/redis_exporter:latest

echo "🐘 Starting PostgreSQL Exporter..."
docker run -d \
  --name growup-postgres-exporter \
  --network growup-monitoring \
  -p 9187:9187 \
  -e DATA_SOURCE_NAME="postgresql://postgres:growup_dev_password@postgres:5432/growup?sslmode=disable" \
  --restart unless-stopped \
  prometheuscommunity/postgres-exporter:latest

echo "🍃 Starting MongoDB Exporter..."
docker run -d \
  --name growup-mongodb-exporter \
  --network growup-monitoring \
  -p 9216:9216 \
  -e MONGODB_URI="mongodb://mongodb:27017" \
  --restart unless-stopped \
  percona/mongodb_exporter:latest

# Wait for services to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check if services are running
echo "🔍 Checking service status..."
services=("growup-prometheus" "growup-grafana" "growup-alertmanager" "growup-node-exporter" "growup-cadvisor" "growup-redis-exporter" "growup-postgres-exporter" "growup-mongodb-exporter")

for service in "${services[@]}"; do
  if docker ps --filter "name=$service" --filter "status=running" | grep -q "$service"; then
    echo "✅ $service is running"
  else
    echo "❌ $service failed to start"
    docker logs "$service" --tail 20
  fi
done

# Connect monitoring containers to the main application network
echo "🔗 Connecting monitoring services to application network..."
docker network connect growup-network growup-prometheus 2>/dev/null || true
docker network connect growup-network growup-redis-exporter 2>/dev/null || true
docker network connect growup-network growup-postgres-exporter 2>/dev/null || true
docker network connect growup-network growup-mongodb-exporter 2>/dev/null || true

echo "🎉 Monitoring stack setup complete!"
echo ""
echo "📊 Access URLs:"
echo "   Prometheus: http://localhost:9090"
echo "   Grafana: http://localhost:3000 (admin/admin123)"
echo "   Alertmanager: http://localhost:9093"
echo "   Node Exporter: http://localhost:9100"
echo "   cAdvisor: http://localhost:8080"
echo ""
echo "📈 To import Grafana dashboards:"
echo "   1. Open Grafana at http://localhost:3000"
echo "   2. Login with admin/admin123"
echo "   3. Go to + > Import"
echo "   4. Upload the dashboard JSON files from ./grafana/dashboards/"
echo ""
echo "🚨 To configure alerts:"
echo "   1. Edit ./prometheus/alert_rules.yml"
echo "   2. Restart Prometheus: docker restart growup-prometheus"
echo ""
echo "🔧 To stop monitoring stack:"
echo "   ./stop-monitoring.sh"
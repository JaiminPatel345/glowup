#!/bin/bash

# GrowUp Development Monitoring Setup Script
# Sets up basic monitoring and logging for development environment

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
MONITORING_DIR="${PROJECT_ROOT}/monitoring/dev"
LOGS_DIR="${PROJECT_ROOT}/logs"

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

# Create monitoring directories
setup_directories() {
    log "Setting up monitoring directories..."
    
    mkdir -p "$MONITORING_DIR"
    mkdir -p "$LOGS_DIR"
    mkdir -p "${MONITORING_DIR}/dashboards"
    mkdir -p "${MONITORING_DIR}/config"
    
    success "Created monitoring directories"
}

# Create development logging configuration
create_logging_config() {
    log "Creating development logging configuration..."
    
    cat > "${MONITORING_DIR}/config/logging.json" << 'EOF'
{
  "version": 1,
  "disable_existing_loggers": false,
  "formatters": {
    "detailed": {
      "format": "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    },
    "simple": {
      "format": "%(levelname)s - %(message)s"
    },
    "json": {
      "format": "%(asctime)s %(name)s %(levelname)s %(message)s",
      "class": "pythonjsonlogger.jsonlogger.JsonFormatter"
    }
  },
  "handlers": {
    "console": {
      "class": "logging.StreamHandler",
      "level": "INFO",
      "formatter": "simple",
      "stream": "ext://sys.stdout"
    },
    "file": {
      "class": "logging.handlers.RotatingFileHandler",
      "level": "DEBUG",
      "formatter": "detailed",
      "filename": "logs/app.log",
      "maxBytes": 10485760,
      "backupCount": 5
    },
    "error_file": {
      "class": "logging.handlers.RotatingFileHandler",
      "level": "ERROR",
      "formatter": "detailed",
      "filename": "logs/error.log",
      "maxBytes": 10485760,
      "backupCount": 5
    }
  },
  "loggers": {
    "": {
      "level": "DEBUG",
      "handlers": ["console", "file", "error_file"]
    },
    "uvicorn": {
      "level": "INFO",
      "handlers": ["console", "file"],
      "propagate": false
    },
    "fastapi": {
      "level": "INFO",
      "handlers": ["console", "file"],
      "propagate": false
    }
  }
}
EOF

    success "Created logging configuration"
}

# Create health check monitoring script
create_health_monitor() {
    log "Creating health check monitoring script..."
    
    cat > "${MONITORING_DIR}/health-check.sh" << 'EOF'
#!/bin/bash

# Development Health Check Monitor
# Checks the health of all services and logs results

# Service endpoints
SERVICES=(
    "auth-service:http://localhost:3001/api/health"
    "user-service:http://localhost:3002/api/v1/health"
    "skin-analysis:http://localhost:8001/health"
    "hair-tryon:http://localhost:8002/api/hair-tryOn/health"
)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Log file
LOG_FILE="logs/health-check.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to check service health
check_service() {
    local service_name=$1
    local endpoint=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    if curl -s -f "$endpoint" > /dev/null 2>&1; then
        echo -e "${GREEN}✓${NC} $service_name is healthy"
        echo "$timestamp - $service_name - HEALTHY" >> "$LOG_FILE"
        return 0
    else
        echo -e "${RED}✗${NC} $service_name is unhealthy"
        echo "$timestamp - $service_name - UNHEALTHY" >> "$LOG_FILE"
        return 1
    fi
}

# Main health check
echo "=== GrowUp Services Health Check ==="
echo "Timestamp: $(date)"
echo ""

healthy_count=0
total_count=${#SERVICES[@]}

for service_info in "${SERVICES[@]}"; do
    IFS=':' read -r service_name endpoint <<< "$service_info"
    if check_service "$service_name" "$endpoint"; then
        ((healthy_count++))
    fi
done

echo ""
echo "Health Summary: $healthy_count/$total_count services healthy"

if [ $healthy_count -eq $total_count ]; then
    echo -e "${GREEN}All services are running properly${NC}"
    exit 0
else
    echo -e "${YELLOW}Some services may need attention${NC}"
    exit 1
fi
EOF

    chmod +x "${MONITORING_DIR}/health-check.sh"
    success "Created health check monitor"
}

# Create simple metrics collection script
create_metrics_collector() {
    log "Creating metrics collection script..."
    
    cat > "${MONITORING_DIR}/collect-metrics.sh" << 'EOF'
#!/bin/bash

# Development Metrics Collector
# Collects basic system and application metrics

METRICS_FILE="logs/metrics.log"
mkdir -p "$(dirname "$METRICS_FILE")"

# Function to collect system metrics
collect_system_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1)
    local memory_usage=$(free | grep Mem | awk '{printf "%.2f", $3/$2 * 100.0}')
    local disk_usage=$(df -h / | awk 'NR==2{print $5}' | cut -d'%' -f1)
    
    echo "$timestamp,system,cpu_usage,$cpu_usage" >> "$METRICS_FILE"
    echo "$timestamp,system,memory_usage,$memory_usage" >> "$METRICS_FILE"
    echo "$timestamp,system,disk_usage,$disk_usage" >> "$METRICS_FILE"
}

# Function to collect application metrics
collect_app_metrics() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    # Check if services are running and collect basic metrics
    local services=("auth-service:3001" "user-service:3002" "skin-analysis:8001" "hair-tryon:8002")
    
    for service_info in "${services[@]}"; do
        IFS=':' read -r service_name port <<< "$service_info"
        
        if netstat -tuln | grep ":$port " > /dev/null 2>&1; then
            echo "$timestamp,$service_name,status,running" >> "$METRICS_FILE"
            
            # Try to get response time
            local response_time=$(curl -o /dev/null -s -w '%{time_total}' "http://localhost:$port" 2>/dev/null || echo "0")
            echo "$timestamp,$service_name,response_time,$response_time" >> "$METRICS_FILE"
        else
            echo "$timestamp,$service_name,status,stopped" >> "$METRICS_FILE"
        fi
    done
}

# Main metrics collection
echo "Collecting metrics at $(date)"
collect_system_metrics
collect_app_metrics

# Keep only last 1000 lines to prevent log file from growing too large
tail -n 1000 "$METRICS_FILE" > "${METRICS_FILE}.tmp" && mv "${METRICS_FILE}.tmp" "$METRICS_FILE"

echo "Metrics collected and saved to $METRICS_FILE"
EOF

    chmod +x "${MONITORING_DIR}/collect-metrics.sh"
    success "Created metrics collector"
}

# Create log aggregation script
create_log_aggregator() {
    log "Creating log aggregation script..."
    
    cat > "${MONITORING_DIR}/aggregate-logs.sh" << 'EOF'
#!/bin/bash

# Development Log Aggregator
# Aggregates logs from all services for easier debugging

AGGREGATED_LOG="logs/aggregated.log"
mkdir -p "$(dirname "$AGGREGATED_LOG")"

# Service log locations
LOG_SOURCES=(
    "auth-service:services/auth-service/logs/*.log"
    "user-service:services/user-service/logs/*.log"
    "skin-analysis:services/skin-analysis-service/logs/*.log"
    "hair-tryon:services/hair-tryOn-service/logs/*.log"
    "api-gateway:api-gateway/logs/*.log"
)

# Function to aggregate logs with service prefix
aggregate_logs() {
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "=== Log Aggregation Started at $timestamp ===" >> "$AGGREGATED_LOG"
    
    for log_source in "${LOG_SOURCES[@]}"; do
        IFS=':' read -r service_name log_pattern <<< "$log_source"
        
        echo "--- $service_name logs ---" >> "$AGGREGATED_LOG"
        
        # Find and process log files
        for log_file in $log_pattern; do
            if [ -f "$log_file" ]; then
                echo "Processing: $log_file" >&2
                # Add service prefix to each log line
                sed "s/^/[$service_name] /" "$log_file" >> "$AGGREGATED_LOG"
            fi
        done
        
        echo "" >> "$AGGREGATED_LOG"
    done
    
    echo "=== Log Aggregation Completed ===" >> "$AGGREGATED_LOG"
    echo ""
}

# Function to show recent errors
show_recent_errors() {
    echo "Recent errors from all services:"
    echo "================================"
    
    # Look for ERROR, WARN, or exception patterns in recent logs
    if [ -f "$AGGREGATED_LOG" ]; then
        tail -n 500 "$AGGREGATED_LOG" | grep -i -E "(error|warn|exception|failed)" | tail -n 20
    else
        echo "No aggregated logs found. Run log aggregation first."
    fi
}

# Parse command line arguments
case "${1:-aggregate}" in
    "aggregate")
        echo "Aggregating logs from all services..."
        aggregate_logs
        echo "Logs aggregated to: $AGGREGATED_LOG"
        ;;
    "errors")
        show_recent_errors
        ;;
    "tail")
        if [ -f "$AGGREGATED_LOG" ]; then
            tail -f "$AGGREGATED_LOG"
        else
            echo "No aggregated logs found. Run 'aggregate' first."
        fi
        ;;
    *)
        echo "Usage: $0 [aggregate|errors|tail]"
        echo "  aggregate - Aggregate all service logs"
        echo "  errors    - Show recent errors"
        echo "  tail      - Follow aggregated log file"
        ;;
esac
EOF

    chmod +x "${MONITORING_DIR}/aggregate-logs.sh"
    success "Created log aggregator"
}

# Create development dashboard
create_dev_dashboard() {
    log "Creating development dashboard..."
    
    cat > "${MONITORING_DIR}/dashboards/dev-dashboard.html" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GrowUp Development Dashboard</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
        }
        .card {
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .service-status {
            display: flex;
            align-items: center;
            margin: 10px 0;
        }
        .status-indicator {
            width: 12px;
            height: 12px;
            border-radius: 50%;
            margin-right: 10px;
        }
        .status-healthy { background: #27ae60; }
        .status-unhealthy { background: #e74c3c; }
        .status-unknown { background: #95a5a6; }
        .refresh-btn {
            background: #3498db;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
        }
        .refresh-btn:hover {
            background: #2980b9;
        }
        .log-output {
            background: #2c3e50;
            color: #ecf0f1;
            padding: 15px;
            border-radius: 4px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            max-height: 300px;
            overflow-y: auto;
        }
        .metric {
            display: flex;
            justify-content: space-between;
            margin: 5px 0;
            padding: 5px 0;
            border-bottom: 1px solid #ecf0f1;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GrowUp Development Dashboard</h1>
        <p>Monitor your development environment services and logs</p>
        <button class="refresh-btn" onclick="refreshAll()">Refresh All</button>
    </div>

    <div class="dashboard-grid">
        <div class="card">
            <h3>Service Health</h3>
            <div id="service-health">
                <div class="service-status">
                    <div class="status-indicator status-unknown"></div>
                    <span>Auth Service (3001)</span>
                </div>
                <div class="service-status">
                    <div class="status-indicator status-unknown"></div>
                    <span>User Service (3002)</span>
                </div>
                <div class="service-status">
                    <div class="status-indicator status-unknown"></div>
                    <span>Skin Analysis (8001)</span>
                </div>
                <div class="service-status">
                    <div class="status-indicator status-unknown"></div>
                    <span>Hair Try-On (8002)</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>System Metrics</h3>
            <div id="system-metrics">
                <div class="metric">
                    <span>CPU Usage</span>
                    <span id="cpu-usage">--</span>
                </div>
                <div class="metric">
                    <span>Memory Usage</span>
                    <span id="memory-usage">--</span>
                </div>
                <div class="metric">
                    <span>Disk Usage</span>
                    <span id="disk-usage">--</span>
                </div>
            </div>
        </div>

        <div class="card">
            <h3>Quick Actions</h3>
            <button class="refresh-btn" onclick="runHealthCheck()" style="margin: 5px;">Health Check</button>
            <button class="refresh-btn" onclick="collectMetrics()" style="margin: 5px;">Collect Metrics</button>
            <button class="refresh-btn" onclick="aggregateLogs()" style="margin: 5px;">Aggregate Logs</button>
            <button class="refresh-btn" onclick="showErrors()" style="margin: 5px;">Show Errors</button>
        </div>

        <div class="card">
            <h3>Recent Logs</h3>
            <div id="recent-logs" class="log-output">
                Click "Aggregate Logs" to view recent log entries...
            </div>
        </div>
    </div>

    <script>
        // Simulated functions for development dashboard
        // In a real implementation, these would make API calls to monitoring endpoints
        
        function refreshAll() {
            runHealthCheck();
            collectMetrics();
            updateSystemMetrics();
        }
        
        function runHealthCheck() {
            console.log('Running health check...');
            // Simulate health check results
            const services = document.querySelectorAll('.service-status .status-indicator');
            services.forEach(indicator => {
                indicator.className = 'status-indicator ' + (Math.random() > 0.2 ? 'status-healthy' : 'status-unhealthy');
            });
        }
        
        function collectMetrics() {
            console.log('Collecting metrics...');
            updateSystemMetrics();
        }
        
        function updateSystemMetrics() {
            document.getElementById('cpu-usage').textContent = (Math.random() * 100).toFixed(1) + '%';
            document.getElementById('memory-usage').textContent = (Math.random() * 100).toFixed(1) + '%';
            document.getElementById('disk-usage').textContent = (Math.random() * 100).toFixed(1) + '%';
        }
        
        function aggregateLogs() {
            const logOutput = document.getElementById('recent-logs');
            logOutput.innerHTML = `
[auth-service] 2024-01-15 10:30:15 - INFO - User login successful
[user-service] 2024-01-15 10:30:16 - INFO - Profile updated for user 123
[skin-analysis] 2024-01-15 10:30:17 - INFO - Analysis completed in 2.3s
[hair-tryon] 2024-01-15 10:30:18 - INFO - Video processing started
[api-gateway] 2024-01-15 10:30:19 - INFO - Request routed to skin-analysis
            `.trim();
        }
        
        function showErrors() {
            const logOutput = document.getElementById('recent-logs');
            logOutput.innerHTML = `
[auth-service] 2024-01-15 10:25:10 - ERROR - Database connection timeout
[skin-analysis] 2024-01-15 10:28:45 - WARN - Model inference took longer than expected
[hair-tryon] 2024-01-15 10:29:12 - ERROR - Failed to process video frame
            `.trim();
        }
        
        // Auto-refresh every 30 seconds
        setInterval(refreshAll, 30000);
        
        // Initial load
        refreshAll();
    </script>
</body>
</html>
EOF

    success "Created development dashboard"
}

# Create monitoring startup script
create_monitoring_startup() {
    log "Creating monitoring startup script..."
    
    cat > "${MONITORING_DIR}/start-monitoring.sh" << 'EOF'
#!/bin/bash

# Start Development Monitoring
# Launches all monitoring tools for development

echo "Starting GrowUp Development Monitoring..."

# Create logs directory
mkdir -p logs

# Start health check monitoring (every 5 minutes)
echo "Starting health check monitoring..."
(while true; do
    ./monitoring/dev/health-check.sh
    sleep 300
done) &

# Start metrics collection (every 2 minutes)
echo "Starting metrics collection..."
(while true; do
    ./monitoring/dev/collect-metrics.sh
    sleep 120
done) &

# Start log aggregation (every 10 minutes)
echo "Starting log aggregation..."
(while true; do
    ./monitoring/dev/aggregate-logs.sh aggregate
    sleep 600
done) &

echo "Monitoring started in background"
echo "View dashboard: open monitoring/dev/dashboards/dev-dashboard.html"
echo "Stop monitoring: pkill -f 'monitoring/dev'"

# Keep script running
wait
EOF

    chmod +x "${MONITORING_DIR}/start-monitoring.sh"
    success "Created monitoring startup script"
}

# Create monitoring stop script
create_monitoring_stop() {
    log "Creating monitoring stop script..."
    
    cat > "${MONITORING_DIR}/stop-monitoring.sh" << 'EOF'
#!/bin/bash

# Stop Development Monitoring
echo "Stopping GrowUp Development Monitoring..."

# Kill monitoring processes
pkill -f 'monitoring/dev/health-check.sh'
pkill -f 'monitoring/dev/collect-metrics.sh'
pkill -f 'monitoring/dev/aggregate-logs.sh'

echo "Monitoring stopped"
EOF

    chmod +x "${MONITORING_DIR}/stop-monitoring.sh"
    success "Created monitoring stop script"
}

# Main setup function
main() {
    log "Setting up GrowUp development monitoring..."
    
    setup_directories
    create_logging_config
    create_health_monitor
    create_metrics_collector
    create_log_aggregator
    create_dev_dashboard
    create_monitoring_startup
    create_monitoring_stop
    
    success "Development monitoring setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Run 'bash monitoring/dev/start-monitoring.sh' to start monitoring"
    echo "2. Open 'monitoring/dev/dashboards/dev-dashboard.html' in your browser"
    echo "3. Use individual scripts in monitoring/dev/ for specific tasks"
    echo ""
    echo "Available monitoring tools:"
    echo "- Health checks: monitoring/dev/health-check.sh"
    echo "- Metrics collection: monitoring/dev/collect-metrics.sh"
    echo "- Log aggregation: monitoring/dev/aggregate-logs.sh"
    echo "- Development dashboard: monitoring/dev/dashboards/dev-dashboard.html"
}

# Run main function
main "$@"
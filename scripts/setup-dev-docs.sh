#!/bin/bash

# GrowUp Development API Documentation Setup Script
# Sets up API documentation tools for development

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
DOCS_DIR="${PROJECT_ROOT}/docs/api"

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $1"
}

success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# Check if Node.js is installed
check_nodejs() {
    if ! command -v node &> /dev/null; then
        echo "Node.js is not installed. Please install Node.js 16+ to continue."
        exit 1
    fi
    
    local node_version=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$node_version" -lt 16 ]; then
        echo "Node.js version 16+ is required. Current version: $(node --version)"
        exit 1
    fi
    
    success "Node.js $(node --version) detected"
}

# Install Swagger UI tools
install_swagger_tools() {
    log "Installing Swagger UI tools..."
    
    if ! command -v swagger-ui-serve &> /dev/null; then
        npm install -g swagger-ui-serve
        success "Swagger UI serve installed globally"
    else
        log "Swagger UI serve already installed"
    fi
    
    if ! command -v redoc-cli &> /dev/null; then
        npm install -g redoc-cli
        success "Redoc CLI installed globally"
    else
        log "Redoc CLI already installed"
    fi
}

# Generate HTML documentation
generate_html_docs() {
    log "Generating HTML documentation..."
    
    local html_dir="${DOCS_DIR}/html"
    mkdir -p "$html_dir"
    
    # Generate Redoc HTML for each service
    local services=("auth-service" "user-service" "skin-analysis-service" "hair-tryon-service")
    
    for service in "${services[@]}"; do
        local openapi_file="${DOCS_DIR}/${service}-openapi.yaml"
        local html_file="${html_dir}/${service}.html"
        
        if [ -f "$openapi_file" ]; then
            log "Generating HTML for $service..."
            redoc-cli build "$openapi_file" --output "$html_file" --title "GrowUp ${service//-/ } API"
            success "Generated: $html_file"
        else
            warning "OpenAPI file not found: $openapi_file"
        fi
    done
}

# Create API documentation index
create_index_html() {
    log "Creating documentation index..."
    
    local index_file="${DOCS_DIR}/html/index.html"
    
    cat > "$index_file" << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GrowUp API Documentation</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            max-width: 1200px;
            margin: 0 auto;
            padding: 2rem;
            background: #f8f9fa;
        }
        .header {
            text-align: center;
            margin-bottom: 3rem;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .services {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 2rem;
        }
        .service-card {
            background: white;
            padding: 2rem;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        .service-card:hover {
            transform: translateY(-2px);
        }
        .service-title {
            color: #2c3e50;
            margin-bottom: 1rem;
        }
        .service-description {
            color: #7f8c8d;
            margin-bottom: 1.5rem;
        }
        .service-links {
            display: flex;
            gap: 1rem;
        }
        .btn {
            padding: 0.5rem 1rem;
            text-decoration: none;
            border-radius: 4px;
            font-weight: 500;
            transition: background-color 0.2s;
        }
        .btn-primary {
            background: #3498db;
            color: white;
        }
        .btn-primary:hover {
            background: #2980b9;
        }
        .btn-secondary {
            background: #95a5a6;
            color: white;
        }
        .btn-secondary:hover {
            background: #7f8c8d;
        }
        .footer {
            text-align: center;
            margin-top: 3rem;
            padding: 2rem;
            color: #7f8c8d;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>GrowUp API Documentation</h1>
        <p>Comprehensive API documentation for all GrowUp microservices</p>
    </div>

    <div class="services">
        <div class="service-card">
            <h2 class="service-title">Authentication Service</h2>
            <p class="service-description">User authentication, registration, and profile management</p>
            <div class="service-links">
                <a href="auth-service.html" class="btn btn-primary">View Docs</a>
                <a href="../auth-service-openapi.yaml" class="btn btn-secondary">OpenAPI Spec</a>
            </div>
        </div>

        <div class="service-card">
            <h2 class="service-title">User Service</h2>
            <p class="service-description">User profiles, preferences, and settings management</p>
            <div class="service-links">
                <a href="user-service.html" class="btn btn-primary">View Docs</a>
                <a href="../user-service-openapi.yaml" class="btn btn-secondary">OpenAPI Spec</a>
            </div>
        </div>

        <div class="service-card">
            <h2 class="service-title">Skin Analysis Service</h2>
            <p class="service-description">AI-powered skin analysis and product recommendations</p>
            <div class="service-links">
                <a href="skin-analysis-service.html" class="btn btn-primary">View Docs</a>
                <a href="../skin-analysis-service-openapi.yaml" class="btn btn-secondary">OpenAPI Spec</a>
            </div>
        </div>

        <div class="service-card">
            <h2 class="service-title">Hair Try-On Service</h2>
            <p class="service-description">Video processing and real-time hair style try-on</p>
            <div class="service-links">
                <a href="hair-tryon-service.html" class="btn btn-primary">View Docs</a>
                <a href="../hair-tryon-service-openapi.yaml" class="btn btn-secondary">OpenAPI Spec</a>
            </div>
        </div>
    </div>

    <div class="footer">
        <p>Generated for development environment • <a href="../README.md">View README</a></p>
    </div>
</body>
</html>
EOF

    success "Created documentation index: $index_file"
}

# Create development server script
create_dev_server() {
    log "Creating development documentation server script..."
    
    local server_script="${PROJECT_ROOT}/scripts/serve-docs.sh"
    
    cat > "$server_script" << 'EOF'
#!/bin/bash

# Simple HTTP server for API documentation
# Serves the generated HTML documentation on localhost

PORT=${1:-8080}
DOCS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../docs/api/html" && pwd)"

if [ ! -d "$DOCS_DIR" ]; then
    echo "Documentation not found. Run 'npm run docs:generate' first."
    exit 1
fi

echo "Starting documentation server..."
echo "Open http://localhost:$PORT in your browser"
echo "Press Ctrl+C to stop"

cd "$DOCS_DIR"

# Use Python's built-in server if available
if command -v python3 &> /dev/null; then
    python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    python -m SimpleHTTPServer $PORT
elif command -v node &> /dev/null; then
    npx http-server -p $PORT
else
    echo "No suitable HTTP server found. Please install Python or Node.js."
    exit 1
fi
EOF

    chmod +x "$server_script"
    success "Created documentation server script: $server_script"
}

# Update package.json scripts (if exists)
update_package_scripts() {
    local package_json="${PROJECT_ROOT}/package.json"
    
    if [ -f "$package_json" ]; then
        log "Adding documentation scripts to package.json..."
        
        # Create a temporary script to update package.json
        node -e "
        const fs = require('fs');
        const pkg = JSON.parse(fs.readFileSync('$package_json', 'utf8'));
        
        if (!pkg.scripts) pkg.scripts = {};
        
        pkg.scripts['docs:generate'] = 'bash scripts/setup-dev-docs.sh';
        pkg.scripts['docs:serve'] = 'bash scripts/serve-docs.sh';
        pkg.scripts['docs:open'] = 'bash scripts/serve-docs.sh & sleep 2 && open http://localhost:8080';
        
        fs.writeFileSync('$package_json', JSON.stringify(pkg, null, 2));
        console.log('Updated package.json with documentation scripts');
        "
        
        success "Added npm scripts for documentation"
    else
        log "No package.json found, skipping script updates"
    fi
}

# Main setup function
main() {
    log "Setting up GrowUp API documentation for development..."
    
    check_nodejs
    install_swagger_tools
    generate_html_docs
    create_index_html
    create_dev_server
    update_package_scripts
    
    success "API documentation setup completed!"
    echo ""
    echo "Next steps:"
    echo "1. Run 'bash scripts/serve-docs.sh' to start the documentation server"
    echo "2. Open http://localhost:8080 in your browser"
    echo "3. Or use 'npm run docs:serve' if you have package.json"
    echo ""
    echo "Documentation files are located in: docs/api/html/"
}

# Run main function
main "$@"
EOF
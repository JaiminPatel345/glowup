# GrowUp Mobile App - Setup Guide

This guide provides detailed instructions for setting up the GrowUp mobile app development environment on different platforms.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Quick Start](#quick-start)
- [Manual Setup](#manual-setup)
- [Project Structure](#project-structure)
- [Environment Configuration](#environment-configuration)
- [Database Setup](#database-setup)
- [AI Models Setup](#ai-models-setup)
- [Development Workflow](#development-workflow)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### Required Software

1. **Docker & Docker Compose**
   - **Linux**: Follow [Docker installation guide](https://docs.docker.com/engine/install/)
   - **macOS**: Install [Docker Desktop](https://docs.docker.com/desktop/mac/)
   - **Windows**: Install [Docker Desktop](https://docs.docker.com/desktop/windows/)

2. **Node.js (v18 or higher)**
   - Download from [nodejs.org](https://nodejs.org/)
   - Or use a version manager like [nvm](https://github.com/nvm-sh/nvm)

3. **Python 3.8+**
   - **Linux**: `sudo apt-get install python3 python3-pip`
   - **macOS**: `brew install python` or download from [python.org](https://python.org/)
   - **Windows**: Download from [python.org](https://python.org/)

4. **Git**
   - **Linux**: `sudo apt-get install git`
   - **macOS**: `brew install git` or use Xcode Command Line Tools
   - **Windows**: Download from [git-scm.com](https://git-scm.com/)

### Optional but Recommended

- **React Native CLI**: `yarn global add @react-native-community/cli`
- **Android Studio** (for Android development)
- **Xcode** (for iOS development, macOS only)

## Quick Start

### Linux/macOS

```bash
# Clone the repository
git clone <repository-url>
cd growup-mobile-app

# Run the setup script
chmod +x setup.sh
./setup.sh
```

### Windows

```powershell
# Clone the repository
git clone <repository-url>
cd growup-mobile-app

# Run the setup script
.\setup.ps1
```

The setup scripts will:
1. Check prerequisites
2. Create environment files
3. Set up AI model placeholders
4. Install dependencies
5. Start Docker services
6. Initialize databases
7. Verify the setup

## Manual Setup

If you prefer to set up the environment manually or the automated scripts fail:

### 1. Environment Configuration

Create a `.env` file in the root directory:

```bash
cp .env.example .env
```

Edit the `.env` file with your configuration:

```env
# Database Configuration
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=growup
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_secure_password

MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=growup

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_change_in_production
JWT_EXPIRES_IN=7d

# API Configuration
API_PORT=3000
SKIN_SERVICE_PORT=8001
HAIR_SERVICE_PORT=8002
GATEWAY_PORT=80

# External API Keys
HUGGINGFACE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
```

### 2. Install Dependencies

```bash
# Install root dependencies
yarn install

# Install service dependencies (when available)
cd services/auth-service && yarn install && cd ../..
cd services/user-service && yarn install && cd ../..

# Install Python dependencies
pip3 install -r requirements.txt
```

### 3. Start Docker Services

```bash
# Start all services
docker-compose up -d

# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### 4. Initialize Databases

```bash
# Run PostgreSQL migrations
node scripts/migrate-postgres.js

# Initialize MongoDB collections
node scripts/init-mongodb.js
```

## Project Structure

```
growup-mobile-app/
├── mobile-app/                 # React Native mobile application
├── services/                   # Backend microservices
│   ├── auth-service/          # Authentication service (Node.js)
│   ├── user-service/          # User management service (Node.js)
│   ├── skin-analysis-service/ # Skin analysis AI service (FastAPI)
│   └── hair-tryOn-service/    # Hair try-on AI service (FastAPI)
├── api-gateway/               # NGINX + Node.js API gateway
├── database/                  # Database schemas and migrations
│   ├── postgresql/           # PostgreSQL schemas and migrations
│   └── mongodb/              # MongoDB initialization scripts
├── shared/                    # Shared utilities and configurations
│   ├── database/             # Database connection utilities
│   ├── configs/              # Shared configuration files
│   └── types/                # TypeScript type definitions
├── models/                    # AI model files
├── scripts/                   # Setup and utility scripts
├── docs/                      # Documentation
├── docker-compose.yml         # Docker services configuration
├── setup.sh                   # Linux/macOS setup script
├── setup.ps1                  # Windows setup script
└── SETUP.md                   # This file
```

## Environment Configuration

### Service-Specific Environment Files

Each service has its own environment configuration:

#### Auth Service (`services/auth-service/.env`)
```env
DATABASE_URL=postgresql://postgres:password@localhost:5432/growup
JWT_SECRET=your_jwt_secret
REDIS_URL=redis://localhost:6379
PORT=3001
NODE_ENV=development
```

#### Skin Analysis Service (`services/skin-analysis-service/.env`)
```env
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=8001
ENVIRONMENT=development
LOG_LEVEL=INFO
```

#### Hair Try-On Service (`services/hair-tryOn-service/.env`)
```env
MONGODB_URI=mongodb://localhost:27017/growup
MODEL_PATH=/app/models
PORT=8002
ENVIRONMENT=development
LOG_LEVEL=INFO
WEBSOCKET_ENABLED=true
```

### Docker Environment Variables

The `docker-compose.yml` file uses environment variables from the main `.env` file to configure services.

## Database Setup

### PostgreSQL Schema

The PostgreSQL database contains:
- **users**: User accounts and authentication
- **sessions**: User sessions (Better-Auth)
- **user_preferences**: User preferences and settings
- **password_reset_tokens**: Password reset functionality
- **email_verification_tokens**: Email verification

### MongoDB Collections

The MongoDB database contains:
- **skinAnalysis**: Skin analysis results and history
- **hairTryOn**: Hair try-on processing history
- **productRecommendations**: Product recommendation cache

### Running Migrations

```bash
# PostgreSQL migrations
node scripts/migrate-postgres.js

# MongoDB initialization
node scripts/init-mongodb.js
```

## AI Models Setup

### Model Directory Structure

```
models/
├── skin_analysis_model.pkl     # Skin analysis model
├── hair_fastgan_model.pth      # HairFastGAN model
├── model_configs/              # Model configuration files
└── README.md                   # Model documentation
```

### Obtaining AI Models

1. **Skin Analysis Models**:
   - Download from Hugging Face: [skin analysis models](https://huggingface.co/models?search=skin)
   - Use pre-trained models from research papers
   - Train custom models using your dataset

2. **Hair Try-On Models**:
   - Official HairFastGAN repository
   - Pre-trained StyleGAN models
   - Custom hair segmentation models

3. **Model Integration**:
   - Place model files in the `models/` directory
   - Update service configurations to point to correct model paths
   - Ensure model compatibility with the service implementations

### Model Configuration

Update the service environment files with correct model paths:

```env
# In skin-analysis-service/.env
SKIN_MODEL_PATH=/app/models/skin_analysis_model.pkl
SKIN_MODEL_TYPE=sklearn  # or tensorflow, pytorch

# In hair-tryOn-service/.env
HAIR_MODEL_PATH=/app/models/hair_fastgan_model.pth
HAIR_MODEL_TYPE=pytorch
```

## Development Workflow

### Starting Development

1. **Start all services**:
   ```bash
   docker-compose up -d
   ```

2. **Check service health**:
   ```bash
   docker-compose ps
   curl http://localhost:3001/health  # Auth service
   curl http://localhost:8001/health  # Skin analysis service
   curl http://localhost:8002/health  # Hair try-on service
   ```

3. **View logs**:
   ```bash
   docker-compose logs -f [service-name]
   ```

### Mobile App Development

1. **Navigate to mobile app directory**:
   ```bash
   cd mobile-app
   ```

2. **Install dependencies** (when React Native project is initialized):
   ```bash
   yarn install
   ```

3. **Start Metro bundler**:
   ```bash
   npx react-native start
   ```

4. **Run on device/simulator**:
   ```bash
   # Android
   npx react-native run-android
   
   # iOS (macOS only)
   npx react-native run-ios
   ```

### Backend Service Development

Each service can be developed independently:

1. **Auth Service** (Node.js + TypeScript):
   ```bash
   cd services/auth-service
   yarn dev
   ```

2. **Skin Analysis Service** (FastAPI):
   ```bash
   cd services/skin-analysis-service
   uvicorn main:app --reload --port 8001
   ```

3. **Hair Try-On Service** (FastAPI):
   ```bash
   cd services/hair-tryOn-service
   uvicorn main:app --reload --port 8002
   ```

### Database Management

#### PostgreSQL

```bash
# Connect to PostgreSQL
docker-compose exec postgres psql -U postgres -d growup

# Run specific migration
node scripts/migrate-postgres.js

# Backup database
docker-compose exec postgres pg_dump -U postgres growup > backup.sql

# Restore database
docker-compose exec -T postgres psql -U postgres growup < backup.sql
```

#### MongoDB

```bash
# Connect to MongoDB
docker-compose exec mongodb mongosh growup

# Export collection
docker-compose exec mongodb mongoexport --db=growup --collection=skinAnalysis --out=/tmp/skinAnalysis.json

# Import collection
docker-compose exec mongodb mongoimport --db=growup --collection=skinAnalysis --file=/tmp/skinAnalysis.json
```

## Troubleshooting

### Common Issues

#### 1. Docker Services Won't Start

**Problem**: Services fail to start or exit immediately.

**Solutions**:
- Check Docker daemon is running: `docker info`
- Check port conflicts: `netstat -tulpn | grep :5432`
- Review logs: `docker-compose logs [service-name]`
- Restart Docker: `sudo systemctl restart docker` (Linux)

#### 2. Database Connection Errors

**Problem**: Services can't connect to databases.

**Solutions**:
- Ensure databases are running: `docker-compose ps`
- Check environment variables in `.env` files
- Verify network connectivity: `docker-compose exec auth-service ping postgres`
- Wait for databases to fully initialize (30-60 seconds)

#### 3. AI Model Loading Errors

**Problem**: AI services fail to load models.

**Solutions**:
- Verify model files exist in `models/` directory
- Check file permissions: `ls -la models/`
- Ensure correct model paths in environment files
- Check model file formats and compatibility

#### 4. Port Conflicts

**Problem**: Services can't bind to ports.

**Solutions**:
- Check what's using the port: `lsof -i :5432` (macOS/Linux) or `netstat -ano | findstr :5432` (Windows)
- Stop conflicting services
- Change ports in `docker-compose.yml` and `.env` files

#### 5. Permission Errors (Linux)

**Problem**: Permission denied errors when running scripts.

**Solutions**:
- Make scripts executable: `chmod +x setup.sh`
- Check Docker permissions: `sudo usermod -aG docker $USER` (logout/login required)
- Use sudo if necessary: `sudo ./setup.sh`

### Getting Help

1. **Check logs**: Always start by checking service logs
   ```bash
   docker-compose logs -f [service-name]
   ```

2. **Verify environment**: Ensure all environment variables are set correctly
   ```bash
   docker-compose config
   ```

3. **Test connections**: Use health check endpoints
   ```bash
   curl http://localhost:3001/health
   ```

4. **Clean restart**: Sometimes a clean restart helps
   ```bash
   docker-compose down -v
   docker-compose up -d --build
   ```

### Performance Optimization

#### Development Environment

1. **Increase Docker resources**:
   - Memory: At least 4GB for all services
   - CPU: 2+ cores recommended
   - Disk: Ensure sufficient space for models and data

2. **Database optimization**:
   - Use connection pooling
   - Add appropriate indexes
   - Monitor query performance

3. **AI model optimization**:
   - Use model quantization for faster inference
   - Implement model caching
   - Consider GPU acceleration for production

#### Production Considerations

1. **Security**:
   - Change default passwords
   - Use strong JWT secrets
   - Enable SSL/TLS
   - Implement rate limiting

2. **Scalability**:
   - Use container orchestration (Kubernetes)
   - Implement horizontal scaling
   - Add load balancers
   - Use managed databases

3. **Monitoring**:
   - Add application monitoring
   - Set up log aggregation
   - Implement health checks
   - Monitor resource usage

## Next Steps

After successful setup:

1. **Review the codebase**: Familiarize yourself with the project structure
2. **Update configurations**: Modify environment files for your needs
3. **Add AI models**: Replace placeholders with actual model files
4. **Start development**: Begin implementing individual services
5. **Run tests**: Implement and run test suites
6. **Deploy**: Set up staging and production environments

For more detailed information about specific components, see the documentation in the `docs/` directory.
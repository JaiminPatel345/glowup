# GrowUp Mobile App

AI-powered beauty analysis and enhancement mobile application with skin analysis and hair try-on features.

## Project Structure

This is a monorepo containing:
- Mobile app (React Native)
- Microservices (Node.js and FastAPI)
- Shared configurations and utilities
- Database schemas and migrations

## Quick Start

See [SETUP.md](./SETUP.md) for detailed installation instructions.

### Linux/macOS
```bash
./setup.sh
```

### Windows
```powershell
.\setup.ps1
```

## Architecture

The application follows a microservices architecture with:
- React Native mobile frontend
- Node.js authentication and user services
- FastAPI AI processing services
- PostgreSQL for user data
- MongoDB for analysis results
- NGINX API Gateway

## Services

- **Mobile App**: React Native with Redux state management
- **Auth Service**: Node.js + Better-Auth + PostgreSQL
- **User Service**: Node.js + TypeScript + PostgreSQL
- **Skin Analysis Service**: FastAPI + MongoDB + AI Models
- **Hair Try-On Service**: FastAPI + MongoDB + AI Models
- **API Gateway**: NGINX + Node.js middleware

## Development

All services run in Docker containers for consistent development environment.

```bash
docker-compose up -d
```

## Documentation

- [Setup Guide](./SETUP.md)
- [API Documentation](./docs/api.md)
- [Architecture Overview](./docs/architecture.md)
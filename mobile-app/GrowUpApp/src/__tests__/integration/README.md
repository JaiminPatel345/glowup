# Backend Integration Tests

## Quick Start

### Start Backend
```bash
docker compose up -d
```

### Run Tests
```bash
npm run test:integration
```

## Test Suites

- `apiEndpoints.test.ts` - Verifies API endpoint configuration
- `backendIntegration.test.ts` - Tests full backend integration

## Troubleshooting

**Backend not running:**
```bash
docker compose up -d
```

**Tests failing:**
```bash
docker compose logs
```

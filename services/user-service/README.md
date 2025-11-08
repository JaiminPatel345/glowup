# User Management Service

A Node.js TypeScript service for managing user profiles and preferences in the GrowUp mobile application.

## Features

- **User Profile Management**: CRUD operations for user profiles
- **User Preferences**: Manage skin type, hair type, and app preferences
- **Input Validation**: Comprehensive validation using Zod schemas
- **File Upload**: Profile image upload with validation
- **Error Handling**: Robust error handling with custom error types
- **Database Integration**: PostgreSQL with Prisma ORM
- **Testing**: Unit and integration tests with Jest
- **Type Safety**: Full TypeScript support

## API Endpoints

### User Profile
- `GET /api/v1/users/:userId` - Get user profile
- `PUT /api/v1/users/:userId` - Update user profile
- `DELETE /api/v1/users/:userId` - Deactivate user account
- `POST /api/v1/users/:userId/profile-image` - Upload profile image

### User Preferences
- `GET /api/v1/users/:userId/preferences` - Get user preferences
- `POST /api/v1/users/:userId/preferences` - Create user preferences
- `PUT /api/v1/users/:userId/preferences` - Update user preferences
- `DELETE /api/v1/users/:userId/preferences` - Delete user preferences

### Combined Endpoints
- `GET /api/v1/users/:userId/complete` - Get user with preferences

### Admin Endpoints
- `GET /api/v1/admin/users` - Get paginated users list

### Health Check
- `GET /api/v1/health` - Service health check

## Environment Variables

```bash
# Database
DATABASE_URL="postgresql://postgres:password@localhost:5432/growup"

# Server Configuration
PORT=3002
NODE_ENV=development

# CORS Configuration
CORS_ORIGIN=http://localhost:3000

# File Upload Configuration
MAX_FILE_SIZE=5242880
UPLOAD_PATH=./uploads

# Logging
LOG_LEVEL=info
```

## Installation

1. Install dependencies:
```bash
yarn install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. Generate Prisma client:
```bash
npx prisma generate
```

4. Run database migrations:
```bash
npx prisma migrate deploy
```

## Development

Start the development server:
```bash
yarn dev
```

Build the project:
```bash
yarn build
```

Start the production server:
```bash
yarn start
```

## Testing

Run all tests:
```bash
yarn test
```

Run tests in watch mode:
```bash
yarn test:watch
```

Run tests with coverage:
```bash
yarn test:coverage
```

## Data Models

### User Profile
```typescript
interface UserProfile {
  id: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  profileImageUrl?: string | null;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### User Preferences
```typescript
interface UserPreferences {
  id: string;
  userId: string;
  skinType?: SkinType | null;
  hairType?: HairType | null;
  preferredLanguage: string;
  notificationSettings: any;
  privacySettings: any;
  appPreferences: any;
  createdAt: Date;
  updatedAt: Date;
}
```

### Enums
```typescript
enum SkinType {
  OILY = 'oily',
  DRY = 'dry',
  COMBINATION = 'combination',
  SENSITIVE = 'sensitive',
  NORMAL = 'normal'
}

enum HairType {
  STRAIGHT = 'straight',
  WAVY = 'wavy',
  CURLY = 'curly',
  COILY = 'coily',
  FINE = 'fine',
  THICK = 'thick',
  DAMAGED = 'damaged',
  HEALTHY = 'healthy'
}
```

## Validation

The service uses Zod for input validation with the following schemas:

- **User Profile**: Validates name fields and profile image URLs
- **User Preferences**: Validates skin/hair types and settings objects
- **File Upload**: Validates image files (type, size)
- **Pagination**: Validates query parameters for listing endpoints

## Error Handling

The service includes comprehensive error handling:

- **Custom AppError**: Application-specific errors with status codes
- **Prisma Error Handling**: Database-specific error mapping
- **Validation Errors**: Detailed validation error responses
- **Global Error Handler**: Centralized error processing

## Docker Support

Build Docker image:
```bash
docker build -t user-service .
```

Run with Docker:
```bash
docker run -p 3002:3002 --env-file .env user-service
```

## Architecture

The service follows a layered architecture:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and data processing
- **Middleware**: Validation, error handling, and logging
- **Database**: Prisma ORM with PostgreSQL
- **Types**: TypeScript interfaces and type definitions

## Security Features

- Input validation and sanitization
- File upload restrictions
- Rate limiting
- CORS configuration
- Helmet security headers
- Environment-based configuration
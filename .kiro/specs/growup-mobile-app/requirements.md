# Requirements Document

## Introduction

GrowUp is a mobile application that provides AI-powered beauty analysis and enhancement features. The app consists of two core modules: a Skin Analysis Module that analyzes facial images to detect skin issues and recommend products, and a Hair Try-On Module that allows users to virtually try different hairstyles through video processing and real-time streaming. The system is built using React Native for the mobile frontend and a microservices architecture with Node.js and FastAPI backends.

## Requirements

### Requirement 1: Skin Analysis Module - Image Upload and Analysis

**User Story:** As a user, I want to upload a face image and receive an analysis of my skin type and detected issues, so that I can understand my skin condition.

#### Acceptance Criteria

1. WHEN a user uploads a face image THEN the system SHALL process the image and return skin type analysis within 5 seconds
2. WHEN the analysis is complete THEN the system SHALL return ONLY skin type, detected issues list, and highlighted image without product recommendations
3. WHEN issues are detected THEN each issue SHALL include id, name, description, severity level, causes array, and highlighted image
4. IF the image quality is insufficient THEN the system SHALL return an error message with guidance for better image capture
5. WHEN the API response is received THEN the system SHALL display the skin type and issues list in the mobile interface

### Requirement 2: Skin Analysis Module - Issue Details and Product Recommendations

**User Story:** As a user, I want to view detailed information about detected skin issues and access product recommendations on demand, so that I can take appropriate action for my skin concerns.

#### Acceptance Criteria

1. WHEN a user clicks on a detected issue THEN the system SHALL display a popup with full details, causes, and prevention tips
2. WHEN a user clicks "View Solutions" THEN the system SHALL make a separate API call to fetch product recommendations
3. WHEN product recommendations are returned THEN the system SHALL separate ayurvedic and non-ayurvedic products with appropriate filters
4. WHEN displaying products THEN the system SHALL provide filter options for "all", "ayurvedic", and "non-ayurvedic" categories
5. IF no products are available for an issue THEN the system SHALL display alternative care recommendations

### Requirement 3: Hair Try-On Module - Video Processing Mode

**User Story:** As a user, I want to upload a short video and apply a hairstyle to see how it looks on me, so that I can experiment with different hair looks.

#### Acceptance Criteria

1. WHEN a user uploads a video THEN the system SHALL accept videos up to 10 seconds in length
2. WHEN processing video THEN the system SHALL require one reference hairstyle image and optionally accept one hair color image
3. WHEN video processing begins THEN the system SHALL process 50% of the video frames for efficiency
4. WHEN processing is complete THEN the system SHALL return a video with the applied hairstyle using HairFastGAN or similar model
5. IF video processing fails THEN the system SHALL provide clear error messages and retry options

### Requirement 4: Hair Try-On Module - Real-Time Streaming Mode

**User Story:** As a user, I want to see live hair try-on effects through my camera, so that I can preview hairstyles in real-time.

#### Acceptance Criteria

1. WHEN a user activates real-time mode THEN the system SHALL stream camera frames over WebSockets
2. WHEN streaming begins THEN the system SHALL require a reference hairstyle image to be selected
3. WHEN frames are processed THEN the system SHALL maintain low latency (under 200ms per frame)
4. WHEN the connection is unstable THEN the system SHALL gracefully handle reconnection and frame drops
5. IF real-time processing fails THEN the system SHALL fall back to static image mode

### Requirement 5: Microservices Architecture - Service Communication

**User Story:** As a system administrator, I want a scalable microservices architecture that handles different functionalities independently, so that the system can scale and maintain efficiently.

#### Acceptance Criteria

1. WHEN services communicate THEN the system SHALL use REST APIs for external communication and gRPC for internal service-to-service communication
2. WHEN any service starts THEN it SHALL register health check endpoints for monitoring
3. WHEN errors occur THEN each service SHALL implement structured logging and error handling
4. WHEN services are deployed THEN each service SHALL be containerized with Docker
5. IF a service fails THEN other services SHALL continue operating independently

### Requirement 6: API Gateway and Authentication

**User Story:** As a system, I need centralized API management and user authentication, so that all requests are properly routed and secured.

#### Acceptance Criteria

1. WHEN external requests arrive THEN the API Gateway SHALL route them to appropriate microservices
2. WHEN users authenticate THEN the system SHALL use Better-Auth with Node.js and PostgreSQL for user management
3. WHEN API calls are made THEN the system SHALL validate authentication tokens for protected endpoints
4. WHEN rate limiting is needed THEN the API Gateway SHALL enforce request limits per user
5. IF authentication fails THEN the system SHALL return appropriate error codes and redirect to login

### Requirement 7: Mobile Application Architecture

**User Story:** As a developer, I want a well-structured React Native application with proper API management, so that the codebase is maintainable and scalable.

#### Acceptance Criteria

1. WHEN making API calls THEN the application SHALL use only the centralized API layer in src/api/
2. WHEN handling API responses THEN the application SHALL use a global error handler for all catch blocks
3. WHEN managing state THEN the application SHALL use Redux for global state management
4. WHEN styling components THEN the application SHALL use NativeWind for consistent styling
5. IF API endpoints change THEN no hardcoded URLs SHALL exist outside the API configuration

### Requirement 8: AI Model Integration and Performance

**User Story:** As a user, I want fast and accurate AI processing for both skin analysis and hair try-on features, so that I get reliable results quickly.

#### Acceptance Criteria

1. WHEN selecting AI models THEN the system SHALL prioritize GitHub models, then free APIs, then custom models
2. WHEN processing images THEN skin analysis SHALL complete within 5 seconds for standard resolution images
3. WHEN highlighting skin issues THEN the system SHALL use image segmentation or masking for precise region identification
4. WHEN processing hair try-on THEN the system SHALL optimize for speed while maintaining visual quality
5. IF model inference fails THEN the system SHALL provide fallback options or cached results

### Requirement 9: Development Environment and Deployment

**User Story:** As a developer, I want automated setup , so that I can quickly set up the development environment.

#### Acceptance Criteria

1. WHEN setting up development THEN docker-compose.yml SHALL run all microservices and required databases
2. WHEN running setup scripts THEN automation SHALL pull models from GitHub, install dependencies, and start services
3. WHEN following setup instructions THEN SETUP.md SHALL provide complete installation guides for Linux and Windows
4. WHEN validating setup THEN the system SHALL work end-to-end after running the provided scripts
5. IF setup fails THEN clear error messages SHALL guide developers to resolve issues

### Requirement 10: Database Management and Data Storage

**User Story:** As a system, I need reliable data storage solutions for different types of data, so that user information and application data are properly managed.

#### Acceptance Criteria

1. WHEN storing user data THEN the system SHALL use PostgreSQL for user management, authentication, and relational data
2. WHEN storing analysis results THEN the system SHALL use MongoDB for skin analysis results, hair try-on history, and product recommendations
3. WHEN storing media files THEN the system SHALL use MongoDB GridFS or cloud storage for images and videos
4. WHEN accessing databases THEN each service SHALL use appropriate connection pooling and error handling
5. IF database connections fail THEN the system SHALL implement retry logic and graceful degradation

### Requirement 11: API Documentation and Data Validation

**User Story:** As a developer and API consumer, I want well-documented APIs with proper data validation, so that integration is straightforward and reliable.

#### Acceptance Criteria

1. WHEN APIs are developed THEN OpenAPI/Swagger documentation SHALL be automatically generated
2. WHEN data is exchanged THEN TypeScript interfaces SHALL define all API request/response structures
3. WHEN validating input THEN a validation layer SHALL check all incoming data before processing
4. WHEN configuring services THEN environment variables SHALL be properly documented and validated
5. IF API schemas change THEN documentation SHALL be automatically updated to reflect changesHere is the **complete improved prompt**:

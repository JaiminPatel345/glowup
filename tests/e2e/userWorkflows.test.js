const request = require('supertest');
const { expect } = require('chai');
const fs = require('fs');
const path = require('path');

// Test configuration
const config = {
  apiGateway: process.env.API_GATEWAY_URL || 'http://localhost:80',
  testTimeout: 30000,
  testUser: {
    email: 'test@growup.com',
    password: 'TestPassword123!',
    firstName: 'Test',
    lastName: 'User'
  }
};

describe('End-to-End User Workflows', function() {
  this.timeout(config.testTimeout);
  
  let authToken;
  let userId;
  let refreshToken;
  let skinAnalysisId;
  let hairTryOnId;

  before(async function() {
    console.log('Setting up E2E tests...');
    // Wait for services to be ready
    await waitForServices();
  });

  describe('User Authentication Workflow', function() {
    it('should register a new user', async function() {
      const response = await request(config.apiGateway)
        .post('/api/auth/register')
        .send({
          email: config.testUser.email,
          password: config.testUser.password,
          firstName: config.testUser.firstName,
          lastName: config.testUser.lastName
        })
        .expect(201);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user).to.have.property('id');
      expect(response.body.data.user.email).to.equal(config.testUser.email);
      expect(response.body.data).to.have.property('accessToken');
      expect(response.body.data).to.have.property('refreshToken');

      userId = response.body.data.user.id;
      authToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should login with valid credentials', async function() {
      const response = await request(config.apiGateway)
        .post('/api/auth/login')
        .send({
          email: config.testUser.email,
          password: config.testUser.password
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('accessToken');
      expect(response.body.data).to.have.property('refreshToken');

      authToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });

    it('should refresh access token', async function() {
      const response = await request(config.apiGateway)
        .post('/api/auth/refresh')
        .send({
          refreshToken: refreshToken
        })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('accessToken');
      expect(response.body.data).to.have.property('refreshToken');

      authToken = response.body.data.accessToken;
      refreshToken = response.body.data.refreshToken;
    });
  });

  describe('User Profile Management Workflow', function() {
    it('should get user profile', async function() {
      const response = await request(config.apiGateway)
        .get('/api/user/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.user.id).to.equal(userId);
      expect(response.body.data.user.email).to.equal(config.testUser.email);
    });

    it('should update user preferences', async function() {
      const preferences = {
        skinType: 'combination',
        hairType: 'wavy',
        preferences: {
          notifications: true,
          ayurvedicProducts: true
        }
      };

      const response = await request(config.apiGateway)
        .put('/api/user/preferences')
        .set('Authorization', `Bearer ${authToken}`)
        .send(preferences)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.preferences.skinType).to.equal(preferences.skinType);
      expect(response.body.data.preferences.hairType).to.equal(preferences.hairType);
    });
  });

  describe('Skin Analysis Workflow', function() {
    it('should upload and analyze skin image', async function() {
      const testImagePath = path.join(__dirname, '../fixtures/test-face.jpg');
      
      // Create test image if it doesn't exist
      if (!fs.existsSync(testImagePath)) {
        await createTestImage(testImagePath);
      }

      const response = await request(config.apiGateway)
        .post('/api/skin/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', testImagePath)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('analysisId');
      expect(response.body.data).to.have.property('skinType');
      expect(response.body.data).to.have.property('issues');
      expect(response.body.data.issues).to.be.an('array');

      skinAnalysisId = response.body.data.analysisId;
    });

    it('should get analysis results by ID', async function() {
      const response = await request(config.apiGateway)
        .get(`/api/skin/analysis/${skinAnalysisId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.analysis.id).to.equal(skinAnalysisId);
      expect(response.body.data.analysis).to.have.property('skinType');
      expect(response.body.data.analysis).to.have.property('issues');
    });

    it('should get product recommendations for detected issues', async function() {
      // First get the analysis to find issues
      const analysisResponse = await request(config.apiGateway)
        .get(`/api/skin/analysis/${skinAnalysisId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const issues = analysisResponse.body.data.analysis.issues;
      
      if (issues.length > 0) {
        const issueId = issues[0].id;
        
        const response = await request(config.apiGateway)
          .get(`/api/skin/products/${issueId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('products');
        expect(response.body.data.products).to.be.an('array');
        expect(response.body.data).to.have.property('ayurvedicProducts');
        expect(response.body.data.ayurvedicProducts).to.be.an('array');
      }
    });

    it('should get user analysis history', async function() {
      const response = await request(config.apiGateway)
        .get('/api/skin/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.analyses).to.be.an('array');
      expect(response.body.data.analyses.length).to.be.at.least(1);
      expect(response.body.data.analyses[0].id).to.equal(skinAnalysisId);
    });
  });

  describe('Hair Try-On Workflow', function() {
    it('should upload and process hair try-on video', async function() {
      const testVideoPath = path.join(__dirname, '../fixtures/test-video.mp4');
      const testStylePath = path.join(__dirname, '../fixtures/test-hairstyle.jpg');
      
      // Create test files if they don't exist
      if (!fs.existsSync(testVideoPath)) {
        await createTestVideo(testVideoPath);
      }
      if (!fs.existsSync(testStylePath)) {
        await createTestImage(testStylePath);
      }

      const response = await request(config.apiGateway)
        .post('/api/hair/process-video')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('video', testVideoPath)
        .attach('styleImage', testStylePath)
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data).to.have.property('processingId');
      expect(response.body.data).to.have.property('status');

      hairTryOnId = response.body.data.processingId;
    });

    it('should check processing status', async function() {
      let attempts = 0;
      const maxAttempts = 10;
      let processingComplete = false;

      while (attempts < maxAttempts && !processingComplete) {
        const response = await request(config.apiGateway)
          .get(`/api/hair/status/${hairTryOnId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data).to.have.property('status');

        if (response.body.data.status === 'completed') {
          processingComplete = true;
          expect(response.body.data).to.have.property('resultVideoUrl');
        } else if (response.body.data.status === 'failed') {
          throw new Error('Hair try-on processing failed');
        }

        attempts++;
        if (!processingComplete && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
        }
      }

      expect(processingComplete).to.be.true;
    });

    it('should get hair try-on history', async function() {
      const response = await request(config.apiGateway)
        .get('/api/hair/history')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ limit: 10, offset: 0 })
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.results).to.be.an('array');
      expect(response.body.data.results.length).to.be.at.least(1);
    });
  });

  describe('System Health and Monitoring', function() {
    it('should check API Gateway health', async function() {
      const response = await request(config.apiGateway)
        .get('/health')
        .expect(200);

      expect(response.body.success).to.be.true;
      expect(response.body.data.status).to.be.oneOf(['healthy', 'degraded']);
    });

    it('should check all service health endpoints', async function() {
      const services = [
        { name: 'auth', port: 3001 },
        { name: 'user', port: 3002 },
        { name: 'skin-analysis', port: 3003 },
        { name: 'hair-tryon', port: 3004 }
      ];

      for (const service of services) {
        const response = await request(`http://localhost:${service.port}`)
          .get('/health')
          .expect(200);

        expect(response.body.success).to.be.true;
        expect(response.body.data.status).to.be.oneOf(['healthy', 'degraded']);
      }
    });
  });

  describe('Error Handling and Resilience', function() {
    it('should handle invalid authentication token', async function() {
      const response = await request(config.apiGateway)
        .get('/api/user/profile')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).to.be.false;
      expect(response.body.error).to.include('Invalid');
    });

    it('should handle rate limiting', async function() {
      // Make multiple rapid requests to trigger rate limiting
      const promises = [];
      for (let i = 0; i < 20; i++) {
        promises.push(
          request(config.apiGateway)
            .get('/api/auth/health')
            .catch(err => err.response)
        );
      }

      const responses = await Promise.all(promises);
      const rateLimitedResponses = responses.filter(res => res && res.status === 429);
      
      // Should have at least some rate limited responses
      expect(rateLimitedResponses.length).to.be.at.least(1);
    });

    it('should handle large file uploads gracefully', async function() {
      // Create a large test file (>10MB)
      const largeFilePath = path.join(__dirname, '../fixtures/large-file.jpg');
      await createLargeTestFile(largeFilePath);

      const response = await request(config.apiGateway)
        .post('/api/skin/analyze')
        .set('Authorization', `Bearer ${authToken}`)
        .attach('image', largeFilePath)
        .expect(413); // Payload too large

      expect(response.body.success).to.be.false;
      
      // Clean up
      if (fs.existsSync(largeFilePath)) {
        fs.unlinkSync(largeFilePath);
      }
    });
  });

  after(async function() {
    // Cleanup: logout user
    if (refreshToken) {
      await request(config.apiGateway)
        .post('/api/auth/logout')
        .send({ refreshToken })
        .catch(() => {}); // Ignore errors during cleanup
    }

    // Clean up test files
    const testFiles = [
      path.join(__dirname, '../fixtures/test-face.jpg'),
      path.join(__dirname, '../fixtures/test-video.mp4'),
      path.join(__dirname, '../fixtures/test-hairstyle.jpg')
    ];

    testFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file);
      }
    });
  });
});

// Helper functions

async function waitForServices() {
  const services = [
    { name: 'API Gateway', url: config.apiGateway },
    { name: 'Auth Service', url: 'http://localhost:3001' },
    { name: 'User Service', url: 'http://localhost:3002' },
    { name: 'Skin Analysis Service', url: 'http://localhost:3003' },
    { name: 'Hair Try-On Service', url: 'http://localhost:3004' }
  ];

  console.log('Waiting for services to be ready...');
  
  for (const service of services) {
    let ready = false;
    let attempts = 0;
    const maxAttempts = 30;

    while (!ready && attempts < maxAttempts) {
      try {
        await request(service.url).get('/health').timeout(5000);
        console.log(`✓ ${service.name} is ready`);
        ready = true;
      } catch (error) {
        attempts++;
        if (attempts < maxAttempts) {
          console.log(`⏳ Waiting for ${service.name}... (${attempts}/${maxAttempts})`);
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      }
    }

    if (!ready) {
      throw new Error(`${service.name} failed to become ready after ${maxAttempts} attempts`);
    }
  }
}

async function createTestImage(filePath) {
  // Create a simple test image (1x1 pixel PNG)
  const testImageBuffer = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xDE, 0x00, 0x00, 0x00,
    0x0C, 0x49, 0x44, 0x41, 0x54, 0x08, 0xD7, 0x63, 0xF8, 0x00, 0x00, 0x00,
    0x00, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x37, 0x6E, 0xF9, 0x24, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
  ]);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, testImageBuffer);
}

async function createTestVideo(filePath) {
  // Create a minimal MP4 file for testing
  // This is a very basic MP4 structure - in a real scenario you'd use ffmpeg
  const testVideoBuffer = Buffer.from([
    // Minimal MP4 header
    0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D,
    0x00, 0x00, 0x02, 0x00, 0x69, 0x73, 0x6F, 0x6D, 0x69, 0x73, 0x6F, 0x32,
    0x61, 0x76, 0x63, 0x31, 0x6D, 0x70, 0x34, 0x31
  ]);

  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(filePath, testVideoBuffer);
}

async function createLargeTestFile(filePath) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Create a 15MB file
  const size = 15 * 1024 * 1024;
  const buffer = Buffer.alloc(size, 0);
  fs.writeFileSync(filePath, buffer);
}
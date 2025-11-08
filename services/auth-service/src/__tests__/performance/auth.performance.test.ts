import request from 'supertest';
import app from '../../app';
import { cleanDatabase } from '../setup';

describe('Authentication Performance Tests', () => {
  beforeEach(async () => {
    await cleanDatabase();
  });

  describe('Concurrent Authentication Requests', () => {
    it('should handle multiple concurrent registration requests', async () => {
      const startTime = Date.now();
      const concurrentRequests = 10;
      
      const promises = Array.from({ length: concurrentRequests }, (_, index) => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: `user${index}@example.com`,
            password: 'TestPassword123!'
          })
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(`user${index}@example.com`);
      });

      // Performance assertion: should complete within reasonable time
      expect(totalTime).toBeLessThan(5000); // 5 seconds for 10 concurrent requests
      
      console.log(`Concurrent registration test completed in ${totalTime}ms`);
    });

    it('should handle multiple concurrent login requests', async () => {
      // First, create test users
      const userCount = 5;
      const users = Array.from({ length: userCount }, (_, index) => ({
        email: `login${index}@example.com`,
        password: 'TestPassword123!'
      }));

      // Register users sequentially to avoid conflicts
      for (const user of users) {
        await request(app)
          .post('/api/auth/register')
          .send(user);
      }

      // Now test concurrent logins
      const startTime = Date.now();
      
      const loginPromises = users.map(user => 
        request(app)
          .post('/api/auth/login')
          .send(user)
      );

      const responses = await Promise.all(loginPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(users[index].email);
        expect(response.body.data.accessToken).toBeDefined();
        expect(response.body.data.refreshToken).toBeDefined();
      });

      // Performance assertion
      expect(totalTime).toBeLessThan(3000); // 3 seconds for 5 concurrent logins
      
      console.log(`Concurrent login test completed in ${totalTime}ms`);
    });

    it('should handle multiple concurrent token validation requests', async () => {
      // Create a user and get access token
      await request(app)
        .post('/api/auth/register')
        .send({
          email: 'validate@example.com',
          password: 'TestPassword123!'
        });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'validate@example.com',
          password: 'TestPassword123!'
        });

      const accessToken = loginResponse.body.data.accessToken;

      // Test concurrent token validations
      const startTime = Date.now();
      const concurrentRequests = 20;
      
      const promises = Array.from({ length: concurrentRequests }, () => 
        request(app)
          .get('/api/auth/validate')
          .set('Authorization', `Bearer ${accessToken}`)
      );

      const responses = await Promise.all(promises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.valid).toBe(true);
      });

      // Performance assertion: token validation should be very fast
      expect(totalTime).toBeLessThan(2000); // 2 seconds for 20 concurrent validations
      
      console.log(`Concurrent token validation test completed in ${totalTime}ms`);
    });

    it('should handle mixed concurrent authentication operations', async () => {
      const startTime = Date.now();
      
      // Mix of different operations
      const operations = [
        // Registrations
        ...Array.from({ length: 3 }, (_, index) => 
          request(app)
            .post('/api/auth/register')
            .send({
              email: `mixed${index}@example.com`,
              password: 'TestPassword123!'
            })
        ),
        // Create a user first for login tests
        request(app)
          .post('/api/auth/register')
          .send({
            email: 'mixedlogin@example.com',
            password: 'TestPassword123!'
          })
          .then(() => 
            request(app)
              .post('/api/auth/login')
              .send({
                email: 'mixedlogin@example.com',
                password: 'TestPassword123!'
              })
          )
      ];

      const responses = await Promise.all(operations);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // Check that operations completed successfully
      responses.forEach(response => {
        expect([200, 201]).toContain(response.status);
        expect(response.body.success).toBe(true);
      });

      // Performance assertion
      expect(totalTime).toBeLessThan(4000); // 4 seconds for mixed operations
      
      console.log(`Mixed concurrent operations test completed in ${totalTime}ms`);
    });
  });

  describe('Rate Limiting Performance', () => {
    it('should enforce rate limits without significant performance degradation', async () => {
      const startTime = Date.now();
      
      // Send requests up to the rate limit
      const requests = Array.from({ length: 5 }, () => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: 'nonexistent@example.com',
            password: 'TestPassword123!'
          })
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All should be processed (though they'll fail due to invalid credentials)
      responses.forEach(response => {
        expect([401, 429]).toContain(response.status); // 401 for invalid creds, 429 for rate limit
      });

      // Should complete quickly even with rate limiting
      expect(totalTime).toBeLessThan(2000);
      
      console.log(`Rate limiting test completed in ${totalTime}ms`);
    });
  });

  describe('Database Performance Under Load', () => {
    it('should maintain performance with multiple database operations', async () => {
      const startTime = Date.now();
      const userCount = 10;
      
      // Create multiple users to test database performance
      const registrationPromises = Array.from({ length: userCount }, (_, index) => 
        request(app)
          .post('/api/auth/register')
          .send({
            email: `dbtest${index}@example.com`,
            password: 'TestPassword123!',
            firstName: `User${index}`,
            lastName: 'Test'
          })
      );

      await Promise.all(registrationPromises);
      
      // Now test concurrent logins (which involve database lookups)
      const loginPromises = Array.from({ length: userCount }, (_, index) => 
        request(app)
          .post('/api/auth/login')
          .send({
            email: `dbtest${index}@example.com`,
            password: 'TestPassword123!'
          })
      );

      const loginResponses = await Promise.all(loginPromises);
      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // All logins should succeed
      loginResponses.forEach((response, index) => {
        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.data.user.email).toBe(`dbtest${index}@example.com`);
      });

      // Performance assertion for database operations
      expect(totalTime).toBeLessThan(6000); // 6 seconds for 10 registrations + 10 logins
      
      console.log(`Database performance test completed in ${totalTime}ms for ${userCount * 2} operations`);
    });
  });
});
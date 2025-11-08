const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

// Load test configuration
const config = {
  baseUrl: process.env.API_GATEWAY_URL || 'http://localhost:80',
  duration: process.env.LOAD_TEST_DURATION || 60, // seconds
  connections: process.env.LOAD_TEST_CONNECTIONS || 10,
  pipelining: process.env.LOAD_TEST_PIPELINING || 1,
  warmup: process.env.LOAD_TEST_WARMUP || 10, // seconds
  authToken: null
};

class LoadTester {
  constructor() {
    this.results = {};
    this.authToken = null;
  }

  async setup() {
    console.log('Setting up load tests...');
    
    // Register and authenticate a test user
    try {
      const authResult = await this.authenticateTestUser();
      this.authToken = authResult.accessToken;
      config.authToken = authResult.accessToken;
      console.log('✓ Test user authenticated');
    } catch (error) {
      console.error('Failed to authenticate test user:', error.message);
      throw error;
    }
  }

  async authenticateTestUser() {
    const fetch = require('node-fetch');
    
    const testUser = {
      email: `loadtest-${Date.now()}@growup.com`,
      password: 'LoadTest123!',
      firstName: 'Load',
      lastName: 'Test'
    };

    // Register user
    const registerResponse = await fetch(`${config.baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testUser)
    });

    if (!registerResponse.ok) {
      // Try to login if user already exists
      const loginResponse = await fetch(`${config.baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: testUser.email,
          password: testUser.password
        })
      });

      if (!loginResponse.ok) {
        throw new Error('Failed to authenticate test user');
      }

      const loginData = await loginResponse.json();
      return loginData.data;
    }

    const registerData = await registerResponse.json();
    return registerData.data;
  }

  async runHealthCheckTest() {
    console.log('\n🔍 Running Health Check Load Test...');
    
    const result = await autocannon({
      url: `${config.baseUrl}/health`,
      connections: config.connections,
      pipelining: config.pipelining,
      duration: config.duration,
      warmup: {
        connections: config.connections,
        pipelining: config.pipelining,
        duration: config.warmup
      },
      headers: {
        'User-Agent': 'GrowUp-LoadTest/1.0'
      }
    });

    this.results.healthCheck = result;
    this.printResults('Health Check', result);
    return result;
  }

  async runAuthenticationTest() {
    console.log('\n🔐 Running Authentication Load Test...');
    
    const result = await autocannon({
      url: `${config.baseUrl}/api/auth/login`,
      method: 'POST',
      connections: config.connections,
      pipelining: config.pipelining,
      duration: config.duration,
      warmup: {
        connections: config.connections,
        pipelining: config.pipelining,
        duration: config.warmup
      },
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'GrowUp-LoadTest/1.0'
      },
      body: JSON.stringify({
        email: 'loadtest@growup.com',
        password: 'LoadTest123!'
      })
    });

    this.results.authentication = result;
    this.printResults('Authentication', result);
    return result;
  }

  async runUserProfileTest() {
    console.log('\n👤 Running User Profile Load Test...');
    
    if (!this.authToken) {
      throw new Error('Authentication required for user profile test');
    }

    const result = await autocannon({
      url: `${config.baseUrl}/api/user/profile`,
      connections: config.connections,
      pipelining: config.pipelining,
      duration: config.duration,
      warmup: {
        connections: config.connections,
        pipelining: config.pipelining,
        duration: config.warmup
      },
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'User-Agent': 'GrowUp-LoadTest/1.0'
      }
    });

    this.results.userProfile = result;
    this.printResults('User Profile', result);
    return result;
  }

  async runSkinAnalysisTest() {
    console.log('\n🔬 Running Skin Analysis Load Test...');
    
    if (!this.authToken) {
      throw new Error('Authentication required for skin analysis test');
    }

    // Create a test image for the load test
    const testImagePath = await this.createTestImage();
    const imageBuffer = fs.readFileSync(testImagePath);

    const result = await autocannon({
      url: `${config.baseUrl}/api/skin/analyze`,
      method: 'POST',
      connections: Math.min(config.connections, 5), // Limit connections for AI processing
      pipelining: 1, // No pipelining for file uploads
      duration: config.duration,
      warmup: {
        connections: 2,
        pipelining: 1,
        duration: config.warmup
      },
      headers: {
        'Authorization': `Bearer ${this.authToken}`,
        'User-Agent': 'GrowUp-LoadTest/1.0'
      },
      setupClient: (client) => {
        // Setup multipart form data for image upload
        client.setBody(this.createMultipartBody(imageBuffer));
        client.setHeaders({
          ...client.opts.headers,
          'Content-Type': 'multipart/form-data; boundary=----formdata-autocannon'
        });
      }
    });

    this.results.skinAnalysis = result;
    this.printResults('Skin Analysis', result);
    
    // Clean up test image
    fs.unlinkSync(testImagePath);
    
    return result;
  }

  async runConcurrentUsersTest() {
    console.log('\n👥 Running Concurrent Users Test...');
    
    const scenarios = [
      { name: 'Health Check', weight: 30, url: '/health', method: 'GET' },
      { name: 'Authentication', weight: 20, url: '/api/auth/login', method: 'POST' },
      { name: 'User Profile', weight: 25, url: '/api/user/profile', method: 'GET' },
      { name: 'Analysis History', weight: 25, url: '/api/skin/history', method: 'GET' }
    ];

    const promises = scenarios.map(scenario => {
      const connections = Math.floor(config.connections * (scenario.weight / 100));
      
      let requestConfig = {
        url: `${config.baseUrl}${scenario.url}`,
        method: scenario.method,
        connections: Math.max(connections, 1),
        pipelining: config.pipelining,
        duration: config.duration,
        headers: {
          'User-Agent': 'GrowUp-LoadTest/1.0'
        }
      };

      // Add auth header for protected endpoints
      if (scenario.url.includes('/api/user') || scenario.url.includes('/api/skin')) {
        requestConfig.headers['Authorization'] = `Bearer ${this.authToken}`;
      }

      // Add body for POST requests
      if (scenario.method === 'POST' && scenario.url.includes('/auth/login')) {
        requestConfig.headers['Content-Type'] = 'application/json';
        requestConfig.body = JSON.stringify({
          email: 'loadtest@growup.com',
          password: 'LoadTest123!'
        });
      }

      return autocannon(requestConfig).then(result => ({
        scenario: scenario.name,
        result
      }));
    });

    const results = await Promise.all(promises);
    
    console.log('\n📊 Concurrent Users Test Results:');
    results.forEach(({ scenario, result }) => {
      console.log(`\n${scenario}:`);
      this.printResults(scenario, result, false);
    });

    this.results.concurrentUsers = results;
    return results;
  }

  createMultipartBody(imageBuffer) {
    const boundary = '----formdata-autocannon';
    const parts = [];
    
    parts.push(`--${boundary}\r\n`);
    parts.push('Content-Disposition: form-data; name="image"; filename="test.jpg"\r\n');
    parts.push('Content-Type: image/jpeg\r\n\r\n');
    
    return Buffer.concat([
      Buffer.from(parts.join('')),
      imageBuffer,
      Buffer.from(`\r\n--${boundary}--\r\n`)
    ]);
  }

  async createTestImage() {
    const testImagePath = path.join(__dirname, 'test-load-image.jpg');
    
    // Create a simple test image (1x1 pixel JPEG)
    const testImageBuffer = Buffer.from([
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0x09, 0x08, 0x0A, 0x0C, 0x14, 0x0D, 0x0C, 0x0B, 0x0B, 0x0C, 0x19, 0x12,
      0x13, 0x0F, 0x14, 0x1D, 0x1A, 0x1F, 0x1E, 0x1D, 0x1A, 0x1C, 0x1C, 0x20,
      0x24, 0x2E, 0x27, 0x20, 0x22, 0x2C, 0x23, 0x1C, 0x1C, 0x28, 0x37, 0x29,
      0x2C, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1F, 0x27, 0x39, 0x3D, 0x38, 0x32,
      0x3C, 0x2E, 0x33, 0x34, 0x32, 0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01,
      0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01,
      0xFF, 0xC4, 0x00, 0x14, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x08, 0xFF, 0xC4,
      0x00, 0x14, 0x10, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
      0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0xFF, 0xDA, 0x00, 0x0C,
      0x03, 0x01, 0x00, 0x02, 0x11, 0x03, 0x11, 0x00, 0x3F, 0x00, 0x9F, 0xFF, 0xD9
    ]);

    fs.writeFileSync(testImagePath, testImageBuffer);
    return testImagePath;
  }

  printResults(testName, result, detailed = true) {
    console.log(`\n📈 ${testName} Results:`);
    console.log(`   Requests/sec: ${result.requests.average.toFixed(2)}`);
    console.log(`   Latency (avg): ${result.latency.average.toFixed(2)}ms`);
    console.log(`   Latency (p99): ${result.latency.p99.toFixed(2)}ms`);
    console.log(`   Throughput: ${(result.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
    console.log(`   Total Requests: ${result.requests.total}`);
    console.log(`   Errors: ${result.errors}`);
    console.log(`   Timeouts: ${result.timeouts}`);
    
    if (detailed) {
      console.log(`   Status Codes:`);
      Object.entries(result.statusCodeStats).forEach(([code, count]) => {
        console.log(`     ${code}: ${count}`);
      });
    }

    // Performance thresholds
    const thresholds = {
      avgLatency: 1000, // 1 second
      p99Latency: 5000, // 5 seconds
      errorRate: 0.01   // 1%
    };

    const errorRate = (result.errors + result.timeouts) / result.requests.total;
    
    console.log(`\n🎯 Performance Analysis:`);
    console.log(`   Avg Latency: ${result.latency.average <= thresholds.avgLatency ? '✅' : '❌'} (${result.latency.average.toFixed(2)}ms <= ${thresholds.avgLatency}ms)`);
    console.log(`   P99 Latency: ${result.latency.p99 <= thresholds.p99Latency ? '✅' : '❌'} (${result.latency.p99.toFixed(2)}ms <= ${thresholds.p99Latency}ms)`);
    console.log(`   Error Rate: ${errorRate <= thresholds.errorRate ? '✅' : '❌'} (${(errorRate * 100).toFixed(2)}% <= ${(thresholds.errorRate * 100).toFixed(2)}%)`);
  }

  async generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      configuration: config,
      results: this.results,
      summary: this.generateSummary()
    };

    const reportPath = path.join(__dirname, `load-test-report-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📄 Load test report saved to: ${reportPath}`);
    return report;
  }

  generateSummary() {
    const summary = {
      totalTests: Object.keys(this.results).length,
      overallPerformance: 'good',
      recommendations: []
    };

    // Analyze results and generate recommendations
    Object.entries(this.results).forEach(([testName, result]) => {
      if (Array.isArray(result)) return; // Skip concurrent users test for now
      
      const avgLatency = result.latency.average;
      const errorRate = (result.errors + result.timeouts) / result.requests.total;

      if (avgLatency > 1000) {
        summary.overallPerformance = 'needs improvement';
        summary.recommendations.push(`${testName}: High average latency (${avgLatency.toFixed(2)}ms). Consider optimizing response times.`);
      }

      if (errorRate > 0.01) {
        summary.overallPerformance = 'poor';
        summary.recommendations.push(`${testName}: High error rate (${(errorRate * 100).toFixed(2)}%). Investigate error causes.`);
      }

      if (result.requests.average < 10) {
        summary.recommendations.push(`${testName}: Low throughput (${result.requests.average.toFixed(2)} req/s). Consider scaling resources.`);
      }
    });

    return summary;
  }

  async runAllTests() {
    console.log('🚀 Starting GrowUp Load Tests...');
    console.log(`Configuration: ${config.connections} connections, ${config.duration}s duration`);
    
    try {
      await this.setup();
      
      // Run individual tests
      await this.runHealthCheckTest();
      await this.runAuthenticationTest();
      await this.runUserProfileTest();
      
      // Skip skin analysis test if it's too resource intensive
      if (config.connections <= 5) {
        await this.runSkinAnalysisTest();
      } else {
        console.log('\n⚠️  Skipping Skin Analysis test due to high connection count');
      }
      
      await this.runConcurrentUsersTest();
      
      // Generate final report
      const report = await this.generateReport();
      
      console.log('\n🎉 Load testing completed!');
      console.log(`Overall Performance: ${report.summary.overallPerformance.toUpperCase()}`);
      
      if (report.summary.recommendations.length > 0) {
        console.log('\n💡 Recommendations:');
        report.summary.recommendations.forEach(rec => {
          console.log(`   • ${rec}`);
        });
      }
      
      return report;
      
    } catch (error) {
      console.error('❌ Load testing failed:', error.message);
      throw error;
    }
  }
}

// Run load tests if this file is executed directly
if (require.main === module) {
  const loadTester = new LoadTester();
  loadTester.runAllTests()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Load testing failed:', error);
      process.exit(1);
    });
}

module.exports = LoadTester;
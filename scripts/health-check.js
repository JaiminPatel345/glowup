#!/usr/bin/env node

// Health Check Script for GrowUp Services
const axios = require('axios');
const { db } = require('../shared/database/postgresql');
const { mongodb } = require('../shared/database/mongodb');

const services = [
  {
    name: 'API Gateway',
    url: 'http://localhost/health',
    timeout: 5000
  },
  {
    name: 'Auth Service',
    url: 'http://localhost:3001/health',
    timeout: 5000
  },
  {
    name: 'User Service',
    url: 'http://localhost:3002/health',
    timeout: 5000
  },
  {
    name: 'Skin Analysis Service',
    url: 'http://localhost:3003/health',
    timeout: 5000
  },
  {
    name: 'Hair Try-On Service',
    url: 'http://localhost:3004/health',
    timeout: 5000
  }
];

async function checkHTTPService(service) {
  try {
    const response = await axios.get(service.url, {
      timeout: service.timeout,
      validateStatus: (status) => status < 500
    });
    
    return {
      name: service.name,
      status: 'healthy',
      responseTime: response.headers['x-response-time'] || 'N/A',
      statusCode: response.status
    };
  } catch (error) {
    return {
      name: service.name,
      status: 'unhealthy',
      error: error.message,
      statusCode: error.response?.status || 'N/A'
    };
  }
}

async function checkPostgreSQL() {
  try {
    const result = await db.checkConnection();
    return {
      name: 'PostgreSQL',
      status: result.connected ? 'healthy' : 'unhealthy',
      timestamp: result.timestamp,
      error: result.error
    };
  } catch (error) {
    return {
      name: 'PostgreSQL',
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkMongoDB() {
  try {
    const result = await mongodb.checkConnection();
    return {
      name: 'MongoDB',
      status: result.connected ? 'healthy' : 'unhealthy',
      timestamp: result.timestamp,
      error: result.error
    };
  } catch (error) {
    return {
      name: 'MongoDB',
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function checkRedis() {
  try {
    // Simple Redis check - would need Redis client setup
    return {
      name: 'Redis',
      status: 'unknown',
      note: 'Redis check not implemented yet'
    };
  } catch (error) {
    return {
      name: 'Redis',
      status: 'unhealthy',
      error: error.message
    };
  }
}

async function runHealthChecks() {
  console.log('🏥 GrowUp Health Check');
  console.log('=====================');
  console.log(`Timestamp: ${new Date().toISOString()}\n`);

  const results = [];

  // Check HTTP services
  console.log('📡 Checking HTTP Services...');
  for (const service of services) {
    const result = await checkHTTPService(service);
    results.push(result);
    
    const statusIcon = result.status === 'healthy' ? '✅' : '❌';
    console.log(`${statusIcon} ${result.name}: ${result.status} (${result.statusCode})`);
    
    if (result.error) {
      console.log(`   Error: ${result.error}`);
    }
    if (result.responseTime) {
      console.log(`   Response Time: ${result.responseTime}`);
    }
  }

  console.log('\n💾 Checking Databases...');
  
  // Check PostgreSQL
  const pgResult = await checkPostgreSQL();
  results.push(pgResult);
  const pgIcon = pgResult.status === 'healthy' ? '✅' : '❌';
  console.log(`${pgIcon} ${pgResult.name}: ${pgResult.status}`);
  if (pgResult.error) {
    console.log(`   Error: ${pgResult.error}`);
  }

  // Check MongoDB
  const mongoResult = await checkMongoDB();
  results.push(mongoResult);
  const mongoIcon = mongoResult.status === 'healthy' ? '✅' : '❌';
  console.log(`${mongoIcon} ${mongoResult.name}: ${mongoResult.status}`);
  if (mongoResult.error) {
    console.log(`   Error: ${mongoResult.error}`);
  }

  // Check Redis
  const redisResult = await checkRedis();
  results.push(redisResult);
  const redisIcon = redisResult.status === 'healthy' ? '✅' : redisResult.status === 'unknown' ? '⚠️' : '❌';
  console.log(`${redisIcon} ${redisResult.name}: ${redisResult.status}`);
  if (redisResult.note) {
    console.log(`   Note: ${redisResult.note}`);
  }

  // Summary
  console.log('\n📊 Summary');
  console.log('==========');
  const healthy = results.filter(r => r.status === 'healthy').length;
  const total = results.length;
  const healthPercentage = Math.round((healthy / total) * 100);
  
  console.log(`Healthy Services: ${healthy}/${total} (${healthPercentage}%)`);
  
  if (healthPercentage === 100) {
    console.log('🎉 All services are healthy!');
  } else if (healthPercentage >= 80) {
    console.log('⚠️  Most services are healthy, but some issues detected');
  } else {
    console.log('🚨 Multiple services are unhealthy - investigation required');
  }

  // Close database connections
  await db.close();
  await mongodb.close();

  // Exit with appropriate code
  process.exit(healthPercentage === 100 ? 0 : 1);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Run health checks
if (require.main === module) {
  runHealthChecks();
}

module.exports = { runHealthChecks };
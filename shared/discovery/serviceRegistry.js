const redisCache = require('../cache/redis');
const logger = require('../configs/logger');

/**
 * Service Registry for service discovery
 */
class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.healthCheckInterval = 30000; // 30 seconds
    this.serviceTimeout = 60000; // 1 minute
    this.healthCheckTimer = null;
  }

  /**
   * Register a service
   * @param {Object} serviceInfo - Service information
   * @param {string} serviceInfo.name - Service name
   * @param {string} serviceInfo.version - Service version
   * @param {string} serviceInfo.host - Service host
   * @param {number} serviceInfo.port - Service port
   * @param {string} serviceInfo.protocol - Service protocol (http, grpc)
   * @param {Array} serviceInfo.endpoints - Available endpoints
   * @param {Object} serviceInfo.metadata - Additional metadata
   */
  async registerService(serviceInfo) {
    try {
      const serviceKey = `service:${serviceInfo.name}:${serviceInfo.host}:${serviceInfo.port}`;
      const registrationData = {
        ...serviceInfo,
        registeredAt: new Date().toISOString(),
        lastHeartbeat: new Date().toISOString(),
        status: 'healthy'
      };

      // Store in local registry
      this.services.set(serviceKey, registrationData);

      // Store in Redis for distributed discovery
      await redisCache.set(serviceKey, registrationData, this.serviceTimeout / 1000);

      // Add to service list
      const serviceListKey = `services:${serviceInfo.name}`;
      const existingServices = await redisCache.get(serviceListKey) || [];
      const serviceInstance = {
        host: serviceInfo.host,
        port: serviceInfo.port,
        protocol: serviceInfo.protocol,
        lastHeartbeat: registrationData.lastHeartbeat
      };

      // Remove existing instance if present
      const filteredServices = existingServices.filter(
        s => !(s.host === serviceInfo.host && s.port === serviceInfo.port)
      );
      filteredServices.push(serviceInstance);

      await redisCache.set(serviceListKey, filteredServices, this.serviceTimeout / 1000);

      logger.info(`Service registered: ${serviceInfo.name} at ${serviceInfo.host}:${serviceInfo.port}`);
      
      return true;
    } catch (error) {
      logger.error('Failed to register service:', error);
      return false;
    }
  }

  /**
   * Deregister a service
   * @param {string} name - Service name
   * @param {string} host - Service host
   * @param {number} port - Service port
   */
  async deregisterService(name, host, port) {
    try {
      const serviceKey = `service:${name}:${host}:${port}`;
      
      // Remove from local registry
      this.services.delete(serviceKey);

      // Remove from Redis
      await redisCache.del(serviceKey);

      // Update service list
      const serviceListKey = `services:${name}`;
      const existingServices = await redisCache.get(serviceListKey) || [];
      const filteredServices = existingServices.filter(
        s => !(s.host === host && s.port === port)
      );

      if (filteredServices.length > 0) {
        await redisCache.set(serviceListKey, filteredServices, this.serviceTimeout / 1000);
      } else {
        await redisCache.del(serviceListKey);
      }

      logger.info(`Service deregistered: ${name} at ${host}:${port}`);
      return true;
    } catch (error) {
      logger.error('Failed to deregister service:', error);
      return false;
    }
  }

  /**
   * Discover services by name
   * @param {string} serviceName - Name of the service to discover
   * @returns {Array} - Array of service instances
   */
  async discoverServices(serviceName) {
    try {
      const serviceListKey = `services:${serviceName}`;
      const services = await redisCache.get(serviceListKey) || [];
      
      // Filter out stale services
      const now = new Date();
      const healthyServices = services.filter(service => {
        const lastHeartbeat = new Date(service.lastHeartbeat);
        const timeDiff = now.getTime() - lastHeartbeat.getTime();
        return timeDiff < this.serviceTimeout;
      });

      return healthyServices;
    } catch (error) {
      logger.error(`Failed to discover services for ${serviceName}:`, error);
      return [];
    }
  }

  /**
   * Get a specific service instance (load balancing)
   * @param {string} serviceName - Name of the service
   * @param {string} strategy - Load balancing strategy ('round-robin', 'random')
   * @returns {Object|null} - Service instance or null
   */
  async getServiceInstance(serviceName, strategy = 'round-robin') {
    try {
      const services = await this.discoverServices(serviceName);
      
      if (services.length === 0) {
        return null;
      }

      if (services.length === 1) {
        return services[0];
      }

      switch (strategy) {
        case 'random':
          return services[Math.floor(Math.random() * services.length)];
        
        case 'round-robin':
        default:
          // Simple round-robin using timestamp
          const index = Math.floor(Date.now() / 1000) % services.length;
          return services[index];
      }
    } catch (error) {
      logger.error(`Failed to get service instance for ${serviceName}:`, error);
      return null;
    }
  }

  /**
   * Send heartbeat for a service
   * @param {string} name - Service name
   * @param {string} host - Service host
   * @param {number} port - Service port
   * @param {string} status - Service status ('healthy', 'unhealthy', 'degraded')
   */
  async sendHeartbeat(name, host, port, status = 'healthy') {
    try {
      const serviceKey = `service:${name}:${host}:${port}`;
      const service = this.services.get(serviceKey);
      
      if (service) {
        service.lastHeartbeat = new Date().toISOString();
        service.status = status;
        
        // Update in Redis
        await redisCache.set(serviceKey, service, this.serviceTimeout / 1000);
        
        // Update service list
        const serviceListKey = `services:${name}`;
        const existingServices = await redisCache.get(serviceListKey) || [];
        const serviceIndex = existingServices.findIndex(
          s => s.host === host && s.port === port
        );
        
        if (serviceIndex >= 0) {
          existingServices[serviceIndex].lastHeartbeat = service.lastHeartbeat;
          existingServices[serviceIndex].status = status;
          await redisCache.set(serviceListKey, existingServices, this.serviceTimeout / 1000);
        }
        
        return true;
      }
      
      return false;
    } catch (error) {
      logger.error('Failed to send heartbeat:', error);
      return false;
    }
  }

  /**
   * Start automatic heartbeat for a service
   * @param {string} name - Service name
   * @param {string} host - Service host
   * @param {number} port - Service port
   * @param {Function} healthCheckFn - Function to check service health
   */
  startHeartbeat(name, host, port, healthCheckFn) {
    const heartbeatInterval = setInterval(async () => {
      try {
        let status = 'healthy';
        
        if (healthCheckFn) {
          const healthResult = await healthCheckFn();
          status = healthResult.status || 'healthy';
        }
        
        await this.sendHeartbeat(name, host, port, status);
      } catch (error) {
        logger.error('Heartbeat failed:', error);
        await this.sendHeartbeat(name, host, port, 'unhealthy');
      }
    }, this.healthCheckInterval);

    // Store interval reference for cleanup
    const serviceKey = `${name}:${host}:${port}`;
    if (!this.heartbeatIntervals) {
      this.heartbeatIntervals = new Map();
    }
    this.heartbeatIntervals.set(serviceKey, heartbeatInterval);

    logger.info(`Started heartbeat for ${name} at ${host}:${port}`);
  }

  /**
   * Stop heartbeat for a service
   * @param {string} name - Service name
   * @param {string} host - Service host
   * @param {number} port - Service port
   */
  stopHeartbeat(name, host, port) {
    const serviceKey = `${name}:${host}:${port}`;
    
    if (this.heartbeatIntervals && this.heartbeatIntervals.has(serviceKey)) {
      clearInterval(this.heartbeatIntervals.get(serviceKey));
      this.heartbeatIntervals.delete(serviceKey);
      logger.info(`Stopped heartbeat for ${name} at ${host}:${port}`);
    }
  }

  /**
   * Get all registered services
   * @returns {Object} - Object with service names as keys and instances as values
   */
  async getAllServices() {
    try {
      const serviceNames = [];
      const keys = await redisCache.client?.keys('services:*') || [];
      
      const allServices = {};
      
      for (const key of keys) {
        const serviceName = key.replace('services:', '');
        const instances = await redisCache.get(key) || [];
        allServices[serviceName] = instances;
      }
      
      return allServices;
    } catch (error) {
      logger.error('Failed to get all services:', error);
      return {};
    }
  }

  /**
   * Health check for the service registry
   * @returns {Object} - Health status
   */
  async healthCheck() {
    try {
      const allServices = await this.getAllServices();
      const serviceCount = Object.keys(allServices).length;
      const totalInstances = Object.values(allServices).reduce(
        (sum, instances) => sum + instances.length, 0
      );

      return {
        status: 'healthy',
        serviceCount,
        totalInstances,
        services: allServices
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message
      };
    }
  }

  /**
   * Cleanup stale services
   */
  async cleanupStaleServices() {
    try {
      const allServices = await this.getAllServices();
      const now = new Date();
      
      for (const [serviceName, instances] of Object.entries(allServices)) {
        const healthyInstances = instances.filter(instance => {
          const lastHeartbeat = new Date(instance.lastHeartbeat);
          const timeDiff = now.getTime() - lastHeartbeat.getTime();
          return timeDiff < this.serviceTimeout;
        });
        
        if (healthyInstances.length !== instances.length) {
          const serviceListKey = `services:${serviceName}`;
          if (healthyInstances.length > 0) {
            await redisCache.set(serviceListKey, healthyInstances, this.serviceTimeout / 1000);
          } else {
            await redisCache.del(serviceListKey);
          }
          
          logger.info(`Cleaned up stale instances for ${serviceName}: ${instances.length - healthyInstances.length} removed`);
        }
      }
    } catch (error) {
      logger.error('Failed to cleanup stale services:', error);
    }
  }

  /**
   * Start periodic cleanup of stale services
   */
  startCleanup() {
    this.cleanupTimer = setInterval(() => {
      this.cleanupStaleServices();
    }, this.healthCheckInterval);
    
    logger.info('Started service registry cleanup');
  }

  /**
   * Stop periodic cleanup
   */
  stopCleanup() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
      logger.info('Stopped service registry cleanup');
    }
  }
}

// Singleton instance
const serviceRegistry = new ServiceRegistry();

module.exports = serviceRegistry;
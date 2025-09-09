const { logger } = require('../utils/logger');

class ServiceManager {
  constructor() {
    this.services = new Map();
    this.serviceConfigs = new Map();
  }

  registerService(name, serviceConfig) {
    if (this.services.has(name)) {
      throw new Error(`Service '${name}' is already registered`);
    }

    const service = {
      name,
      config: serviceConfig,
      client: null,
      status: 'stopped',
      lastHealthCheck: null,
      errorCount: 0
    };

    this.services.set(name, service);
    this.serviceConfigs.set(name, serviceConfig);
    
    logger.info(`Service '${name}' registered`);
    return service;
  }

  async initializeService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }

    try {
      const ServiceClient = require(service.config.clientPath);
      service.client = new ServiceClient(service.config.host, service.config.port);
      
      if (service.client.initialize) {
        await service.client.initialize();
      }
      
      service.status = 'running';
      service.errorCount = 0;
      logger.info(`Service '${name}' initialized successfully`);
      
      return service.client;
    } catch (error) {
      service.status = 'error';
      service.errorCount++;
      logger.error(`Failed to initialize service '${name}':`, error);
      throw error;
    }
  }

  getService(name) {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service '${name}' not found`);
    }
    return service.client;
  }

  async healthCheckService(name) {
    const service = this.services.get(name);
    if (!service || !service.client) {
      return { status: 'not_initialized' };
    }

    try {
      let health = { status: 'unknown' };
      
      if (service.client.healthCheck) {
        health = await service.client.healthCheck();
      } else if (service.client.isConnected) {
        health = { status: service.client.isConnected() ? 'healthy' : 'disconnected' };
      }
      
      service.lastHealthCheck = Date.now();
      service.status = health.status === 'healthy' ? 'running' : 'unhealthy';
      
      return health;
    } catch (error) {
      service.status = 'error';
      service.errorCount++;
      logger.error(`Health check failed for service '${name}':`, error);
      return { status: 'error', error: error.message };
    }
  }

  async healthCheckAllServices() {
    const results = {};
    
    for (const [name] of this.services) {
      results[name] = await this.healthCheckService(name);
    }
    
    return results;
  }

  getServiceStatus(name) {
    const service = this.services.get(name);
    if (!service) {
      return { status: 'not_found' };
    }

    return {
      name: service.name,
      status: service.status,
      lastHealthCheck: service.lastHealthCheck,
      errorCount: service.errorCount,
      config: {
        host: service.config.host,
        port: service.config.port
      }
    };
  }

  getAllServicesStatus() {
    const status = {};
    
    for (const [name] of this.services) {
      status[name] = this.getServiceStatus(name);
    }
    
    return status;
  }

  async stopService(name) {
    const service = this.services.get(name);
    if (!service || !service.client) {
      return;
    }

    try {
      if (service.client.close) {
        service.client.close();
      }
      service.status = 'stopped';
      logger.info(`Service '${name}' stopped`);
    } catch (error) {
      logger.error(`Error stopping service '${name}':`, error);
    }
  }

  async stopAllServices() {
    for (const [name] of this.services) {
      await this.stopService(name);
    }
  }

  unregisterService(name) {
    this.services.delete(name);
    this.serviceConfigs.delete(name);
    logger.info(`Service '${name}' unregistered`);
  }
}

module.exports = ServiceManager;

const logger = require('../configs/logger');

/**
 * Circuit Breaker States
 */
const STATES = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit is open, failing fast
  HALF_OPEN: 'HALF_OPEN' // Testing if service is back
};

/**
 * Circuit Breaker implementation for resilient service communication
 */
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'CircuitBreaker';
    this.failureThreshold = options.failureThreshold || 5;
    this.recoveryTimeout = options.recoveryTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 10000; // 10 seconds
    this.expectedErrors = options.expectedErrors || [];
    
    // State management
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    // Statistics
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenCount: 0,
      lastResetTime: Date.now()
    };
    
    // Monitoring
    this.requestTimes = [];
    this.maxRequestTimes = 100; // Keep last 100 request times
    
    logger.info(`Circuit breaker '${this.name}' initialized`, {
      failureThreshold: this.failureThreshold,
      recoveryTimeout: this.recoveryTimeout
    });
  }

  /**
   * Execute a function with circuit breaker protection
   * @param {Function} fn - Function to execute
   * @param {...any} args - Arguments to pass to the function
   * @returns {Promise} - Result of the function or circuit breaker error
   */
  async execute(fn, ...args) {
    const startTime = Date.now();
    this.stats.totalRequests++;

    // Check if circuit is open
    if (this.state === STATES.OPEN) {
      if (Date.now() < this.nextAttemptTime) {
        const error = new Error(`Circuit breaker '${this.name}' is OPEN`);
        error.circuitBreakerOpen = true;
        this.stats.circuitOpenCount++;
        throw error;
      } else {
        // Try to recover
        this.state = STATES.HALF_OPEN;
        logger.info(`Circuit breaker '${this.name}' entering HALF_OPEN state`);
      }
    }

    try {
      const result = await this._executeWithTimeout(fn, args);
      this._onSuccess(startTime);
      return result;
    } catch (error) {
      this._onFailure(error, startTime);
      throw error;
    }
  }

  /**
   * Execute function with timeout
   * @private
   */
  async _executeWithTimeout(fn, args) {
    const timeout = this.timeout || 30000; // 30 seconds default
    
    return new Promise(async (resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.stats.timeouts++;
        reject(new Error(`Circuit breaker '${this.name}' timeout after ${timeout}ms`));
      }, timeout);

      try {
        const result = await fn(...args);
        clearTimeout(timeoutId);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        reject(error);
      }
    });
  }

  /**
   * Handle successful execution
   * @private
   */
  _onSuccess(startTime) {
    const duration = Date.now() - startTime;
    this.requestTimes.push(duration);
    
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }

    this.stats.successfulRequests++;
    this.failureCount = 0;

    if (this.state === STATES.HALF_OPEN) {
      this.state = STATES.CLOSED;
      logger.info(`Circuit breaker '${this.name}' recovered to CLOSED state`);
    }
  }

  /**
   * Handle failed execution
   * @private
   */
  _onFailure(error, startTime) {
    const duration = Date.now() - startTime;
    this.requestTimes.push(duration);
    
    if (this.requestTimes.length > this.maxRequestTimes) {
      this.requestTimes.shift();
    }

    this.stats.failedRequests++;
    
    // Check if this is an expected error that shouldn't trigger circuit breaker
    if (this._isExpectedError(error)) {
      logger.debug(`Circuit breaker '${this.name}' ignoring expected error: ${error.message}`);
      return;
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    logger.warn(`Circuit breaker '${this.name}' failure ${this.failureCount}/${this.failureThreshold}`, {
      error: error.message,
      duration
    });

    // Check if we should open the circuit
    if (this.failureCount >= this.failureThreshold) {
      this._openCircuit();
    }
  }

  /**
   * Open the circuit breaker
   * @private
   */
  _openCircuit() {
    this.state = STATES.OPEN;
    this.nextAttemptTime = Date.now() + this.recoveryTimeout;
    
    logger.error(`Circuit breaker '${this.name}' opened due to ${this.failureCount} failures`, {
      nextAttemptTime: new Date(this.nextAttemptTime).toISOString()
    });
  }

  /**
   * Check if error is expected and shouldn't trigger circuit breaker
   * @private
   */
  _isExpectedError(error) {
    return this.expectedErrors.some(expectedError => {
      if (typeof expectedError === 'string') {
        return error.message.includes(expectedError);
      }
      if (expectedError instanceof RegExp) {
        return expectedError.test(error.message);
      }
      if (typeof expectedError === 'function') {
        return expectedError(error);
      }
      return false;
    });
  }

  /**
   * Get current circuit breaker status
   */
  getStatus() {
    const avgResponseTime = this.requestTimes.length > 0 
      ? this.requestTimes.reduce((a, b) => a + b, 0) / this.requestTimes.length 
      : 0;

    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttemptTime: this.nextAttemptTime,
      stats: {
        ...this.stats,
        successRate: this.stats.totalRequests > 0 
          ? (this.stats.successfulRequests / this.stats.totalRequests * 100).toFixed(2) + '%'
          : '0%',
        avgResponseTime: Math.round(avgResponseTime) + 'ms'
      }
    };
  }

  /**
   * Reset circuit breaker to closed state
   */
  reset() {
    this.state = STATES.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    
    logger.info(`Circuit breaker '${this.name}' manually reset`);
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.stats = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitOpenCount: 0,
      lastResetTime: Date.now()
    };
    this.requestTimes = [];
    
    logger.info(`Circuit breaker '${this.name}' statistics reset`);
  }
}

/**
 * Circuit Breaker Manager for managing multiple circuit breakers
 */
class CircuitBreakerManager {
  constructor() {
    this.breakers = new Map();
  }

  /**
   * Create or get a circuit breaker
   */
  getBreaker(name, options = {}) {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ name, ...options }));
    }
    return this.breakers.get(name);
  }

  /**
   * Execute function with named circuit breaker
   */
  async execute(breakerName, fn, options = {}, ...args) {
    const breaker = this.getBreaker(breakerName, options);
    return await breaker.execute(fn, ...args);
  }

  /**
   * Get status of all circuit breakers
   */
  getAllStatus() {
    const status = {};
    for (const [name, breaker] of this.breakers) {
      status[name] = breaker.getStatus();
    }
    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll() {
    for (const breaker of this.breakers.values()) {
      breaker.reset();
    }
    logger.info('All circuit breakers reset');
  }

  /**
   * Health check for all circuit breakers
   */
  healthCheck() {
    const results = {};
    let overallHealthy = true;

    for (const [name, breaker] of this.breakers) {
      const status = breaker.getStatus();
      const isHealthy = status.state === STATES.CLOSED || status.state === STATES.HALF_OPEN;
      
      results[name] = {
        healthy: isHealthy,
        state: status.state,
        successRate: status.stats.successRate,
        avgResponseTime: status.stats.avgResponseTime
      };

      if (!isHealthy) {
        overallHealthy = false;
      }
    }

    return {
      healthy: overallHealthy,
      breakers: results
    };
  }
}

// Singleton instance
const circuitBreakerManager = new CircuitBreakerManager();

module.exports = {
  CircuitBreaker,
  CircuitBreakerManager,
  circuitBreakerManager,
  STATES
};
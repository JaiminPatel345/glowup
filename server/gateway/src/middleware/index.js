const express = require('express');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const config = require('../config');
const { logger } = require('../utils/logger');

const setupMiddleware = (app) => {
  // Security middleware
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // CORS middleware
  app.use(cors(config.cors));

  // Compression middleware
  app.use(compression());

  // Body parsing middleware
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging middleware
  app.use((req, res, next) => {
    logger.debug(`${req.method} ${req.path} - ${req.ip}`);
    next();
  });

  // Error handling middleware
  app.use((err, req, res, next) => {
    logger.error(`Error handling ${req.method} ${req.path}:`, err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
    });
  });
};

module.exports = { setupMiddleware };

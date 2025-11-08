import rateLimit from 'express-rate-limit';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';

// General API rate limiter
export const generalLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100'), // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests',
    message: 'Too many requests from this IP, please try again later.'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Strict rate limiter for authentication endpoints
export const authLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 15 * 60 * 1000, // 1 second in test, 15 minutes in production
  max: process.env.NODE_ENV === 'test' ? 1000 : 5, // 1000 requests in test, 5 in production
  message: {
    success: false,
    error: 'Too many authentication attempts',
    message: 'Too many authentication attempts from this IP, please try again after 15 minutes.'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful requests
});

// Password reset rate limiter
export const passwordResetLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    error: 'Too many password reset attempts',
    message: 'Too many password reset attempts from this IP, please try again after 1 hour.'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});

// Registration rate limiter
export const registrationLimiter = rateLimit({
  windowMs: process.env.NODE_ENV === 'test' ? 1000 : 60 * 60 * 1000, // 1 second in test, 1 hour in production
  max: process.env.NODE_ENV === 'test' ? 1000 : 3, // 1000 requests in test, 3 in production
  message: {
    success: false,
    error: 'Too many registration attempts',
    message: 'Too many registration attempts from this IP, please try again after 1 hour.'
  } as ApiResponse,
  standardHeaders: true,
  legacyHeaders: false,
});
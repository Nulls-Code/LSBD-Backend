import rateLimit from 'express-rate-limit';
import config from '../config';
import { sendError } from '../lib/response';

/**
 * General API rate limiter.
 * Protects endpoints from excessive traffic.
 */
export const apiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(res, 429, 'TOO_MANY_REQUESTS', 'Too many requests, please try again later.');
  },
});

/**
 * Strict rate limiter for authentication endpoints (e.g. /login).
 * Prevents brute-force password guessing and credential stuffing attacks.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Max 10 attempts per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many authentication attempts. Please try again after 15 minutes.',
    );
  },
});

/**
 * Public rate limiter for customer tracking endpoints.
 * Deter automated scraping while remaining accessible to humans.
 */
export const publicRateLimiter = rateLimit({
  windowMs: config.publicRateLimit.windowMs,
  max: config.publicRateLimit.maxRequests,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Tracking request limit exceeded. Please try again later.',
    );
  },
});

/**
 * Intake rate limiter for the public courier request submission endpoint.
 * Applied to unauthenticated POST /courier-requests to prevent DB flooding
 * and expensive customer upsert chains from anonymous actors.
 */
export const intakeRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,                   // 20 intake submissions per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    sendError(
      res,
      429,
      'TOO_MANY_REQUESTS',
      'Too many requests from this IP. Please try again after 15 minutes.',
    );
  },
});

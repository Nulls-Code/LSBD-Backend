import { Request, Response, NextFunction } from 'express';
import { AppError, ValidationError } from '../lib/errors';
import { sendError } from '../lib/response';
import config from '../config';

/**
 * Centralized error handler middleware.
 *
 * Must be registered LAST in the Express middleware chain.
 *
 * Handles:
 * - AppError subclasses → returns the appropriate status code and error details
 * - Prisma known errors → maps to user-friendly messages
 * - Unknown errors → returns 500 without leaking internal details
 */
export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Log the full error in all environments
  console.error(`[ERROR] ${err.message}`, {
    name: err.name,
    stack: config.isDevelopment() ? err.stack : undefined,
  });

  // Known operational errors
  if (err instanceof ValidationError) {
    sendError(res, err.statusCode, err.code, err.message, err.errors);
    return;
  }

  if (err instanceof AppError) {
    sendError(res, err.statusCode, err.code, err.message);
    return;
  }

  // Prisma known request errors (e.g., unique constraint violations)
  if (err.constructor.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as Error & { code: string; meta?: { target?: string[] } };

    if (prismaError.code === 'P2002') {
      const target = prismaError.meta?.target?.join(', ') || 'field';
      sendError(res, 409, 'CONFLICT', `A record with this ${target} already exists`);
      return;
    }

    if (prismaError.code === 'P2025') {
      sendError(res, 404, 'NOT_FOUND', 'The requested record was not found');
      return;
    }
  }

  // Unexpected errors — never leak internal details in production
  const message = config.isDevelopment()
    ? err.message
    : 'An unexpected error occurred';

  sendError(res, 500, 'INTERNAL_ERROR', message);
}

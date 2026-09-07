/**
 * Custom error classes for the application.
 *
 * All operational errors extend AppError, which carries:
 * - An HTTP status code
 * - A user-safe message
 * - An optional error code for client-side handling
 *
 * These are caught by the centralized error handler middleware.
 * Non-AppError exceptions are treated as unexpected 500 errors.
 */

export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;

  constructor(message: string, statusCode: number, code: string = 'ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    // Preserve proper stack trace in V8
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

// ========================
// 400 — Bad Request
// ========================

export class BadRequestError extends AppError {
  constructor(message: string = 'Bad request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class ValidationError extends AppError {
  public readonly errors: Record<string, string[]>;

  constructor(errors: Record<string, string[]>, message: string = 'Validation failed') {
    super(message, 400, 'VALIDATION_ERROR');
    this.errors = errors;
  }
}

// ========================
// 401 — Unauthorized
// ========================

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

// ========================
// 403 — Forbidden
// ========================

export class ForbiddenError extends AppError {
  constructor(message: string = 'Insufficient permissions') {
    super(message, 403, 'FORBIDDEN');
  }
}

// ========================
// 404 — Not Found
// ========================

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
  }
}

// ========================
// 409 — Conflict
// ========================

export class ConflictError extends AppError {
  constructor(message: string = 'Resource already exists') {
    super(message, 409, 'CONFLICT');
  }
}

// ========================
// 429 — Too Many Requests
// ========================

export class TooManyRequestsError extends AppError {
  constructor(message: string = 'Too many requests, please try again later') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

import { Response } from 'express';

/**
 * Standardized API response structure.
 *
 * Every response from this API follows the same shape:
 *
 * Success:
 * {
 *   success: true,
 *   data: T,
 *   message?: string,
 *   meta?: { page, limit, total, totalPages }
 * }
 *
 * Error:
 * {
 *   success: false,
 *   error: {
 *     code: string,
 *     message: string,
 *     errors?: Record<string, string[]>   // validation errors
 *   }
 * }
 *
 * This ensures clients can always check `response.success` and know
 * exactly what shape to expect.
 */

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SuccessResponse<T> {
  success: true;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    errors?: Record<string, string[]>;
  };
}

/**
 * Send a successful response.
 */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode: number = 200,
  message?: string,
  meta?: PaginationMeta,
): void {
  const response: SuccessResponse<T> = {
    success: true,
    data,
    ...(message && { message }),
    ...(meta && { meta }),
  };

  res.status(statusCode).json(response);
}

/**
 * Send a created (201) response.
 */
export function sendCreated<T>(res: Response, data: T, message?: string): void {
  sendSuccess(res, data, 201, message);
}

/**
 * Send a no-content (204) response.
 */
export function sendNoContent(res: Response): void {
  res.status(204).send();
}

/**
 * Send an error response.
 */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  errors?: Record<string, string[]>,
): void {
  const response: ErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(errors && { errors }),
    },
  };

  res.status(statusCode).json(response);
}

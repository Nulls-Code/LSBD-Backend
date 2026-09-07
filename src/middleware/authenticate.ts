import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import config from '../config';
import { UnauthorizedError } from '../lib/errors';
import { JwtPayload } from '../types';

/**
 * Authentication middleware.
 *
 * Verifies the JWT access token from the Authorization header.
 * On success, attaches the decoded payload to `req.user`.
 * On failure, throws UnauthorizedError (caught by errorHandler).
 *
 * Expected header format: `Authorization: Bearer <token>`
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.split(' ')[1];
  } else if (req.cookies && req.cookies.accessToken) {
    token = req.cookies.accessToken;
  }

  if (!token) {
    throw new UnauthorizedError('Authentication token required');
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new UnauthorizedError('Token has expired');
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new UnauthorizedError('Invalid token');
    }
    throw new UnauthorizedError('Authentication failed');
  }
}

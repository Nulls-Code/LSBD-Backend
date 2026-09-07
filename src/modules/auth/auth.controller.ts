import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';
import { sendSuccess, sendCreated } from '../../lib/response';
import { UnauthorizedError } from '../../lib/errors';

/**
 * Cookie options as specified for browser persistence.
 */
export const COOKIE_OPTIONS = {
  accessToken: {
    httpOnly: true,
    secure: false,
    sameSite: 'none' as const,
    maxAge: 1000 * 60 * 60 * 24, // 24 hours / 1 day
  },
  refreshToken: {
    httpOnly: true,
    secure: false,
    sameSite: 'none' as const,
    maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
  },
};

/**
 * Set authentication cookies on the response.
 */
export function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('accessToken', accessToken, COOKIE_OPTIONS.accessToken);
  res.cookie('refreshToken', refreshToken, COOKIE_OPTIONS.refreshToken);
}

/**
 * Clear authentication cookies on logout.
 */
export function clearAuthCookies(res: Response): void {
  res.clearCookie('accessToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'none',
  });
  res.clearCookie('refreshToken', {
    httpOnly: true,
    secure: false,
    sameSite: 'none',
  });
}

/**
 * Register a new user (Admin only).
 */
export async function registerUser(req: Request, res: Response, next: NextFunction) {
  try {
    const creatorRole = req.user?.role;
    const user = await authService.register(req.body, creatorRole);
    sendCreated(res, user, 'User registered successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Authenticate with email/password and set HTTP-only cookies.
 */
export async function loginUser(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await authService.login(req.body);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, result, 200, 'Login successful');
  } catch (error) {
    next(error);
  }
}

/**
 * Refresh access token using cookie or body payload.
 */
export async function refreshToken(req: Request, res: Response, next: NextFunction) {
  try {
    const token = req.body?.refreshToken || req.cookies?.refreshToken;
    if (!token) {
      throw new UnauthorizedError('Refresh token is required');
    }
    const result = await authService.refreshAccessToken(token);
    setAuthCookies(res, result.accessToken, result.refreshToken);
    sendSuccess(res, result, 200, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Log out user by clearing auth cookies.
 */
export async function logoutUser(_req: Request, res: Response, next: NextFunction) {
  try {
    clearAuthCookies(res);
    sendSuccess(res, null, 200, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
}

/**
 * Retrieve current authenticated user profile.
 */
export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const user = await authService.getProfile(req.user.userId);
    sendSuccess(res, user);
  } catch (error) {
    next(error);
  }
}

/**
 * Change current user password.
 */
export async function changePassword(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }
    const result = await authService.changePassword(req.user.userId, req.body);
    sendSuccess(res, result, 200, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
}

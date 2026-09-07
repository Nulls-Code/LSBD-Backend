import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import prisma from '../../config/prisma';
import config from '../../config';
import { JwtPayload } from '../../types';
import {
  BadRequestError,
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
} from '../../lib/errors';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schemas';
import { UserRole } from '@prisma/client';

/**
 * Auth service — handles registration, login, and token management.
 *
 * All business logic lives here, not in the controller.
 * The controller only handles HTTP concerns (req/res).
 */

// ========================
// Token generation helpers
// ========================

function generateAccessToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.secret, {
    expiresIn: config.jwt.expiresIn as jwt.SignOptions['expiresIn'],
  });
}

function generateRefreshToken(payload: JwtPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiresIn as jwt.SignOptions['expiresIn'],
  });
}

function generateTokenPair(payload: JwtPayload) {
  return {
    accessToken: generateAccessToken(payload),
    refreshToken: generateRefreshToken(payload),
  };
}

/**
 * Sanitize a user record for API responses.
 * Strips passwordHash and returns only safe fields.
 */
function sanitizeUser(user: {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

// ========================
// Service methods
// ========================

/**
 * Register a new internal user.
 *
 * Only ADMINs can register new users.
 * Passwords are hashed with bcrypt before storage.
 */
export async function register(data: RegisterInput, creatorRole?: UserRole) {
  // Only admins can create new users
  if (creatorRole && creatorRole !== 'ADMIN') {
    throw new ForbiddenError('Only administrators can register new users');
  }

  // Check if email is already taken
  const existingUser = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  // Hash the password
  const passwordHash = await bcrypt.hash(data.password, config.bcrypt.saltRounds);

  // Create the user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      passwordHash,
      firstName: data.firstName,
      lastName: data.lastName,
      role: data.role as UserRole,
    },
  });

  return sanitizeUser(user);
}

/**
 * Authenticate a user with email and password.
 *
 * Returns an access token and a refresh token on success.
 * Uses constant-time comparison via bcrypt.compare to prevent timing attacks.
 */
export async function login(data: LoginInput) {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    // Use the same error message whether the email or password is wrong
    // to prevent email enumeration attacks
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is active
  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated. Contact an administrator.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 *
 * Verifies the refresh token, checks if the user still exists and is active,
 * then issues a new token pair.
 */
export async function refreshAccessToken(refreshToken: string) {
  let decoded: JwtPayload;

  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Verify the user still exists and is active
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
  });

  if (!user) {
    throw new UnauthorizedError('User no longer exists');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated');
  }

  // Generate new token pair
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Get the current authenticated user's profile.
 */
export async function getProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  return sanitizeUser(user);
}

/**
 * Change authenticated user's password.
 */
export async function changePassword(userId: string, data: ChangePasswordInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new UnauthorizedError('User not found');
  }

  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated');
  }

  const isCurrentPasswordValid = await bcrypt.compare(data.currentPassword, user.passwordHash);
  if (!isCurrentPasswordValid) {
    throw new BadRequestError('Current password is incorrect');
  }

  const isSamePassword = await bcrypt.compare(data.newPassword, user.passwordHash);
  if (isSamePassword) {
    throw new BadRequestError('New password must be different from current password');
  }

  const newPasswordHash = await bcrypt.hash(data.newPassword, config.bcrypt.saltRounds);

  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: newPasswordHash },
  });

  return { message: 'Password changed successfully' };
}


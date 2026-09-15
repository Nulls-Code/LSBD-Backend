import crypto from 'crypto';
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
  TooManyRequestsError,
} from '../../lib/errors';
import { RegisterInput, LoginInput, ChangePasswordInput } from './auth.schemas';
import { UserRole } from '@prisma/client';

/**
 * Auth service — handles registration, login, and token management.
 *
 * All business logic lives here, not in the controller.
 * The controller only handles HTTP concerns (req/res).
 */

// Refresh token TTL must stay in sync with JWT_REFRESH_EXPIRES_IN (7 days)
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// ========================
// SEC-16: Security audit log
// ========================
//
// Emits structured JSON events for critical authentication actions.
// These stream to stdout and can be ingested by any log aggregator
// (CloudWatch, Datadog, ELK) without additional dependencies.

type AuditEventType =
  | 'LOGIN_SUCCESS'
  | 'LOGIN_FAILURE'
  | 'LOGIN_LOCKED'
  | 'LOGOUT'
  | 'TOKEN_REFRESHED'
  | 'TOKEN_REUSE_DETECTED'
  | 'PASSWORD_CHANGED';

function auditLog(event: AuditEventType, context: Record<string, unknown>): void {
  console.log(
    JSON.stringify({
      audit: true,
      timestamp: new Date().toISOString(),
      event,
      ...context,
    }),
  );
}

// ========================
// SEC-05: Per-email login lockout
// ========================
//
// Tracks failed login attempts per email address to defend against
// credential-stuffing attacks that rotate source IPs (bypassing IP-only limits).
//
// NOTE: This store is in-memory and therefore single-instance only.
// Replace with a Redis-backed store for horizontally-scaled deployments.

const MAX_FAILED_ATTEMPTS = 5;        // lock after this many consecutive failures
const ATTEMPT_WINDOW_MS  = 15 * 60 * 1000; // rolling window: 15 minutes
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // lockout duration: 15 minutes

interface FailedAttemptRecord {
  count: number;
  firstAttemptAt: number;
  lockedUntil?: number;
}

const failedLoginMap = new Map<string, FailedAttemptRecord>();

/**
 * Throws TooManyRequestsError if the email is currently locked out.
 * Clears stale records that have expired beyond the attempt window.
 */
function assertNotLockedOut(email: string): void {
  const record = failedLoginMap.get(email);
  if (!record) return;

  const now = Date.now();

  if (record.lockedUntil && now < record.lockedUntil) {
    const remainingMin = Math.ceil((record.lockedUntil - now) / 60_000);
    auditLog('LOGIN_LOCKED', { email, remainingMin });
    throw new TooManyRequestsError(
      `Account temporarily locked due to too many failed login attempts. Try again in ${remainingMin} minute(s).`,
    );
  }

  // Clear records outside the rolling window so stale data never blocks a user
  if (now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    failedLoginMap.delete(email);
  }
}

/** Records a failed login attempt and locks the account when the threshold is reached. */
function recordFailedAttempt(email: string): void {
  const now = Date.now();
  const record = failedLoginMap.get(email);

  if (!record || now - record.firstAttemptAt > ATTEMPT_WINDOW_MS) {
    // First failure (or previous window expired): start a fresh record
    failedLoginMap.set(email, { count: 1, firstAttemptAt: now });
    return;
  }

  const newCount = record.count + 1;
  if (newCount >= MAX_FAILED_ATTEMPTS) {
    // Threshold reached — impose lockout
    failedLoginMap.set(email, { ...record, count: newCount, lockedUntil: now + LOCKOUT_DURATION_MS });
  } else {
    failedLoginMap.set(email, { ...record, count: newCount });
  }
}

/** Clears failed-attempt records after a successful login. */
function clearFailedAttempts(email: string): void {
  failedLoginMap.delete(email);
}

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
 * Hash a refresh token for safe storage.
 *
 * We store a SHA-256 hash rather than the raw token so that a DB breach
 * does not expose usable refresh tokens. bcrypt is unnecessary here because
 * the token itself already has 256 bits of entropy (no dictionary attack risk).
 */
function hashRefreshToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Persist a hashed refresh token in the database.
 */
async function storeRefreshToken(userId: string, refreshToken: string): Promise<void> {
  await prisma.refreshToken.create({
    data: {
      userId,
      tokenHash: hashRefreshToken(refreshToken),
      expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    },
  });
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
 *
 * SEC-03: The issued refresh token is hashed and stored in `refresh_tokens`.
 * SEC-05: Per-email lockout prevents credential-stuffing attacks that bypass
 *         per-IP rate limits by rotating source addresses.
 */
export async function login(data: LoginInput) {
  // SEC-05: Reject immediately if this email is currently locked out
  assertNotLockedOut(data.email);

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    // Count as a failed attempt (same message to prevent email enumeration)
    recordFailedAttempt(data.email);
    auditLog('LOGIN_FAILURE', { email: data.email, reason: 'user_not_found' });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Check if account is active — do NOT count this as a brute-force attempt
  if (!user.isActive) {
    throw new ForbiddenError('Your account has been deactivated. Contact an administrator.');
  }

  // Verify password
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);

  if (!isPasswordValid) {
    recordFailedAttempt(data.email);
    auditLog('LOGIN_FAILURE', { email: data.email, userId: user.id, reason: 'wrong_password' });
    throw new UnauthorizedError('Invalid email or password');
  }

  // Success — reset the failure counter
  clearFailedAttempts(data.email);
  auditLog('LOGIN_SUCCESS', { email: user.email, userId: user.id, role: user.role });

  // Generate tokens
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);

  // Lazy cleanup: purge expired tokens for this user to keep the table lean
  await prisma.refreshToken.deleteMany({
    where: { userId: user.id, expiresAt: { lt: new Date() } },
  });

  // Persist hashed refresh token for server-side revocation (SEC-03)
  await storeRefreshToken(user.id, tokens.refreshToken);

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Refresh an access token using a valid refresh token.
 *
 * SEC-03: Implements full token rotation with reuse detection:
 *   1. Verify the JWT signature.
 *   2. Look up the hashed token in the DB — reject if missing.
 *   3. If already revoked (reuse detected), revoke ALL active tokens for
 *      that user (token family compromise response) and reject.
 *   4. Revoke the presented token (it must never be reusable again).
 *   5. Issue and persist a fresh token pair.
 */
export async function refreshAccessToken(refreshToken: string) {
  // Step 1 — Verify JWT signature
  let decoded: JwtPayload;
  try {
    decoded = jwt.verify(refreshToken, config.jwt.refreshSecret) as JwtPayload;
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Step 2 — Look up the stored token record
  const tokenHash = hashRefreshToken(refreshToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });

  if (!storedToken) {
    // Token was never issued by this server (forged) or already deleted
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  // Step 3 — Token reuse detection
  if (storedToken.revokedAt !== null) {
    // A revoked token is being presented — assume it was stolen.
    // Revoke the entire active session family for this user as a precaution.
    await prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    auditLog('TOKEN_REUSE_DETECTED', { userId: storedToken.userId });
    throw new UnauthorizedError(
      'Refresh token has already been used. All sessions have been revoked for security. Please log in again.',
    );
  }

  // Belt-and-suspenders expiry check (JWT validates this too, but DB is source of truth)
  if (storedToken.expiresAt < new Date()) {
    throw new UnauthorizedError('Refresh token has expired');
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

  // Step 4 — Revoke the old token (rotation: it must never be usable again)
  await prisma.refreshToken.update({
    where: { tokenHash },
    data: { revokedAt: new Date() },
  });

  // Step 5 — Issue and persist the new token pair
  const tokenPayload: JwtPayload = {
    userId: user.id,
    email: user.email,
    role: user.role,
  };

  const tokens = generateTokenPair(tokenPayload);
  await storeRefreshToken(user.id, tokens.refreshToken);
  auditLog('TOKEN_REFRESHED', { userId: user.id, role: user.role });

  return {
    user: sanitizeUser(user),
    ...tokens,
  };
}

/**
 * Revoke the provided refresh token on logout.
 *
 * SEC-03: Server-side revocation ensures a stolen refresh token cannot
 * be used after the user explicitly logs out.
 *
 * Gracefully no-ops if no token is provided (e.g. already-expired cookie).
 */
export async function logout(refreshToken: string | undefined): Promise<void> {
  if (!refreshToken) return;

  const tokenHash = hashRefreshToken(refreshToken);

  // updateMany silently ignores missing/already-revoked tokens
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
  auditLog('LOGOUT', { tokenHashPrefix: tokenHash.substring(0, 8) });
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


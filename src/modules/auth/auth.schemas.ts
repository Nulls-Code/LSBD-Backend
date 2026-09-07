import { z } from 'zod/v4';

/**
 * Validation schemas for the auth module.
 *
 * All input from the outside world passes through these schemas
 * before touching any business logic.
 */

export const registerSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
  firstName: z
    .string()
    .min(1, 'First name is required')
    .max(100, 'First name must not exceed 100 characters')
    .trim(),
  lastName: z
    .string()
    .min(1, 'Last name is required')
    .max(100, 'Last name must not exceed 100 characters')
    .trim(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional().default('EMPLOYEE'),
});

export const loginSchema = z.object({
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  password: z
    .string()
    .min(1, 'Password is required'),
});

export const refreshTokenSchema = z
  .object({
    refreshToken: z
      .string()
      .min(1, 'Refresh token must not be empty')
      .optional(),
  })
  .optional();

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .max(128, 'New password must not exceed 128 characters')
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'New password must contain at least one uppercase letter, one lowercase letter, and one number',
    ),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;


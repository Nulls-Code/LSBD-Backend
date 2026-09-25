import { z } from 'zod/v4';
import { stripHtml } from '../../lib/sanitize';

/**
 * Validation schemas for the users module.
 */

export const userIdParamSchema = z.object({
  id: z.string().uuid('Invalid user ID format'),
});

export const queryUsersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false', 'all'])])
    .optional()
    .transform((val) => {
      if (val === true || val === 'true') return true;
      if (val === false || val === 'false') return false;
      return undefined;
    }),
});

export const updateUserSchema = z.object({
  firstName: z
    .string()
    .min(1, 'First name must not be empty')
    .max(100, 'First name must not exceed 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  lastName: z
    .string()
    .min(1, 'Last name must not be empty')
    .max(100, 'Last name must not exceed 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim())
    .optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'EMPLOYEE']).optional(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean(),
});

export const resetUserPasswordSchema = z.object({
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128, 'Password must not exceed 128 characters')
    // SEC-08: consistent with all other password-setting paths
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?])/,
      'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character',
    ),
});

export type QueryUsersInput = z.infer<typeof queryUsersSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserStatusInput = z.infer<typeof updateUserStatusSchema>;
export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

import { z } from 'zod/v4';
import { stripHtml } from '../../lib/sanitize';

/**
 * Validation schemas for the locations module.
 */

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .transform(stripHtml),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must not exceed 20 characters')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Code must contain only alphanumeric characters, hyphens, and underscores',
    )
    .transform((val) => val.toUpperCase().trim()),
  city: z
    .string()
    .min(1, 'City is required')
    .max(100, 'City must not exceed 100 characters')
    .trim()
    .transform(stripHtml),
  country: z
    .string()
    .min(1, 'Country is required')
    .max(100, 'Country must not exceed 100 characters')
    .trim()
    .transform(stripHtml),
  address: z
    .string()
    .max(255, 'Address must not exceed 255 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

export const updateLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must not be empty')
    .max(100, 'Name must not exceed 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(20, 'Code must not exceed 20 characters')
    .regex(
      /^[A-Za-z0-9_-]+$/,
      'Code must contain only alphanumeric characters, hyphens, and underscores',
    )
    .transform((val) => val.toUpperCase().trim())
    .optional(),
  city: z
    .string()
    .min(1, 'City must not be empty')
    .max(100, 'City must not exceed 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  country: z
    .string()
    .min(1, 'Country must not be empty')
    .max(100, 'Country must not exceed 100 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  address: z
    .string()
    .max(255, 'Address must not exceed 255 characters')
    .trim()
    .transform(stripHtml)
    .nullable()
    .optional(),
});

export const updateLocationStatusSchema = z.object({
  isActive: z.boolean(),
});

export const locationIdParamSchema = z.object({
  id: z.string().uuid('Invalid location ID format'),
});

export const queryLocationsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  isActive: z
    .enum(['true', 'false', 'all'])
    .optional()
    .transform((val) => {
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    }),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;
export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;
export type UpdateLocationStatusInput = z.infer<typeof updateLocationStatusSchema>;
export type QueryLocationsInput = z.infer<typeof queryLocationsSchema>;

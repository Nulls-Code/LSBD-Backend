import { z } from 'zod/v4';
import { stripHtml } from '../../lib/sanitize';

/**
 * Validation schemas for the customers module.
 */

export const customerIdParamSchema = z.object({
  id: z.string().uuid('Invalid customer ID format'),
});

export const queryCustomersSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
});

export const createCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .transform(stripHtml),
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim()),
  phone: z
    .string()
    .min(1, 'Phone number is required')
    .max(30, 'Phone number must not exceed 30 characters')
    .trim(),
  company: z
    .string()
    .max(200, 'Company name must not exceed 200 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

export const updateCustomerSchema = z.object({
  name: z
    .string()
    .min(1, 'Name must not be empty')
    .max(200, 'Name must not exceed 200 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
  email: z
    .string()
    .email('Invalid email address')
    .transform((val) => val.toLowerCase().trim())
    .optional(),
  phone: z
    .string()
    .min(1, 'Phone number must not be empty')
    .max(30, 'Phone number must not exceed 30 characters')
    .trim()
    .optional(),
  company: z
    .string()
    .max(200, 'Company name must not exceed 200 characters')
    .trim()
    .transform(stripHtml)
    .nullish(),
});

export type QueryCustomersInput = z.infer<typeof queryCustomersSchema>;
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;

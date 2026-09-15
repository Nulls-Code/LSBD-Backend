import { z } from 'zod/v4';
import { stripHtml } from '../../lib/sanitize';

/**
 * Validation schemas for the courier requests module.
 */

export const requestIdParamSchema = z.object({
  id: z.string().uuid('Invalid request ID format'),
});

export const createCourierRequestSchema = z.object({
  // Sender information
  senderName: z
    .string()
    .min(1, 'Sender name is required')
    .max(200, 'Sender name must not exceed 200 characters')
    .trim()
    .transform(stripHtml),
  senderPhone: z
    .string()
    .min(1, 'Sender phone is required')
    .max(30, 'Sender phone must not exceed 30 characters')
    .trim(),
  senderEmail: z
    .string()
    .email('Invalid sender email address')
    .transform((val) => val.toLowerCase().trim()),
  senderAddress: z
    .string()
    .min(1, 'Sender address is required')
    .max(500, 'Sender address must not exceed 500 characters')
    .trim()
    .transform(stripHtml),
  senderCompany: z
    .string()
    .max(200, 'Company name must not exceed 200 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  // Recipient information
  recipientName: z
    .string()
    .min(1, 'Recipient name is required')
    .max(200, 'Recipient name must not exceed 200 characters')
    .trim()
    .transform(stripHtml),
  recipientPhone: z
    .string()
    .min(1, 'Recipient phone is required')
    .max(30, 'Recipient phone must not exceed 30 characters')
    .trim(),
  recipientEmail: z
    .string()
    .email('Invalid recipient email address')
    .transform((val) => val.toLowerCase().trim())
    .optional(),
  recipientAddress: z
    .string()
    .min(1, 'Recipient address is required')
    .max(500, 'Recipient address must not exceed 500 characters')
    .trim()
    .transform(stripHtml),

  // Routing
  originLocationId: z.string().uuid('Invalid origin location ID'),
  destinationLocationId: z.string().uuid('Invalid destination location ID'),

  // Package details
  packageDescription: z
    .string()
    .min(1, 'Package description is required')
    .max(1000, 'Package description must not exceed 1000 characters')
    .trim()
    .transform(stripHtml),
  packageWeight: z
    .number()
    .positive('Package weight must be positive')
    .optional(),
  weightUnit: z.enum(['KG', 'LB']).optional(),
  packageCount: z
    .number()
    .int('Package count must be a whole number')
    .min(1, 'Package count must be at least 1')
    .default(1),
  requestNotes: z
    .string()
    .max(1000, 'Request notes must not exceed 1000 characters')
    .trim()
    .transform(stripHtml)
    .optional(),

  // Optional explicit customer link
  customerId: z.string().uuid('Invalid customer ID').optional(),
}).refine(
  (data) => data.originLocationId !== data.destinationLocationId,
  {
    message: 'Origin and destination locations must be different',
    path: ['destinationLocationId'],
  },
);

export const queryCourierRequestsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
  search: z.string().trim().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']).optional(),
  originLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const reviewCourierRequestSchema = z.object({
  action: z.enum(['APPROVE', 'REJECT']),
  reviewNotes: z
    .string()
    .max(500, 'Review notes must not exceed 500 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

export const cancelCourierRequestSchema = z.object({
  reason: z
    .string()
    .max(500, 'Cancellation reason must not exceed 500 characters')
    .trim()
    .transform(stripHtml)
    .optional(),
});

export type CreateCourierRequestInput = z.infer<typeof createCourierRequestSchema>;
export type QueryCourierRequestsInput = z.infer<typeof queryCourierRequestsSchema>;
export type ReviewCourierRequestInput = z.infer<typeof reviewCourierRequestSchema>;
export type CancelCourierRequestInput = z.infer<typeof cancelCourierRequestSchema>;

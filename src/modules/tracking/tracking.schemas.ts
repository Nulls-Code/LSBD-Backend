import { z } from 'zod';
import { ShipmentStatus } from '@prisma/client';
import { stripHtml } from '../../lib/sanitize';

export const addTrackingUpdateSchema = {
  params: z.object({
    id: z.string().uuid('Invalid shipment ID'),
  }),
  body: z.object({
    locationId: z.string().uuid('Invalid location ID').optional(),
    status: z.nativeEnum(ShipmentStatus),
    // SEC-13: strip HTML from the public-facing description field
    description: z.string().trim().transform(stripHtml).optional(),
    isPublic: z.boolean().default(true),
    timestamp: z.string().datetime().optional(),
  }),
};

export const getTrackingHistorySchema = {
  params: z.object({
    id: z.string().uuid('Invalid shipment ID'),
  }),
};

export const getPublicTrackingSchema = {
  params: z.object({
    trackingNumber: z
      .string()
      // SEC-15: use \d{5,} (5 or more digits) instead of \d{5} (exactly 5).
      // The tracking number generator uses padStart(5,'0') and will produce
      // 6-digit+ suffixes once the monthly counter exceeds 99,999.
      .regex(/^LSBD-\d{6}-\d{5,}$/, 'Invalid tracking number format'),
  }),
};

export type AddTrackingUpdateInput = z.infer<typeof addTrackingUpdateSchema.body>;

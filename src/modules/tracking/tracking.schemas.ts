import { z } from 'zod';
import { ShipmentStatus } from '@prisma/client';

export const addTrackingUpdateSchema = {
  params: z.object({
    id: z.string().uuid('Invalid shipment ID'),
  }),
  body: z.object({
    locationId: z.string().uuid('Invalid location ID').optional(),
    status: z.nativeEnum(ShipmentStatus),
    description: z.string().optional(),
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
      .regex(/^LSBD-\d{6}-\d{5}$/, 'Invalid tracking number format'),
  }),
};

export type AddTrackingUpdateInput = z.infer<typeof addTrackingUpdateSchema.body>;

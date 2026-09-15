import { z } from 'zod';
import { ShipmentStatus } from '@prisma/client';
import { stripHtml } from '../../lib/sanitize';

const querySchema = z.object({
  page: z.coerce.number().min(1).optional().default(1),
  limit: z.coerce.number().min(1).max(100).optional().default(20),
  currentStatus: z.nativeEnum(ShipmentStatus).optional(),
  originLocationId: z.string().uuid().optional(),
  destinationLocationId: z.string().uuid().optional(),
  assignedToId: z.string().uuid().optional(),
  trackingNumber: z.string().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});

export const queryShipmentsSchema = {
  query: querySchema,
};

export type QueryShipmentsInput = z.infer<typeof querySchema>;

const updateBodySchema = z.object({
  assignedToId: z.string().uuid().nullable().optional(),
  estimatedDeliveryDate: z.coerce.date().nullable().optional(),
  // SEC-13: strip HTML from internal notes to prevent stored XSS
  internalNotes: z.string().trim().transform(stripHtml).nullable().optional(),
}).refine((data) => Object.keys(data).length > 0, {
  message: 'At least one field must be provided for update',
});

export const updateShipmentSchema = {
  body: updateBodySchema,
  params: z.object({
    id: z.string().uuid(),
  }),
};

export type UpdateShipmentInput = z.infer<typeof updateBodySchema>;

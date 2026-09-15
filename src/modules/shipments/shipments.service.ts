import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { NotFoundError } from '../../lib/errors';
import { QueryShipmentsInput, UpdateShipmentInput } from './shipments.schemas';

const shipmentListSelect = {
  id: true,
  trackingNumber: true,
  currentStatus: true,
  senderName: true,
  recipientName: true,
  originLocation: {
    select: { id: true, name: true, code: true, city: true, country: true },
  },
  destinationLocation: {
    select: { id: true, name: true, code: true, city: true, country: true },
  },
  currentLocation: {
    select: { id: true, name: true, code: true, city: true, country: true },
  },
  estimatedDeliveryDate: true,
  assignedTo: {
    select: { id: true, firstName: true, lastName: true },
  },
  createdAt: true,
  updatedAt: true,
} as const;

/**
 * Atomic tracking number generation within a transaction.
 */
export async function generateTrackingNumberTx(tx: Prisma.TransactionClient, yearMonth: string): Promise<string> {
  // We use raw SQL to ensure atomicity and lock the row for the transaction
  const result = await tx.$queryRaw<{ last_count: number }[]>`
    INSERT INTO tracking_counters (id, year_month, last_count)
    VALUES (gen_random_uuid(), ${yearMonth}, 1)
    ON CONFLICT (year_month)
    DO UPDATE SET last_count = tracking_counters.last_count + 1
    RETURNING last_count;
  `;

  if (!result || result.length === 0) {
    throw new Error('Failed to generate tracking number');
  }

  const count = result[0].last_count;
  // Pad with zeroes up to 5 digits, but allow it to exceed if it goes over
  const paddedCount = count.toString().padStart(5, '0');
  
  return `LSBD-${yearMonth}-${paddedCount}`;
}

/**
 * Creates a shipment upon courier request approval.
 */
export async function createShipmentTx(
  tx: Prisma.TransactionClient,
  courierRequest: Prisma.CourierRequestGetPayload<{ include: { originLocation: true; destinationLocation: true } }>,
  creatorId: string
) {
  // Generate tracking number
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const yearMonth = `${year}${month}`; // e.g. "202609"


  const trackingNumber = await generateTrackingNumberTx(tx, yearMonth);

  // Create the shipment
  const shipment = await tx.shipment.create({
    data: {
      trackingNumber,
      courierRequestId: courierRequest.id,
      senderName: courierRequest.senderName,
      senderPhone: courierRequest.senderPhone,
      senderAddress: courierRequest.senderAddress,
      recipientName: courierRequest.recipientName,
      recipientPhone: courierRequest.recipientPhone,
      recipientAddress: courierRequest.recipientAddress,
      originLocationId: courierRequest.originLocationId,
      destinationLocationId: courierRequest.destinationLocationId,
      currentLocationId: courierRequest.originLocationId,
      currentStatus: 'PROCESSING',
      packageDescription: courierRequest.packageDescription,
      packageWeight: courierRequest.packageWeight,
      weightUnit: courierRequest.weightUnit,
      packageCount: courierRequest.packageCount,
      createdById: creatorId,
    },
  });

  // Create initial tracking update
  await tx.trackingUpdate.create({
    data: {
      shipmentId: shipment.id,
      locationId: shipment.currentLocationId,
      status: 'PROCESSING',
      description: 'Shipment registered and pending initial dispatch',
      isPublic: true,
      createdById: creatorId,
      timestamp: now,
    },
  });

  return shipment;
}

export async function getShipments(query: QueryShipmentsInput) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const skip = (page - 1) * limit;

  const { currentStatus, originLocationId, destinationLocationId, assignedToId, trackingNumber, startDate, endDate } = query;

  const where: Prisma.ShipmentWhereInput = {};

  if (currentStatus) where.currentStatus = currentStatus;
  if (originLocationId) where.originLocationId = originLocationId;
  if (destinationLocationId) where.destinationLocationId = destinationLocationId;
  if (assignedToId) where.assignedToId = assignedToId;
  if (trackingNumber) where.trackingNumber = { contains: trackingNumber, mode: 'insensitive' };
  
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) where.createdAt.gte = startDate;
    if (endDate) where.createdAt.lte = endDate;
  }

  const [shipments, total] = await Promise.all([
    prisma.shipment.findMany({
      where,
      skip,
      take: limit,
      select: shipmentListSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.shipment.count({ where }),
  ]);

  return {
    shipments,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getShipmentById(id: string) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
    include: {
      courierRequest: {
        select: { id: true, requestNotes: true, packageWeight: true, weightUnit: true, packageCount: true },
      },
      originLocation: true,
      destinationLocation: true,
      currentLocation: true,
      assignedTo: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      createdBy: {
        select: { id: true, firstName: true, lastName: true, email: true, role: true },
      },
      trackingUpdates: {
        orderBy: { timestamp: 'desc' },
        include: {
          location: {
            select: { id: true, name: true, code: true, city: true, country: true },
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true, role: true },
          },
        },
      },
    },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment');
  }

  return shipment;
}

export async function updateShipment(id: string, data: UpdateShipmentInput) {
  const shipment = await prisma.shipment.findUnique({
    where: { id },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment');
  }

  return prisma.shipment.update({
    where: { id },
    data,
    include: {
      assignedTo: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });
}

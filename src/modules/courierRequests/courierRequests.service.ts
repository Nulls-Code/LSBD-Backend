import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import {
  BadRequestError,
  NotFoundError,
} from '../../lib/errors';
import { upsertCustomerTx } from '../customers/customers.service';
import { createShipmentTx } from '../shipments/shipments.service';
import {
  CreateCourierRequestInput,
  QueryCourierRequestsInput,
  ReviewCourierRequestInput,
  CancelCourierRequestInput,
} from './courierRequests.schemas';

/**
 * Standard select for courier request list items.
 */
const courierRequestListSelect = {
  id: true,
  senderName: true,
  senderPhone: true,
  senderEmail: true,
  senderAddress: true,
  recipientName: true,
  recipientPhone: true,
  recipientEmail: true,
  recipientAddress: true,
  packageDescription: true,
  packageWeight: true,
  weightUnit: true,
  packageCount: true,
  requestNotes: true,
  status: true,
  reviewNotes: true,
  reviewedAt: true,
  createdAt: true,
  updatedAt: true,
  customer: {
    select: { id: true, name: true, email: true, phone: true, company: true },
  },
  originLocation: {
    select: { id: true, name: true, code: true, city: true, country: true },
  },
  destinationLocation: {
    select: { id: true, name: true, code: true, city: true, country: true },
  },
  createdBy: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  reviewedBy: {
    select: { id: true, firstName: true, lastName: true, email: true, role: true },
  },
  shipment: {
    select: { id: true, trackingNumber: true, currentStatus: true },
  },
} as const;

/**
 * Create a new courier request.
 * Automatically finds or creates the Customer record within a transaction.
 * Validates that both origin and destination locations exist and are active.
 */
export async function createCourierRequest(
  data: CreateCourierRequestInput,
  currentUserId?: string,
) {
  // Validate origin location exists and is active
  const originLocation = await prisma.location.findUnique({
    where: { id: data.originLocationId },
  });

  if (!originLocation) {
    throw new NotFoundError('Origin location');
  }

  if (!originLocation.isActive) {
    throw new BadRequestError('Origin location is not currently active');
  }

  // Validate destination location exists and is active
  const destinationLocation = await prisma.location.findUnique({
    where: { id: data.destinationLocationId },
  });

  if (!destinationLocation) {
    throw new NotFoundError('Destination location');
  }

  if (!destinationLocation.isActive) {
    throw new BadRequestError('Destination location is not currently active');
  }

  // Execute customer upsert + request creation within a transaction
  const courierRequest = await prisma.$transaction(async (tx) => {
    // Find or create the customer
    const customer = await upsertCustomerTx(tx, {
      customerId: data.customerId,
      senderName: data.senderName,
      senderEmail: data.senderEmail,
      senderPhone: data.senderPhone,
      senderCompany: data.senderCompany,
    });

    // Create the courier request
    return tx.courierRequest.create({
      data: {
        customerId: customer.id,
        senderName: data.senderName,
        senderPhone: data.senderPhone,
        senderEmail: data.senderEmail,
        senderAddress: data.senderAddress,
        recipientName: data.recipientName,
        recipientPhone: data.recipientPhone,
        recipientEmail: data.recipientEmail,
        recipientAddress: data.recipientAddress,
        originLocationId: data.originLocationId,
        destinationLocationId: data.destinationLocationId,
        packageDescription: data.packageDescription,
        packageWeight: data.packageWeight,
        weightUnit: data.weightUnit,
        packageCount: data.packageCount,
        requestNotes: data.requestNotes,
        createdById: currentUserId || null,
      },
      select: courierRequestListSelect,
    });
  });

  return courierRequest;
}

/**
 * List courier requests with filtering and pagination.
 */
export async function getCourierRequests(query: QueryCourierRequestsInput) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { search, status, originLocationId, destinationLocationId, customerId, startDate, endDate } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CourierRequestWhereInput = {};

  if (status) {
    where.status = status;
  }

  if (originLocationId) {
    where.originLocationId = originLocationId;
  }

  if (destinationLocationId) {
    where.destinationLocationId = destinationLocationId;
  }

  if (customerId) {
    where.customerId = customerId;
  }

  // Date range filter on createdAt
  if (startDate || endDate) {
    where.createdAt = {};
    if (startDate) {
      where.createdAt.gte = startDate;
    }
    if (endDate) {
      where.createdAt.lte = endDate;
    }
  }

  if (search) {
    where.OR = [
      { senderName: { contains: search, mode: 'insensitive' } },
      { recipientName: { contains: search, mode: 'insensitive' } },
      { senderPhone: { contains: search, mode: 'insensitive' } },
      { recipientPhone: { contains: search, mode: 'insensitive' } },
      { packageDescription: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [courierRequests, total] = await Promise.all([
    prisma.courierRequest.findMany({
      where,
      skip,
      take: limit,
      select: courierRequestListSelect,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.courierRequest.count({ where }),
  ]);

  return {
    courierRequests,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single courier request by ID with full relational details.
 */
export async function getCourierRequestById(id: string) {
  const courierRequest = await prisma.courierRequest.findUnique({
    where: { id },
    select: courierRequestListSelect,
  });

  if (!courierRequest) {
    throw new NotFoundError('Courier request');
  }

  return courierRequest;
}

/**
 * Review a courier request (APPROVE or REJECT).
 * Only requests in PENDING status can be reviewed.
 */
export async function reviewCourierRequest(
  id: string,
  data: ReviewCourierRequestInput,
  reviewerId: string,
) {
  const request = await prisma.courierRequest.findUnique({
    where: { id },
    include: { originLocation: true, destinationLocation: true },
  });

  if (!request) {
    throw new NotFoundError('Courier request');
  }

  if (request.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot review a request that is already ${request.status.toLowerCase()}`,
    );
  }

  const newStatus = data.action === 'APPROVE' ? 'APPROVED' : 'REJECTED';

  return prisma.$transaction(async (tx) => {
    const updatedRequest = await tx.courierRequest.update({
      where: { id },
      data: {
        status: newStatus,
        reviewedById: reviewerId,
        reviewedAt: new Date(),
        reviewNotes: data.reviewNotes,
      },
      select: courierRequestListSelect,
    });

    if (newStatus === 'APPROVED') {
      await createShipmentTx(tx, request, reviewerId);
    }

    return updatedRequest;
  });
}

/**
 * Cancel a pending courier request.
 * Only requests in PENDING status can be cancelled.
 */
export async function cancelCourierRequest(
  id: string,
  data: CancelCourierRequestInput,
  cancelledById: string,
) {
  const request = await prisma.courierRequest.findUnique({
    where: { id },
  });

  if (!request) {
    throw new NotFoundError('Courier request');
  }

  if (request.status !== 'PENDING') {
    throw new BadRequestError(
      `Cannot cancel a request that is already ${request.status.toLowerCase()}`,
    );
  }

  return prisma.courierRequest.update({
    where: { id },
    data: {
      status: 'CANCELLED',
      reviewedById: cancelledById,
      reviewedAt: new Date(),
      reviewNotes: data.reason || 'Cancelled by staff',
    },
    select: courierRequestListSelect,
  });
}

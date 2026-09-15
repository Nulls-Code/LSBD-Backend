import prisma from '../../config/prisma';
import { ShipmentStatus, UserRole } from '@prisma/client';
import { NotFoundError, ForbiddenError, BadRequestError } from '../../lib/errors';
import { AddTrackingUpdateInput } from './tracking.schemas';

// Define the order of states for backward flow checking
const STATUS_ORDER: Record<ShipmentStatus, number> = {
  PROCESSING: 1,
  IN_TRANSIT: 2,
  ARRIVED_AT_HUB: 3,
  OUT_FOR_DELIVERY: 4,
  DELIVERED: 5,
  FAILED_DELIVERY: 5,
  ON_HOLD: 3, // Not strict
  CANCELLED: 6,
  RETURNED: 6,
};

const TERMINAL_STATES: ShipmentStatus[] = ['DELIVERED', 'CANCELLED', 'RETURNED'];

export const addTrackingUpdate = async (
  shipmentId: string,
  userId: string,
  userRole: UserRole,
  payload: AddTrackingUpdateInput
) => {
  const { locationId, status, description, isPublic, timestamp } = payload;

  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment');
  }

  // Validate state transitions
  const isTerminal = TERMINAL_STATES.includes(shipment.currentStatus);
  const isManagerOrAdmin = userRole === 'ADMIN' || userRole === 'MANAGER';

  if (isTerminal && !isManagerOrAdmin) {
    throw new ForbiddenError(`Cannot transition out of terminal state ${shipment.currentStatus}`);
  }

  const currentOrder = STATUS_ORDER[shipment.currentStatus] || 0;
  const newOrder = STATUS_ORDER[status] || 0;
  const isBackwardFlow = newOrder < currentOrder;

  if (isBackwardFlow) {
    if (!isManagerOrAdmin) {
      throw new ForbiddenError('Invalid backward flow. Regular employees cannot revert shipment status.');
    }
    if (!description || description.trim().length === 0) {
      throw new BadRequestError('A description (justification) is required when performing backward status transitions.');
    }
  }

  // Validate location if provided
  if (locationId) {
    const location = await prisma.location.findUnique({
      where: { id: locationId },
    });
    if (!location) {
      throw new NotFoundError('Location');
    }
    if (!location.isActive) {
      throw new BadRequestError('Location is not active');
    }
  }

  const result = await prisma.$transaction(async (tx) => {
    const update = await tx.trackingUpdate.create({
      data: {
        shipmentId,
        locationId,
        status,
        description,
        isPublic,
        createdById: userId,
        timestamp: timestamp ? new Date(timestamp) : new Date(),
      },
    });

    await tx.shipment.update({
      where: { id: shipmentId },
      data: {
        currentStatus: status,
        ...(locationId && { currentLocationId: locationId }),
      },
    });

    return update;
  });

  return result;
};

export const getShipmentTrackingHistory = async (shipmentId: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: shipmentId },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment');
  }

  // Internal audit view: return everything including employee details
  const updates = await prisma.trackingUpdate.findMany({
    where: { shipmentId },
    orderBy: { timestamp: 'desc' },
    include: {
      location: {
        select: {
          name: true,
          code: true,
          city: true,
          country: true,
        },
      },
      createdBy: {
        select: {
          firstName: true,
          lastName: true,
          role: true,
          email: true,
        },
      },
    },
  });

  return updates;
};

export const getPublicTrackingInfo = async (trackingNumber: string) => {
  const shipment = await prisma.shipment.findUnique({
    where: { trackingNumber },
    include: {
      originLocation: true,
      destinationLocation: true,
      currentLocation: true,
      trackingUpdates: {
        where: { isPublic: true },
        orderBy: { timestamp: 'desc' },
        include: {
          location: true,
        },
      },
    },
  });

  if (!shipment) {
    throw new NotFoundError('Shipment not found');
  }

  return {
    trackingNumber: shipment.trackingNumber,
    currentStatus: shipment.currentStatus,
    origin: {
      city: shipment.originLocation.city,
      country: shipment.originLocation.country,
    },
    destination: {
      city: shipment.destinationLocation.city,
      country: shipment.destinationLocation.country,
    },
    currentLocation: shipment.currentLocation
      ? {
          city: shipment.currentLocation.city,
          country: shipment.currentLocation.country,
        }
      : null,
    estimatedDeliveryDate: shipment.estimatedDeliveryDate,
    lastUpdated: shipment.updatedAt,
    history: shipment.trackingUpdates.map((update) => ({
      timestamp: update.timestamp,
      status: update.status,
      description: update.description,
      location: update.location
        ? `${update.location.city}, ${update.location.country}`
        : null,
    })),
  };
};

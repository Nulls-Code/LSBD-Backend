import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { ConflictError, NotFoundError, BadRequestError } from '../../lib/errors';
import {
  CreateLocationInput,
  UpdateLocationInput,
  QueryLocationsInput,
} from './locations.schemas';

/**
 * Create a new operational location / hub.
 */
export async function createLocation(data: CreateLocationInput) {
  const existing = await prisma.location.findUnique({
    where: { code: data.code },
  });

  if (existing) {
    throw new ConflictError(`A location with code '${data.code}' already exists`);
  }

  return prisma.location.create({
    data: {
      name: data.name,
      code: data.code,
      city: data.city,
      country: data.country,
      address: data.address,
    },
  });
}

/**
 * List locations with filtering and pagination.
 */
export async function getLocations(query: QueryLocationsInput) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { search, city, country, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.LocationWhereInput = {};

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (city) {
    where.city = { contains: city, mode: 'insensitive' };
  }

  if (country) {
    where.country = { contains: country, mode: 'insensitive' };
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { code: { contains: search, mode: 'insensitive' } },
      { city: { contains: search, mode: 'insensitive' } },
      { country: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [locations, total] = await Promise.all([
    prisma.location.findMany({
      where,
      skip,
      take: limit,
      orderBy: { name: 'asc' },
    }),
    prisma.location.count({ where }),
  ]);

  return {
    locations,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get location details by ID.
 */
export async function getLocationById(id: string) {
  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          currentShipments: true,
          originShipments: true,
          destinationShipments: true,
          originRequests: true,
          destinationRequests: true,
        },
      },
    },
  });

  if (!location) {
    throw new NotFoundError('Location');
  }

  return location;
}

/**
 * Update location details.
 */
export async function updateLocation(id: string, data: UpdateLocationInput) {
  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundError('Location');
  }

  if (data.code && data.code !== location.code) {
    const codeConflict = await prisma.location.findUnique({
      where: { code: data.code },
    });

    if (codeConflict) {
      throw new ConflictError(`A location with code '${data.code}' already exists`);
    }
  }

  return prisma.location.update({
    where: { id },
    data,
  });
}

/**
 * Toggle location active status.
 * Prevents deactivation if active shipments are currently stationed at the location.
 */
export async function updateLocationStatus(id: string, isActive: boolean) {
  const location = await prisma.location.findUnique({
    where: { id },
  });

  if (!location) {
    throw new NotFoundError('Location');
  }

  if (!isActive) {
    const activeShipmentsCount = await prisma.shipment.count({
      where: {
        currentLocationId: id,
        currentStatus: {
          notIn: ['DELIVERED', 'CANCELLED', 'RETURNED'],
        },
      },
    });

    if (activeShipmentsCount > 0) {
      throw new BadRequestError(
        `Cannot deactivate location. There are currently ${activeShipmentsCount} active shipment(s) at this location.`,
      );
    }
  }

  return prisma.location.update({
    where: { id },
    data: { isActive },
  });
}

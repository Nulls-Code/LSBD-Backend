import bcrypt from 'bcrypt';
import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import config from '../../config';
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from '../../lib/errors';
import {
  QueryUsersInput,
  UpdateUserInput,
} from './users.schemas';

/**
 * List staff members with filtering and pagination.
 */
export async function getUsers(query: QueryUsersInput) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { search, role, isActive } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.UserWhereInput = {};

  if (role) {
    where.role = role;
  }

  if (isActive !== undefined) {
    where.isActive = isActive;
  }

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: 'insensitive' } },
      { lastName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where }),
  ]);

  return {
    users,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get single user by ID with audit statistics.
 */
export async function getUserById(id: string) {
  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          createdRequests: true,
          reviewedRequests: true,
          createdShipments: true,
          assignedShipments: true,
          trackingUpdates: true,
        },
      },
    },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  return user;
}

/**
 * Update user profile details and role.
 * Includes self-demotion prevention for administrators.
 */
export async function updateUser(id: string, data: UpdateUserInput, currentUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Self-demotion guard: an Admin cannot remove their own Admin role
  if (id === currentUserId && data.role !== undefined && data.role !== 'ADMIN') {
    throw new BadRequestError('Administrators cannot change or demote their own role');
  }

  // Prevent email collisions if updating email
  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError('A user with this email already exists');
    }
  }

  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Toggle user active status.
 * Includes self-deactivation prevention for administrators.
 */
export async function updateUserStatus(id: string, isActive: boolean, currentUserId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  // Self-deactivation guard: an Admin cannot deactivate themselves
  if (id === currentUserId && !isActive) {
    throw new BadRequestError('Administrators cannot deactivate their own account');
  }

  return prisma.user.update({
    where: { id },
    data: { isActive },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      role: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });
}

/**
 * Administrative password reset.
 */
export async function resetUserPassword(id: string, newPassword: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) {
    throw new NotFoundError('User');
  }

  const passwordHash = await bcrypt.hash(newPassword, config.bcrypt.saltRounds);

  await prisma.user.update({
    where: { id },
    data: { passwordHash },
  });

  return { message: 'User password reset successfully' };
}

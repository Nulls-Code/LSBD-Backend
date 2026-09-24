import { Prisma } from '@prisma/client';
import prisma from '../../config/prisma';
import { ConflictError, NotFoundError } from '../../lib/errors';
import {
  QueryCustomersInput,
  CreateCustomerInput,
  UpdateCustomerInput,
} from './customers.schemas';

/**
 * List customers with search and pagination.
 */
export async function getCustomers(query: QueryCustomersInput) {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 20;
  const { search } = query;
  const skip = (page - 1) * limit;

  const where: Prisma.CustomerWhereInput = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [customers, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            courierRequests: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.customer.count({ where }),
  ]);

  return {
    customers,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

/**
 * Get a single customer by ID with recent courier requests.
 */
export async function getCustomerById(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      courierRequests: {
        select: {
          id: true,
          status: true,
          packageDescription: true,
          packageWeight: true,
          weightUnit: true,
          packageCount: true,
          createdAt: true,
          originLocation: {
            select: { id: true, name: true, code: true, city: true, country: true },
          },
          destinationLocation: {
            select: { id: true, name: true, code: true, city: true, country: true },
          },
          shipment: {
            select: {
              id: true,
              trackingNumber: true,
              currentStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
      _count: {
        select: {
          courierRequests: true,
        },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError('Customer');
  }

  return customer;
}

/**
 * Create a new customer directly.
 */
export async function createCustomer(data: CreateCustomerInput) {
  // Check for email uniqueness
  if (data.email) {
    const existing = await prisma.customer.findUnique({
      where: { email: data.email },
    });

    if (existing) {
      throw new ConflictError('A customer with this email already exists');
    }
  }

  return prisma.customer.create({
    data: {
      name: data.name,
      email: data.email,
      phone: data.phone,
      company: data.company,
    },
  });
}

/**
 * Update an existing customer's profile.
 */
export async function updateCustomer(id: string, data: UpdateCustomerInput) {
  try {
    return await prisma.customer.update({
      where: { id },
      data,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === 'P2025') {
        throw new NotFoundError('Customer');
      }
      if (err.code === 'P2002') {
        throw new ConflictError('A customer with this email already exists');
      }
    }
    throw err;
  }
}

/**
 * Upsert a customer within a transaction context.
 * Used during courier request intake to automatically find or create a customer
 * based on sender information.
 *
 * Lookup order:
 *   1. By `customerId` if explicitly provided (must exist).
 *   2. By email match (since email is unique in the Customer table).
 *   3. By phone match (best-effort, picks first match).
 *   4. Creates a new customer if no match is found.
 */
export async function upsertCustomerTx(
  tx: Prisma.TransactionClient,
  senderData: {
    customerId?: string;
    senderName: string;
    senderEmail: string;
    senderPhone: string;
    senderCompany?: string;
  },
) {
  // If an explicit customerId is provided, verify it exists
  if (senderData.customerId) {
    const existing = await tx.customer.findUnique({
      where: { id: senderData.customerId },
    });

    if (!existing) {
      throw new NotFoundError('Customer');
    }

    return existing;
  }

  // Try to find by email first (unique field)
  const byEmail = await tx.customer.findUnique({
    where: { email: senderData.senderEmail },
  });

  if (byEmail) {
    return byEmail;
  }

  // Try to find by phone
  const byPhone = await tx.customer.findFirst({
    where: { phone: senderData.senderPhone },
  });

  if (byPhone) {
    return byPhone;
  }

  // Create a new customer
  return tx.customer.create({
    data: {
      name: senderData.senderName,
      email: senderData.senderEmail,
      phone: senderData.senderPhone,
      company: senderData.senderCompany,
    },
  });
}

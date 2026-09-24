import { PrismaClient, UserRole, ShipmentStatus, CourierRequestStatus, WeightUnit } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is not defined in environment variables');
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log('Seeding demo users...');

  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  const users = [
    {
      email: 'admin@lsbd.com',
      firstName: 'System',
      lastName: 'Admin',
      role: UserRole.ADMIN,
      passwordHash,
    },
    {
      email: 'manager@lsbd.com',
      firstName: 'Operations',
      lastName: 'Manager',
      role: UserRole.MANAGER,
      passwordHash,
    },
    {
      email: 'employee@lsbd.com',
      firstName: 'Frontdesk',
      lastName: 'Employee',
      role: UserRole.EMPLOYEE,
      passwordHash,
    },
  ];

  for (const userData of users) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        passwordHash: userData.passwordHash,
        role: userData.role,
        isActive: true,
      },
      create: {
        email: userData.email,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role,
        passwordHash: userData.passwordHash,
        isActive: true,
      },
    });
    console.log(`Seeded user: ${user.email} (${user.role})`);
  }

  console.log('Seeding mock tracking data...');

  const dhaka = await prisma.location.upsert({
    where: { code: 'DAC-HUB' },
    update: {},
    create: {
      name: 'Dhaka Central Air Hub',
      code: 'DAC-HUB',
      city: 'Dhaka',
      country: 'Bangladesh',
    }
  });

  const dubai = await prisma.location.upsert({
    where: { code: 'DXB-HUB' },
    update: {},
    create: {
      name: 'Dubai Cargo Village',
      code: 'DXB-HUB',
      city: 'Dubai',
      country: 'United Arab Emirates',
    }
  });

  const newYork = await prisma.location.upsert({
    where: { code: 'JFK-HUB' },
    update: {},
    create: {
      name: 'JFK International Hub',
      code: 'JFK-HUB',
      city: 'New York',
      country: 'United States',
    }
  });

  const customer = await prisma.customer.upsert({
    where: { email: 'contact@rahimenterprise.com' },
    update: {},
    create: {
      name: 'Rahim Enterprise Ltd',
      email: 'contact@rahimenterprise.com',
      phone: '+8801711223344',
      company: 'Rahim Enterprise Ltd'
    }
  });

  const admin = await prisma.user.findUnique({ where: { email: 'admin@lsbd.com' } });

  let request = await prisma.courierRequest.findFirst({
    where: { customerId: customer.id }
  });

  if (!request) {
    request = await prisma.courierRequest.create({
      data: {
        customerId: customer.id,
        senderName: 'Rahim Enterprise Ltd',
        senderPhone: '+8801711223344',
        senderAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
        recipientName: 'John Doe',
        recipientPhone: '+12125551234',
        recipientAddress: '450 7th Ave, New York, NY 10123',
        originLocationId: dhaka.id,
        destinationLocationId: newYork.id,
        packageDescription: 'VIP sample package',
        packageWeight: 5.5,
        weightUnit: WeightUnit.KG,
        packageCount: 1,
        status: CourierRequestStatus.APPROVED,
      }
    });
  }

  const trackingNumber = 'LSBD-202609-00001';
  let shipment = await prisma.shipment.findUnique({
    where: { trackingNumber }
  });

  if (!shipment && admin) {
    shipment = await prisma.shipment.create({
      data: {
        trackingNumber,
        courierRequestId: request.id,
        senderName: request.senderName,
        senderPhone: request.senderPhone,
        senderAddress: request.senderAddress,
        recipientName: request.recipientName,
        recipientPhone: request.recipientPhone,
        recipientAddress: request.recipientAddress,
        originLocationId: dhaka.id,
        destinationLocationId: newYork.id,
        currentLocationId: dubai.id,
        currentStatus: ShipmentStatus.ARRIVED_AT_HUB,
        packageDescription: request.packageDescription,
        packageWeight: request.packageWeight,
        weightUnit: request.weightUnit,
        packageCount: request.packageCount,
        estimatedDeliveryDate: new Date('2026-09-22T00:00:00.000Z'),
        createdById: admin.id,
      }
    });

    await prisma.trackingUpdate.createMany({
      data: [
        {
          shipmentId: shipment.id,
          locationId: dhaka.id,
          status: ShipmentStatus.PROCESSING,
          description: 'Shipment registered and pending initial dispatch',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-16T19:05:00.000Z'),
        },
        {
          shipmentId: shipment.id,
          locationId: dhaka.id,
          status: ShipmentStatus.IN_TRANSIT,
          description: 'Departed Dhaka on flight EK583',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-17T02:15:00.000Z'),
        },
        {
          shipmentId: shipment.id,
          locationId: dubai.id,
          status: ShipmentStatus.ARRIVED_AT_HUB,
          description: 'Arrived at Dubai Cargo Village Transit Hub. Undergoing sorting.',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-17T08:30:00.000Z'),
        }
      ]
    });
  }

  let request2 = await prisma.courierRequest.findFirst({
    where: { customerId: customer.id, packageDescription: 'Business documents' }
  });

  if (!request2) {
    request2 = await prisma.courierRequest.create({
      data: {
        customerId: customer.id,
        senderName: 'Rahim Enterprise Ltd',
        senderPhone: '+8801711223344',
        senderAddress: 'House 12, Road 5, Dhanmondi, Dhaka',
        recipientName: 'Alice Smith',
        recipientPhone: '+19175556789',
        recipientAddress: '100 Broadway, New York, NY 10005',
        originLocationId: dhaka.id,
        destinationLocationId: newYork.id,
        packageDescription: 'Business documents',
        packageWeight: 1.2,
        weightUnit: WeightUnit.KG,
        packageCount: 1,
        status: CourierRequestStatus.APPROVED,
      }
    });
  }

  const trackingNumber2 = 'LSBD-202609-00002';
  let shipment2 = await prisma.shipment.findUnique({
    where: { trackingNumber: trackingNumber2 }
  });

  if (!shipment2 && admin) {
    shipment2 = await prisma.shipment.create({
      data: {
        trackingNumber: trackingNumber2,
        courierRequestId: request2.id,
        senderName: request2.senderName,
        senderPhone: request2.senderPhone,
        senderAddress: request2.senderAddress,
        recipientName: request2.recipientName,
        recipientPhone: request2.recipientPhone,
        recipientAddress: request2.recipientAddress,
        originLocationId: dhaka.id,
        destinationLocationId: newYork.id,
        currentLocationId: newYork.id,
        currentStatus: ShipmentStatus.DELIVERED,
        packageDescription: request2.packageDescription,
        packageWeight: request2.packageWeight,
        weightUnit: request2.weightUnit,
        packageCount: request2.packageCount,
        estimatedDeliveryDate: new Date('2026-09-17T12:00:00.000Z'),
        createdById: admin.id,
      }
    });

    await prisma.trackingUpdate.createMany({
      data: [
        {
          shipmentId: shipment2.id,
          locationId: dhaka.id,
          status: ShipmentStatus.PROCESSING,
          description: 'Shipment registered and pending initial dispatch',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-15T09:00:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: dhaka.id,
          status: ShipmentStatus.IN_TRANSIT,
          description: 'Departed Dhaka on flight QA701',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-15T15:30:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: dubai.id,
          status: ShipmentStatus.ARRIVED_AT_HUB,
          description: 'Arrived at Dubai Cargo Village Transit Hub.',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-15T20:45:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: dubai.id,
          status: ShipmentStatus.IN_TRANSIT,
          description: 'Departed Dubai on flight EK201 to New York',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-16T08:15:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: newYork.id,
          status: ShipmentStatus.ARRIVED_AT_HUB,
          description: 'Arrived at JFK International Hub. Customs clearance in progress.',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-16T14:30:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: newYork.id,
          status: ShipmentStatus.OUT_FOR_DELIVERY,
          description: 'Out for delivery',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-17T08:00:00.000Z'),
        },
        {
          shipmentId: shipment2.id,
          locationId: newYork.id,
          status: ShipmentStatus.DELIVERED,
          description: 'Delivered to recipient',
          isPublic: true,
          createdById: admin.id,
          timestamp: new Date('2026-09-17T11:45:00.000Z'),
        }
      ]
    });
  }

  console.log('Database seeding completed successfully.');
  // Ensure tracking_counters is seeded up to the highest seeded shipment tracking number
  await prisma.trackingCounter.upsert({
    where: { yearMonth: '202609' },
    update: { lastCount: 2 },
    create: { yearMonth: '202609', lastCount: 2 },
  });
  console.log('Seeded tracking counter for 202609 (lastCount: 2)');

}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

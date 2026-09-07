import { PrismaClient, UserRole } from '@prisma/client';
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

  console.log('Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

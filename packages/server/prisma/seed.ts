import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create a test company
  const company = await prisma.company.upsert({
    where: { id: 'test-company-001' },
    update: {},
    create: {
      id: 'test-company-001',
      name: 'Test Company Inc.',
      legalName: 'Test Company Incorporated',
      taxId: '12-3456789',
      address: {
        street: '123 Test Street',
        city: 'Test City',
        state: 'TS',
        zipCode: '12345',
        country: 'USA'
      },
      phone: '+1-555-0123',
      email: 'info@testcompany.com',
      website: 'https://testcompany.com',
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system'
    }
  });

  console.log('✅ Company created:', company.name);

  // Create a test user
  const hashedPassword = await bcrypt.hash('password123', 12);
  
  const user = await prisma.user.upsert({
    where: { email: 'admin@testcompany.com' },
    update: {},
    create: {
      username: 'adminuser',
      email: 'admin@testcompany.com',
      firstName: 'Admin',
      lastName: 'User',
      displayName: 'Administrator',
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      role: 'ADMIN',
      companyId: company.id,
      isEmailVerified: true,
      createdBy: 'system',
      updatedBy: 'system'
    }
  });

  console.log('✅ User created:', user.email);

  // Create a regular user
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@testcompany.com' },
    update: {},
    create: {
      username: 'regularuser',
      email: 'user@testcompany.com',
      firstName: 'Regular',
      lastName: 'User',
      displayName: 'Regular User',
      passwordHash: hashedPassword,
      status: 'ACTIVE',
      role: 'VIEWER',
      companyId: company.id,
      isEmailVerified: true,
      createdBy: 'system',
      updatedBy: 'system'
    }
  });

  console.log('✅ Regular user created:', regularUser.email);

  // Create some basic chart of accounts
  const chartOfAccounts = [
    {
      code: '1000',
      name: 'Assets',
      type: 'ASSET' as const,
      category: 'CURRENT_ASSETS' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      code: '1100',
      name: 'Cash and Cash Equivalents',
      type: 'ASSET' as const,
      category: 'CURRENT_ASSETS' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      code: '2000',
      name: 'Liabilities',
      type: 'LIABILITY' as const,
      category: 'CURRENT_LIABILITIES' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      code: '3000',
      name: 'Equity',
      type: 'EQUITY' as const,
      category: 'EQUITY' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      code: '4000',
      name: 'Revenue',
      type: 'REVENUE' as const,
      category: 'OPERATING_REVENUE' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    },
    {
      code: '5000',
      name: 'Expenses',
      type: 'EXPENSE' as const,
      category: 'OPERATING_EXPENSE' as const,
      companyId: company.id,
      createdBy: 'system',
      updatedBy: 'system'
    }
  ];

  for (const account of chartOfAccounts) {
    await prisma.chartOfAccount.upsert({
      where: { code: account.code },
      update: {},
      create: account
    });
  }

  console.log('✅ Chart of accounts created');

  console.log('🎉 Database seeding completed successfully!');
  console.log('\n📋 Test Credentials:');
  console.log('Admin User: admin@testcompany.com / password123');
  console.log('Regular User: user@testcompany.com / password123');
  console.log('Company: Test Company Inc.');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

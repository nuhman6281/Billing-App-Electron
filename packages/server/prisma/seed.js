"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
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
    const hashedPassword = await bcryptjs_1.default.hash('password123', 12);
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
    // Create the user that was trying to login
    const shibiliUser = await prisma.user.upsert({
        where: { email: 'shibili.mc@gmail.com' },
        update: {},
        create: {
            username: 'shibili',
            email: 'shibili.mc@gmail.com',
            firstName: 'Shibili',
            lastName: 'MC',
            displayName: 'Shibili MC',
            passwordHash: hashedPassword,
            status: 'ACTIVE',
            role: 'VIEWER',
            companyId: company.id,
            isEmailVerified: true,
            createdBy: 'system',
            updatedBy: 'system'
        }
    });
    console.log('✅ Shibili user created:', shibiliUser.email);
    // Create some basic chart of accounts
    const chartOfAccounts = [
        {
            code: '1000',
            name: 'Assets',
            type: 'ASSET',
            category: 'CURRENT_ASSETS',
            companyId: company.id,
            createdBy: 'system',
            updatedBy: 'system'
        },
        {
            code: '1100',
            name: 'Cash and Cash Equivalents',
            type: 'ASSET',
            category: 'CURRENT_ASSETS',
            companyId: company.id,
            createdBy: 'system',
            updatedBy: 'system'
        },
        {
            code: '2000',
            name: 'Liabilities',
            type: 'LIABILITY',
            category: 'CURRENT_LIABILITIES',
            companyId: company.id,
            createdBy: 'system',
            updatedBy: 'system'
        },
        {
            code: '3000',
            name: 'Equity',
            type: 'EQUITY',
            category: 'EQUITY',
            companyId: company.id,
            createdBy: 'system',
            updatedBy: 'system'
        },
        {
            code: '4000',
            name: 'Revenue',
            type: 'REVENUE',
            category: 'OPERATING_REVENUE',
            companyId: company.id,
            createdBy: 'system',
            updatedBy: 'system'
        },
        {
            code: '5000',
            name: 'Expenses',
            type: 'EXPENSE',
            category: 'OPERATING_EXPENSE',
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
    console.log('Shibili User: shibili.mc@gmail.com / password123');
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
//# sourceMappingURL=seed.js.map
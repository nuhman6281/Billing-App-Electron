const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserCompany() {
  try {
    // Update the test user to have the company ID
    const updatedUser = await prisma.user.update({
      where: {
        email: 'test@example.com',
      },
      data: {
        companyId: 'cmea39h240000isr59obhuu33', // The company ID from the previous response
      },
    });

    console.log('User company updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      companyId: updatedUser.companyId,
    });
  } catch (error) {
    console.error('Error updating user company:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserCompany();


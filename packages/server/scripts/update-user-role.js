const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateUserRole() {
  try {
    // Update the test user to ADMIN role
    const updatedUser = await prisma.user.update({
      where: {
        email: 'test@example.com',
      },
      data: {
        role: 'ADMIN',
      },
    });

    console.log('User role updated successfully:', {
      id: updatedUser.id,
      email: updatedUser.email,
      role: updatedUser.role,
    });
  } catch (error) {
    console.error('Error updating user role:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateUserRole();


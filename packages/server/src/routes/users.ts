import express from "express";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../database";
import bcrypt from "bcryptjs";

const router = express.Router();

// Get all users
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const users = await prisma.user.findMany({
      where: { companyId },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        lastLoginAt: true,
        createdAt: true,
        companyId: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: users,
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      code: "INTERNAL_ERROR",
    });
  }
});

// Create new user
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const {
      username,
      email,
      displayName,
      firstName,
      lastName,
      role,
      companyId: userCompanyId,
      password,
    } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
        companyId: userCompanyId || companyId,
      },
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "User with this email or username already exists",
        code: "USER_EXISTS",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        displayName,
        firstName: firstName || displayName.split(" ")[0] || "",
        lastName: lastName || displayName.split(" ").slice(1).join(" ") || "",
        role,
        companyId: userCompanyId || companyId,
        passwordHash: hashedPassword,
        status: "ACTIVE",
        createdBy: req.user!.userId,
        updatedBy: req.user!.userId,
      },
      select: {
        id: true,
        username: true,
        email: true,
        displayName: true,
        role: true,
        status: true,
        createdAt: true,
        companyId: true,
      },
    });

    res.status(201).json({
      success: true,
      data: user,
    });
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create user",
      code: "INTERNAL_ERROR",
    });
  }
});

// Update user status
router.patch(
  "/:id/status",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { id } = req.params;
      const { status } = req.body;

      const user = await prisma.user.update({
        where: { id, companyId },
        data: { status },
        select: {
          id: true,
          username: true,
          email: true,
          displayName: true,
          role: true,
          status: true,
          createdAt: true,
          companyId: true,
        },
      });

      res.json({
        success: true,
        data: user,
      });
    } catch (error) {
      console.error("Error updating user status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update user status",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Delete user
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { id } = req.params;

      await prisma.user.delete({
        where: { id, companyId },
      });

      res.json({
        success: true,
        message: "User deleted successfully",
      });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete user",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;

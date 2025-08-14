import express from "express";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../database";

const router = express.Router();

// Get all roles (system-defined roles from enum)
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;

    // Define system roles based on UserRole enum
    const systemRoles = [
      {
        id: "SUPER_ADMIN",
        name: "Super Admin",
        description: "Full system access and control",
        permissions: ["*"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
      {
        id: "ADMIN",
        name: "Administrator",
        description: "Company-level administrative access",
        permissions: ["users:manage", "settings:manage", "reports:view"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
      {
        id: "ACCOUNTANT",
        name: "Accountant",
        description: "Full accounting and financial access",
        permissions: ["accounts:manage", "transactions:manage", "reports:view"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
      {
        id: "BOOKKEEPER",
        name: "Bookkeeper",
        description: "Basic bookkeeping and data entry",
        permissions: ["accounts:view", "transactions:create", "reports:view"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
      {
        id: "MANAGER",
        name: "Manager",
        description: "Management and oversight access",
        permissions: ["reports:view", "users:view", "settings:view"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
      {
        id: "VIEWER",
        name: "Viewer",
        description: "Read-only access to basic information",
        permissions: ["reports:view"],
        isSystem: true,
        userCount: 0,
        createdAt: new Date(),
      },
    ];

    // Get user counts for each role
    const roleCounts = await prisma.user.groupBy({
      by: ["role"],
      where: { companyId },
      _count: { role: true },
    });

    // Update user counts
    systemRoles.forEach((role) => {
      const countData = roleCounts.find((c) => c.role === role.id);
      role.userCount = countData?._count.role || 0;
    });

    res.json({
      success: true,
      data: systemRoles,
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch roles",
      code: "INTERNAL_ERROR",
    });
  }
});

// Get role by ID (system roles only)
router.get(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // Define system roles
      const systemRoles = {
        SUPER_ADMIN: {
          id: "SUPER_ADMIN",
          name: "Super Admin",
          description: "Full system access and control",
          permissions: ["*"],
          isSystem: true,
          createdAt: new Date(),
        },
        ADMIN: {
          id: "ADMIN",
          name: "Administrator",
          description: "Company-level administrative access",
          permissions: ["users:manage", "settings:manage", "reports:view"],
          isSystem: true,
          createdAt: new Date(),
        },
        ACCOUNTANT: {
          id: "ACCOUNTANT",
          name: "Accountant",
          description: "Full accounting and financial access",
          permissions: [
            "accounts:manage",
            "transactions:manage",
            "reports:view",
          ],
          isSystem: true,
          createdAt: new Date(),
        },
        BOOKKEEPER: {
          id: "BOOKKEEPER",
          name: "Bookkeeper",
          description: "Basic bookkeeping and data entry",
          permissions: ["accounts:view", "transactions:create", "reports:view"],
          isSystem: true,
          createdAt: new Date(),
        },
        MANAGER: {
          id: "MANAGER",
          name: "Manager",
          description: "Management and oversight access",
          permissions: ["reports:view", "users:view", "settings:view"],
          isSystem: true,
          createdAt: new Date(),
        },
        VIEWER: {
          id: "VIEWER",
          name: "Viewer",
          description: "Read-only access to basic information",
          permissions: ["reports:view"],
          isSystem: true,
          createdAt: new Date(),
        },
      };

      const role = systemRoles[id as keyof typeof systemRoles];

      if (!role) {
        return res.status(404).json({
          success: false,
          message: "Role not found",
          code: "ROLE_NOT_FOUND",
        });
      }

      // Get user count for this role
      const userCount = await prisma.user.count({
        where: { role: id },
      });

      res.json({
        success: true,
        data: { ...role, userCount },
      });
    } catch (error) {
      console.error("Error fetching role:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch role",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Update role (system roles are read-only)
router.put(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // System roles cannot be modified
      return res.status(403).json({
        success: false,
        message: "System roles cannot be modified",
        code: "ROLE_READONLY",
      });
    } catch (error) {
      console.error("Error updating role:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update role",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Delete role (system roles cannot be deleted)
router.delete(
  "/:id",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { id } = req.params;

      // System roles cannot be deleted
      return res.status(403).json({
        success: false,
        message: "System roles cannot be deleted",
        code: "ROLE_READONLY",
      });
    } catch (error) {
      console.error("Error deleting role:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete role",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;

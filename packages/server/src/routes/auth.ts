import { Router } from "express";
import { authRateLimiter } from "../middleware/rateLimiter";
import { UserService } from "../models/User";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { createError } from "../middleware/errorHandler";
import prisma from "../database";

const router = Router();
const userService = new UserService(prisma);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
  });
});

// User registration
router.post("/register", authRateLimiter, async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      firstName,
      lastName,
      displayName,
      role,
      companyId,
    } = req.body;

    // Validate required fields
    if (
      !username ||
      !email ||
      !password ||
      !firstName ||
      !lastName ||
      !displayName
    ) {
      throw createError("Missing required fields", 400, "VALIDATION_ERROR");
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw createError("Invalid email format", 400, "VALIDATION_ERROR");
    }

    // Validate password strength
    if (password.length < 8) {
      throw createError(
        "Password must be at least 8 characters long",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await userService.createUser({
      username,
      email,
      password,
      firstName,
      lastName,
      displayName,
      role,
      companyId,
    });

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// User login
router.post("/login", authRateLimiter, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      throw createError(
        "Email and password are required",
        400,
        "VALIDATION_ERROR"
      );
    }

    const result = await userService.login({ email, password });

    res.json({
      success: true,
      message: "Login successful",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Refresh token
router.post("/refresh", async (req, res, next) => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw createError("Refresh token is required", 400, "VALIDATION_ERROR");
    }

    const result = await userService.refreshToken(refreshToken);

    res.json({
      success: true,
      message: "Token refreshed successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

// Logout
router.post(
  "/logout",
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await userService.logout(refreshToken);
      }

      res.json({
        success: true,
        message: "Logout successful",
      });
    } catch (error) {
      next(error);
    }
  }
);

// Get current user profile
router.get(
  "/profile",
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const user = await userService.getUserById(req.user!.userId);

      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }

      res.json({
        success: true,
        message: "Profile retrieved successfully",
        data: user,
      });
    } catch (error) {
      next(error);
    }
  }
);

// Change password
router.post(
  "/change-password",
  authenticateToken,
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        throw createError(
          "Current and new password are required",
          400,
          "VALIDATION_ERROR"
        );
      }

      if (newPassword.length < 8) {
        throw createError(
          "New password must be at least 8 characters long",
          400,
          "VALIDATION_ERROR"
        );
      }

      // Get user with password
      const user = await prisma.user.findUnique({
        where: { id: req.user!.userId },
        select: { passwordHash: true },
      });

      if (!user) {
        throw createError("User not found", 404, "USER_NOT_FOUND");
      }

      // Verify current password
      const bcrypt = require("bcryptjs");
      const isValidPassword = await bcrypt.compare(
        currentPassword,
        user.passwordHash
      );

      if (!isValidPassword) {
        throw createError(
          "Current password is incorrect",
          400,
          "INVALID_PASSWORD"
        );
      }

      // Hash new password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

      // Update password
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { passwordHash: hashedPassword },
      });

      res.json({
        success: true,
        message: "Password changed successfully",
      });
    } catch (error) {
      next(error);
    }
  }
);

export const authRoutes = router;

import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { config } from "../config";
import { createError } from "./errorHandler";
import prisma from "../database";

export interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    email: string;
    role: string;
    companyId?: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

    if (!token) {
      throw createError("Access token required", 401, "UNAUTHORIZED");
    }

    // Verify token
    const decoded = jwt.verify(token, config.jwt.secret) as any;

    if (!decoded.userId || !decoded.email || !decoded.role) {
      throw createError("Invalid token format", 401, "INVALID_TOKEN");
    }

    // Check if user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        companyId: true,
      },
    });

    if (!user || user.status !== "ACTIVE") {
      throw createError("User not found or inactive", 401, "USER_INACTIVE");
    }

    // Add user info to request
    req.user = {
      userId: user.id,
      email: user.email,
      role: user.role,
      companyId: user.companyId || undefined,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(createError("Invalid token", 401, "INVALID_TOKEN"));
    } else if (error instanceof jwt.TokenExpiredError) {
      next(createError("Token expired", 401, "TOKEN_EXPIRED"));
    } else {
      next(error);
    }
  }
};

export const requireRole = (roles: string | string[]) => {
  return (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ): void => {
    if (!req.user) {
      next(createError("Authentication required", 401, "UNAUTHORIZED"));
      return;
    }

    const allowedRoles = Array.isArray(roles) ? roles : [roles];

    if (!allowedRoles.includes(req.user.role)) {
      next(createError("Insufficient permissions", 403, "FORBIDDEN"));
      return;
    }

    next();
  };
};

export const requireAdmin = requireRole("ADMIN");
export const requireManager = requireRole(["ADMIN", "MANAGER"]);
export const requireUser = requireRole(["ADMIN", "MANAGER", "USER"]);

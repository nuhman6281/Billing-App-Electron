import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "../config";

export interface CreateUserInput {
  username: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  role?: string;
  companyId?: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: string;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    displayName: string;
    role: string;
    companyId?: string;
  };
  accessToken: string;
  refreshToken: string;
}

export class UserService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  async createUser(input: CreateUserInput): Promise<AuthResponse> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new Error("User with this email already exists");
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(input.password, saltRounds);

    // Create user
    const user = await this.prisma.user.create({
      data: {
        username: input.username,
        email: input.email,
        passwordHash: hashedPassword,
        firstName: input.firstName,
        lastName: input.lastName,
        displayName: input.displayName,
        role: input.role || "VIEWER",
        companyId: input.companyId,
        createdBy: "system", // Will be updated when we have proper user management
        updatedBy: "system",
      },
    });

    // Generate tokens
    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.role
    );
    const refreshToken = this.generateRefreshToken(user.id);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        companyId: user.companyId,
      },
      accessToken,
      refreshToken,
    };
  }

  async login(input: LoginInput): Promise<AuthResponse> {
    // Find user
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(
      input.password,
      user.passwordHash
    );
    if (!isValidPassword) {
      throw new Error("Invalid email or password");
    }

    // Check if user is active
    if (user.status !== "ACTIVE") {
      throw new Error("Account is not active");
    }

    // Generate tokens
    const accessToken = this.generateAccessToken(
      user.id,
      user.email,
      user.role
    );
    const refreshToken = this.generateRefreshToken(user.id);

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        displayName: user.displayName,
        role: user.role,
        companyId: user.companyId,
      },
      accessToken,
      refreshToken,
    };
  }

  async refreshToken(token: string): Promise<AuthResponse> {
    // Find refresh token
    const refreshToken = await this.prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      throw new Error("Invalid or expired refresh token");
    }

    // Generate new tokens
    const accessToken = this.generateAccessToken(
      refreshToken.user.id,
      refreshToken.user.email,
      refreshToken.user.role
    );
    const newRefreshToken = this.generateRefreshToken(refreshToken.user.id);

    // Update refresh token
    await this.prisma.refreshToken.update({
      where: { id: refreshToken.id },
      data: {
        token: newRefreshToken,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      user: {
        id: refreshToken.user.id,
        username: refreshToken.user.username,
        email: refreshToken.user.email,
        firstName: refreshToken.user.firstName,
        lastName: refreshToken.user.lastName,
        displayName: refreshToken.user.displayName,
        role: refreshToken.user.role,
        companyId: refreshToken.user.companyId,
      },
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  async logout(token: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token },
    });
  }

  async getUserById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        displayName: true,
        role: true,
        companyId: true,
        status: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private generateAccessToken(
    userId: string,
    email: string,
    role: string
  ): string {
    return jwt.sign({ userId, email, role }, config.jwt.secret, {
      expiresIn: config.jwt.accessTokenExpiry,
    });
  }

  private generateRefreshToken(userId: string): string {
    return jwt.sign({ userId, type: "refresh" }, config.jwt.secret, {
      expiresIn: config.jwt.refreshTokenExpiry,
    });
  }
}

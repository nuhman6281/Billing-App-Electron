import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export enum UserStatus {
  ACTIVE = "ACTIVE",
  INACTIVE = "INACTIVE",
  SUSPENDED = "SUSPENDED",
  PENDING_ACTIVATION = "PENDING_ACTIVATION",
}

export enum UserRole {
  SUPER_ADMIN = "SUPER_ADMIN",
  ADMIN = "ADMIN",
  ACCOUNTANT = "ACCOUNTANT",
  BOOKKEEPER = "BOOKKEEPER",
  MANAGER = "MANAGER",
  VIEWER = "VIEWER",
}

export enum Permission {
  // User Management
  USER_CREATE = "USER_CREATE",
  USER_READ = "USER_READ",
  USER_UPDATE = "USER_UPDATE",
  USER_DELETE = "USER_DELETE",
  USER_ACTIVATE = "USER_ACTIVATE",
  USER_SUSPEND = "USER_SUSPEND",

  // Chart of Accounts
  CHART_OF_ACCOUNTS_CREATE = "CHART_OF_ACCOUNTS_CREATE",
  CHART_OF_ACCOUNTS_READ = "CHART_OF_ACCOUNTS_READ",
  CHART_OF_ACCOUNTS_UPDATE = "CHART_OF_ACCOUNTS_UPDATE",
  CHART_OF_ACCOUNTS_DELETE = "CHART_OF_ACCOUNTS_DELETE",

  // Journal Entries
  JOURNAL_ENTRY_CREATE = "JOURNAL_ENTRY_CREATE",
  JOURNAL_ENTRY_READ = "JOURNAL_ENTRY_READ",
  JOURNAL_ENTRY_UPDATE = "JOURNAL_ENTRY_UPDATE",
  JOURNAL_ENTRY_DELETE = "JOURNAL_ENTRY_DELETE",
  JOURNAL_ENTRY_POST = "JOURNAL_ENTRY_POST",
  JOURNAL_ENTRY_APPROVE = "JOURNAL_ENTRY_APPROVE",

  // Invoices
  INVOICE_CREATE = "INVOICE_CREATE",
  INVOICE_READ = "INVOICE_READ",
  INVOICE_UPDATE = "INVOICE_UPDATE",
  INVOICE_DELETE = "INVOICE_DELETE",
  INVOICE_SEND = "INVOICE_SEND",
  INVOICE_APPROVE = "INVOICE_APPROVE",

  // Bills
  BILL_CREATE = "BILL_CREATE",
  BILL_READ = "BILL_CREATE",
  BILL_UPDATE = "BILL_UPDATE",
  BILL_DELETE = "BILL_DELETE",
  BILL_APPROVE = "BILL_APPROVE",

  // Customers
  CUSTOMER_CREATE = "CUSTOMER_CREATE",
  CUSTOMER_READ = "CUSTOMER_READ",
  CUSTOMER_UPDATE = "CUSTOMER_UPDATE",
  CUSTOMER_DELETE = "CUSTOMER_DELETE",

  // Vendors
  VENDOR_CREATE = "VENDOR_CREATE",
  VENDOR_READ = "VENDOR_READ",
  VENDOR_UPDATE = "VENDOR_UPDATE",
  VENDOR_DELETE = "VENDOR_DELETE",

  // Payments
  PAYMENT_CREATE = "PAYMENT_CREATE",
  PAYMENT_READ = "PAYMENT_READ",
  PAYMENT_UPDATE = "PAYMENT_UPDATE",
  PAYMENT_DELETE = "PAYMENT_DELETE",
  PAYMENT_PROCESS = "PAYMENT_PROCESS",

  // Reports
  REPORT_READ = "REPORT_READ",
  REPORT_EXPORT = "REPORT_EXPORT",
  REPORT_SCHEDULE = "REPORT_SCHEDULE",

  // Settings
  SETTINGS_READ = "SETTINGS_READ",
  SETTINGS_UPDATE = "SETTINGS_UPDATE",

  // Audit
  AUDIT_READ = "AUDIT_READ",
  AUDIT_EXPORT = "AUDIT_EXPORT",
}

export enum MfaType {
  TOTP = "TOTP",
  SMS = "SMS",
  EMAIL = "EMAIL",
  BACKUP_CODES = "BACKUP_CODES",
}

export enum SessionStatus {
  ACTIVE = "ACTIVE",
  EXPIRED = "EXPIRED",
  REVOKED = "REVOKED",
}

// ============================================================================
// INTERFACES
// ============================================================================

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
}

export interface User extends BaseEntity {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  status: UserStatus;
  role: UserRole;
  permissions: Permission[];
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  lastLoginAt?: Date;
  lastLoginIp?: string;
  failedLoginAttempts: number;
  lockedUntil?: Date;
  passwordChangedAt: Date;
  passwordExpiresAt?: Date;
  mfaEnabled: boolean;
  mfaType?: MfaType;
  mfaSecret?: string;
  backupCodes: string[];
  preferences: UserPreferences;
  timezone: string;
  locale: string;
  companyId?: string;
  department?: string;
  position?: string;
  employeeId?: string;
  hireDate?: Date;
  terminationDate?: Date;
}

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
}

export interface Role extends BaseEntity {
  name: string;
  description?: string;
  permissions: Permission[];
  isSystem: boolean;
  isActive: boolean;
  users: User[];
}

export interface PermissionGroup extends BaseEntity {
  name: string;
  description?: string;
  permissions: Permission[];
  isActive: boolean;
}

export interface UserSession extends BaseEntity {
  userId: string;
  user: User;
  sessionId: string;
  tokenId: string;
  refreshTokenId: string;
  status: SessionStatus;
  ipAddress: string;
  userAgent: string;
  deviceInfo: DeviceInfo;
  lastActivityAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
  revokedBy?: string;
  revokedReason?: string;
}

export interface DeviceInfo {
  deviceType: "DESKTOP" | "MOBILE" | "TABLET" | "UNKNOWN";
  browser: string;
  browserVersion: string;
  operatingSystem: string;
  operatingSystemVersion: string;
  deviceModel?: string;
  deviceManufacturer?: string;
}

export interface UserPreferences {
  theme: "light" | "dark" | "system";
  language: string;
  dateFormat: string;
  timeFormat: string;
  numberFormat: string;
  currency: string;
  timezone: string;
  notifications: NotificationPreferences;
  dashboard: DashboardPreferences;
  reports: ReportPreferences;
}

export interface NotificationPreferences {
  email: boolean;
  push: boolean;
  sms: boolean;
  invoiceReminders: boolean;
  paymentReminders: boolean;
  systemAlerts: boolean;
  reportDelivery: boolean;
}

export interface DashboardPreferences {
  defaultView: string;
  widgets: string[];
  layout: Record<string, any>;
  refreshInterval: number;
}

export interface ReportPreferences {
  defaultFormat: "PDF" | "EXCEL" | "CSV";
  includeCharts: boolean;
  includeAttachments: boolean;
  autoSchedule: boolean;
}

// ============================================================================
// AUTHENTICATION INTERFACES
// ============================================================================

export interface LoginCredentials {
  username: string;
  password: string;
  rememberMe?: boolean;
  mfaCode?: string;
  deviceInfo?: DeviceInfo;
}

export interface LoginResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
  mfaRequired: boolean;
  mfaType?: MfaType;
}

export interface RefreshTokenRequest {
  refreshToken: string;
  deviceInfo?: DeviceInfo;
}

export interface RefreshTokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface MfaSetupRequest {
  mfaType: MfaType;
  phoneNumber?: string;
}

export interface MfaSetupResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
  setupComplete: boolean;
}

export interface MfaVerifyRequest {
  mfaType: MfaType;
  code: string;
  rememberDevice?: boolean;
}

export interface MfaVerifyResponse {
  verified: boolean;
  backupCodesRemaining: number;
}

export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export interface PasswordResetRequest {
  email: string;
  resetToken?: string;
  newPassword?: string;
}

export interface PasswordResetResponse {
  resetTokenSent: boolean;
  resetTokenExpiresAt: Date;
}

// ============================================================================
// JWT TOKEN INTERFACES
// ============================================================================

export interface JwtPayload {
  sub: string; // User ID
  username: string;
  email: string;
  role: UserRole;
  permissions: Permission[];
  companyId?: string;
  iat: number; // Issued at
  exp: number; // Expiration
  jti: string; // JWT ID
  aud: string; // Audience
  iss: string; // Issuer
}

export interface RefreshTokenPayload {
  sub: string; // User ID
  jti: string; // JWT ID
  sessionId: string;
  iat: number;
  exp: number;
  aud: string;
  iss: string;
}

// ============================================================================
// ZOD SCHEMAS
// ============================================================================

export const UserSchema = z.object({
  id: z.string().uuid(),
  username: z.string().min(3).max(50),
  email: z.string().email(),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  displayName: z.string().min(1).max(100),
  status: z.nativeEnum(UserStatus),
  role: z.nativeEnum(UserRole),
  permissions: z.array(z.nativeEnum(Permission)),
  isEmailVerified: z.boolean(),
  isPhoneVerified: z.boolean(),
  mfaEnabled: z.boolean(),
  timezone: z.string(),
  locale: z.string(),
});

export const LoginCredentialsSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(8),
  rememberMe: z.boolean().optional(),
  mfaCode: z.string().optional(),
  deviceInfo: z
    .object({
      deviceType: z.enum(["DESKTOP", "MOBILE", "TABLET", "UNKNOWN"]),
      browser: z.string(),
      browserVersion: z.string(),
      operatingSystem: z.string(),
      operatingSystemVersion: z.string(),
    })
    .optional(),
});

export const MfaSetupRequestSchema = z.object({
  mfaType: z.nativeEnum(MfaType),
  phoneNumber: z.string().optional(),
});

export const MfaVerifyRequestSchema = z.object({
  mfaType: z.nativeEnum(MfaType),
  code: z.string().min(6).max(8),
  rememberDevice: z.boolean().optional(),
});

export const PasswordChangeRequestSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8),
    confirmPassword: z.string().min(1),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export const PasswordResetRequestSchema = z.object({
  email: z.string().email(),
  resetToken: z.string().optional(),
  newPassword: z.string().min(8).optional(),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CreateUserInput = Omit<
  User,
  keyof BaseEntity | "permissions" | "preferences" | "backupCodes"
> & {
  password: string;
  confirmPassword: string;
  permissions?: Permission[];
};

export type UpdateUserInput = Partial<
  Omit<User, keyof BaseEntity | "permissions" | "preferences" | "backupCodes">
>;

export type CreateRoleInput = Omit<Role, keyof BaseEntity | "users">;

export type UpdateRoleInput = Partial<CreateRoleInput>;

export type CreatePermissionGroupInput = Omit<
  PermissionGroup,
  keyof BaseEntity
>;

export type UpdatePermissionGroupInput = Partial<CreatePermissionGroupInput>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface AuthResponse {
  success: boolean;
  message: string;
  data?: any;
  errors?: string[];
  timestamp: Date;
}

export interface UserProfileResponse {
  user: User;
  permissions: Permission[];
  role: Role;
  company?: any;
  preferences: UserPreferences;
}

export interface SessionListResponse {
  sessions: UserSession[];
  total: number;
  active: number;
  expired: number;
  revoked: number;
}

// ============================================================================
// SECURITY INTERFACES
// ============================================================================

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionPolicy: SessionPolicy;
  mfaPolicy: MfaPolicy;
  lockoutPolicy: LockoutPolicy;
  auditPolicy: AuditPolicy;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  maxAge: number; // days
  preventReuse: number; // last N passwords
  complexityScore: number; // minimum score
}

export interface SessionPolicy {
  maxSessions: number;
  sessionTimeout: number; // minutes
  idleTimeout: number; // minutes
  absoluteTimeout: number; // minutes
  requireReauth: boolean;
  deviceFingerprinting: boolean;
}

export interface MfaPolicy {
  enabled: boolean;
  requiredForRoles: UserRole[];
  allowedTypes: MfaType[];
  backupCodesCount: number;
  rememberDeviceDays: number;
}

export interface LockoutPolicy {
  maxFailedAttempts: number;
  lockoutDuration: number; // minutes
  lockoutThreshold: number; // failed attempts
  progressiveDelay: boolean;
  maxLockoutDuration: number; // minutes
}

export interface AuditPolicy {
  enabled: boolean;
  retentionDays: number;
  logLevel: "INFO" | "WARN" | "ERROR" | "DEBUG";
  sensitiveFields: string[];
  ipAddressLogging: boolean;
  userAgentLogging: boolean;
}

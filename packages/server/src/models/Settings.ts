import { PrismaClient, Company, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CompanySettings {
  company: Company;
  financial: FinancialSettings;
  integrations: IntegrationSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
}

export interface FinancialSettings {
  defaultCurrency: string;
  fiscalYearStart: string;
  taxRate: string;
  invoicePrefix: string;
  billPrefix: string;
  paymentTerms: string[];
  taxCodes: TaxCode[];
  accountDefaults: AccountDefaults;
}

export interface TaxCode {
  code: string;
  name: string;
  rate: string;
  description?: string;
}

export interface AccountDefaults {
  defaultCashAccount: string;
  defaultAccountsReceivable: string;
  defaultAccountsPayable: string;
  defaultSalesTaxAccount: string;
  defaultPurchaseTaxAccount: string;
}

export interface IntegrationSettings {
  emailService: EmailServiceConfig;
  paymentGateway: PaymentGatewayConfig;
  banking: BankingConfig;
  cloudStorage: CloudStorageConfig;
}

export interface EmailServiceConfig {
  provider: "sendgrid" | "mailgun" | "smtp" | "none";
  apiKey?: string;
  domain?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUsername?: string;
  smtpPassword?: string;
  fromEmail: string;
  fromName: string;
}

export interface PaymentGatewayConfig {
  stripe: StripeConfig;
  paypal: PayPalConfig;
  bankTransfer: BankTransferConfig;
}

export interface StripeConfig {
  enabled: boolean;
  publishableKey?: string;
  secretKey?: string;
  webhookSecret?: string;
}

export interface PayPalConfig {
  enabled: boolean;
  clientId?: string;
  clientSecret?: string;
  mode: "sandbox" | "live";
}

export interface BankTransferConfig {
  enabled: boolean;
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  instructions: string;
}

export interface BankingConfig {
  bankName: string;
  accountNumber: string;
  routingNumber: string;
  apiKey?: string;
  apiSecret?: string;
  webhookUrl?: string;
}

export interface CloudStorageConfig {
  provider: "aws" | "google" | "azure" | "none";
  bucketName?: string;
  accessKey?: string;
  secretKey?: string;
  region?: string;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  invoiceReminders: boolean;
  billReminders: boolean;
  paymentConfirmations: boolean;
  overdueAlerts: boolean;
  reportDelivery: boolean;
  securityAlerts: boolean;
  reminderFrequency: "daily" | "weekly" | "monthly";
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface SecuritySettings {
  passwordPolicy: PasswordPolicy;
  sessionTimeout: number;
  mfaRequired: boolean;
  ipWhitelist: string[];
  failedLoginAttempts: number;
  accountLockoutDuration: number;
  auditLogging: boolean;
}

export interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumbers: boolean;
  requireSpecialChars: boolean;
  expirationDays: number;
}

export interface BackupResult {
  id: string;
  filename: string;
  size: string;
  status: "COMPLETED" | "FAILED" | "IN_PROGRESS";
  createdAt: Date;
  expiresAt: Date;
  downloadUrl?: string;
}

export class SettingsService {
  constructor(private prisma: PrismaClient) {}

  async getCompanySettings(companyId: string): Promise<CompanySettings> {
    const [company, financial, integrations, notifications, security] =
      await Promise.all([
        this.getCompanyInfo(companyId),
        this.getFinancialSettings(companyId),
        this.getIntegrationSettings(companyId),
        this.getNotificationSettings(companyId, ""), // Will be updated with actual user ID
        this.getSecuritySettings(companyId),
      ]);

    return {
      company,
      financial,
      integrations,
      notifications,
      security,
    };
  }

  async getCompanyInfo(companyId: string): Promise<Company> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  async updateCompanySettings(
    companyId: string,
    updateData: Partial<Company>
  ): Promise<Company> {
    return this.prisma.company.update({
      where: { id: companyId },
      data: updateData,
    });
  }

  async getFinancialSettings(companyId: string): Promise<FinancialSettings> {
    // Get company financial settings from database or return defaults
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: {
        defaultCurrency: true,
        fiscalYearStart: true,
        taxRate: true,
        invoicePrefix: true,
        billPrefix: true,
      },
    });

    if (!company) {
      throw new Error("Company not found");
    }

    // Get tax codes
    const taxCodes = await this.prisma.taxCode.findMany({
      where: { companyId },
      orderBy: { code: "asc" },
    });

    // Get account defaults
    const accountDefaults = await this.getAccountDefaults(companyId);

    return {
      defaultCurrency: company.defaultCurrency || "USD",
      fiscalYearStart: company.fiscalYearStart || "01-01",
      taxRate: company.taxRate?.toString() || "0.00",
      invoicePrefix: company.invoicePrefix || "INV",
      billPrefix: company.billPrefix || "BILL",
      paymentTerms: ["Net 30", "Net 60", "Net 90", "Due on Receipt"],
      taxCodes: taxCodes.map((tc) => ({
        code: tc.code,
        name: tc.name,
        rate: tc.rate.toString(),
        description: tc.description || undefined,
      })),
      accountDefaults,
    };
  }

  async updateFinancialSettings(
    companyId: string,
    updateData: Partial<FinancialSettings>
  ): Promise<FinancialSettings> {
    // Update company settings
    if (
      updateData.defaultCurrency ||
      updateData.fiscalYearStart ||
      updateData.taxRate ||
      updateData.invoicePrefix ||
      updateData.billPrefix
    ) {
      await this.prisma.company.update({
        where: { id: companyId },
        data: {
          defaultCurrency: updateData.defaultCurrency,
          fiscalYearStart: updateData.fiscalYearStart,
          taxRate: updateData.taxRate
            ? new Decimal(updateData.taxRate)
            : undefined,
          invoicePrefix: updateData.invoicePrefix,
          billPrefix: updateData.billPrefix,
        },
      });
    }

    // Update tax codes if provided
    if (updateData.taxCodes) {
      // This would require more complex logic to handle tax code updates
      // For now, just return the updated settings
    }

    return this.getFinancialSettings(companyId);
  }

  private async getAccountDefaults(
    companyId: string
  ): Promise<AccountDefaults> {
    // Get default accounts from chart of accounts
    const [
      cashAccount,
      arAccount,
      apAccount,
      salesTaxAccount,
      purchaseTaxAccount,
    ] = await Promise.all([
      this.prisma.chartOfAccount.findFirst({
        where: {
          companyId,
          type: "ASSET",
          category: "Current Assets",
          name: { contains: "Cash" },
        },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: {
          companyId,
          type: "ASSET",
          category: "Current Assets",
          name: { contains: "Accounts Receivable" },
        },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: {
          companyId,
          type: "LIABILITY",
          category: "Current Liabilities",
          name: { contains: "Accounts Payable" },
        },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: {
          companyId,
          type: "LIABILITY",
          category: "Current Liabilities",
          name: { contains: "Sales Tax" },
        },
      }),
      this.prisma.chartOfAccount.findFirst({
        where: {
          companyId,
          type: "ASSET",
          category: "Current Assets",
          name: { contains: "Purchase Tax" },
        },
      }),
    ]);

    return {
      defaultCashAccount: cashAccount?.id || "",
      defaultAccountsReceivable: arAccount?.id || "",
      defaultAccountsPayable: apAccount?.id || "",
      defaultSalesTaxAccount: salesTaxAccount?.id || "",
      defaultPurchaseTaxAccount: purchaseTaxAccount?.id || "",
    };
  }

  async getIntegrationSettings(
    companyId: string
  ): Promise<IntegrationSettings> {
    // Get integration settings from database or return defaults
    const emailService = await this.getEmailServiceConfig(companyId);
    const paymentGateway = await this.getPaymentGatewayConfig(companyId);
    const banking = await this.getBankingConfig(companyId);
    const cloudStorage = await this.getCloudStorageConfig(companyId);

    return {
      emailService,
      paymentGateway,
      banking,
      cloudStorage,
    };
  }

  async updateIntegrationSettings(
    companyId: string,
    updateData: Partial<IntegrationSettings>
  ): Promise<IntegrationSettings> {
    // Update email service config
    if (updateData.emailService) {
      await this.updateEmailServiceConfig(companyId, updateData.emailService);
    }

    // Update payment gateway config
    if (updateData.paymentGateway) {
      await this.updatePaymentGatewayConfig(
        companyId,
        updateData.paymentGateway
      );
    }

    // Update banking config
    if (updateData.banking) {
      await this.updateBankingConfig(companyId, updateData.banking);
    }

    // Update cloud storage config
    if (updateData.cloudStorage) {
      await this.updateCloudStorageConfig(companyId, updateData.cloudStorage);
    }

    return this.getIntegrationSettings(companyId);
  }

  private async getEmailServiceConfig(
    companyId: string
  ): Promise<EmailServiceConfig> {
    // This would typically come from a settings table
    // For now, return defaults
    return {
      provider: "none",
      fromEmail: "noreply@company.com",
      fromName: "Company Name",
    };
  }

  private async updateEmailServiceConfig(
    companyId: string,
    config: Partial<EmailServiceConfig>
  ): Promise<void> {
    // This would update the settings table
    // For now, just a placeholder
  }

  private async getPaymentGatewayConfig(
    companyId: string
  ): Promise<PaymentGatewayConfig> {
    return {
      stripe: {
        enabled: false,
      },
      paypal: {
        enabled: false,
        mode: "sandbox",
      },
      bankTransfer: {
        enabled: true,
        bankName: "Sample Bank",
        accountNumber: "****1234",
        routingNumber: "123456789",
        instructions:
          "Please include your invoice number in the reference field.",
      },
    };
  }

  private async updatePaymentGatewayConfig(
    companyId: string,
    config: Partial<PaymentGatewayConfig>
  ): Promise<void> {
    // This would update the settings table
    // For now, just a placeholder
  }

  private async getBankingConfig(companyId: string): Promise<BankingConfig> {
    return {
      bankName: "Sample Bank",
      accountNumber: "****1234",
      routingNumber: "123456789",
    };
  }

  private async updateBankingConfig(
    companyId: string,
    config: Partial<BankingConfig>
  ): Promise<void> {
    // This would update the settings table
    // For now, just a placeholder
  }

  private async getCloudStorageConfig(
    companyId: string
  ): Promise<CloudStorageConfig> {
    return {
      provider: "none",
    };
  }

  private async updateCloudStorageConfig(
    companyId: string,
    config: Partial<CloudStorageConfig>
  ): Promise<void> {
    // This would update the settings table
    // For now, just a placeholder
  }

  async getNotificationSettings(
    companyId: string,
    userId: string
  ): Promise<NotificationSettings> {
    // Get user-specific notification settings
    const userSettings = await this.prisma.userNotificationSettings.findUnique({
      where: { userId },
    });

    if (userSettings) {
      return {
        emailNotifications: userSettings.emailNotifications,
        pushNotifications: userSettings.pushNotifications,
        invoiceReminders: userSettings.invoiceReminders,
        billReminders: userSettings.billReminders,
        paymentConfirmations: userSettings.paymentConfirmations,
        overdueAlerts: userSettings.overdueAlerts,
        reportDelivery: userSettings.reportDelivery,
        securityAlerts: userSettings.securityAlerts,
        reminderFrequency: userSettings.reminderFrequency as
          | "daily"
          | "weekly"
          | "monthly",
        quietHours: {
          enabled: userSettings.quietHoursEnabled,
          start: userSettings.quietHoursStart || "22:00",
          end: userSettings.quietHoursEnd || "08:00",
        },
      };
    }

    // Return defaults if no user settings found
    return {
      emailNotifications: true,
      pushNotifications: false,
      invoiceReminders: true,
      billReminders: true,
      paymentConfirmations: true,
      overdueAlerts: true,
      reportDelivery: false,
      securityAlerts: true,
      reminderFrequency: "weekly",
      quietHours: {
        enabled: false,
        start: "22:00",
        end: "08:00",
      },
    };
  }

  async updateNotificationSettings(
    companyId: string,
    userId: string,
    updateData: Partial<NotificationSettings>
  ): Promise<NotificationSettings> {
    // Update or create user notification settings
    const upsertData: any = {
      userId,
      emailNotifications: updateData.emailNotifications,
      pushNotifications: updateData.pushNotifications,
      invoiceReminders: updateData.invoiceReminders,
      billReminders: updateData.billReminders,
      paymentConfirmations: updateData.paymentConfirmations,
      overdueAlerts: updateData.overdueAlerts,
      reportDelivery: updateData.reportDelivery,
      securityAlerts: updateData.securityAlerts,
      reminderFrequency: updateData.reminderFrequency,
      quietHoursEnabled: updateData.quietHours?.enabled,
      quietHoursStart: updateData.quietHours?.start,
      quietHoursEnd: updateData.quietHours?.end,
    };

    await this.prisma.userNotificationSettings.upsert({
      where: { userId },
      update: upsertData,
      create: upsertData,
    });

    return this.getNotificationSettings(companyId, userId);
  }

  async getSecuritySettings(companyId: string): Promise<SecuritySettings> {
    // Get company security settings
    const companySettings =
      await this.prisma.companySecuritySettings.findUnique({
        where: { companyId },
      });

    if (companySettings) {
      return {
        passwordPolicy: {
          minLength: companySettings.passwordMinLength,
          requireUppercase: companySettings.passwordRequireUppercase,
          requireLowercase: companySettings.passwordRequireLowercase,
          requireNumbers: companySettings.passwordRequireNumbers,
          requireSpecialChars: companySettings.passwordRequireSpecialChars,
          expirationDays: companySettings.passwordExpirationDays,
        },
        sessionTimeout: companySettings.sessionTimeout,
        mfaRequired: companySettings.mfaRequired,
        ipWhitelist: companySettings.ipWhitelist || [],
        failedLoginAttempts: companySettings.failedLoginAttempts,
        accountLockoutDuration: companySettings.accountLockoutDuration,
        auditLogging: companySettings.auditLogging,
      };
    }

    // Return defaults if no settings found
    return {
      passwordPolicy: {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
        expirationDays: 90,
      },
      sessionTimeout: 30,
      mfaRequired: false,
      ipWhitelist: [],
      failedLoginAttempts: 5,
      accountLockoutDuration: 15,
      auditLogging: true,
    };
  }

  async updateSecuritySettings(
    companyId: string,
    updateData: Partial<SecuritySettings>
  ): Promise<SecuritySettings> {
    // Update or create company security settings
    if (
      updateData.passwordPolicy ||
      updateData.sessionTimeout !== undefined ||
      updateData.mfaRequired !== undefined ||
      updateData.ipWhitelist ||
      updateData.failedLoginAttempts !== undefined ||
      updateData.accountLockoutDuration !== undefined ||
      updateData.auditLogging !== undefined
    ) {
      const upsertData: any = {};

      if (updateData.passwordPolicy) {
        upsertData.passwordMinLength = updateData.passwordPolicy.minLength;
        upsertData.passwordRequireUppercase =
          updateData.passwordPolicy.requireUppercase;
        upsertData.passwordRequireLowercase =
          updateData.passwordPolicy.requireLowercase;
        upsertData.passwordRequireNumbers =
          updateData.passwordPolicy.requireNumbers;
        upsertData.passwordRequireSpecialChars =
          updateData.passwordPolicy.requireSpecialChars;
        upsertData.passwordExpirationDays =
          updateData.passwordPolicy.expirationDays;
      }

      if (updateData.sessionTimeout !== undefined)
        upsertData.sessionTimeout = updateData.sessionTimeout;
      if (updateData.mfaRequired !== undefined)
        upsertData.mfaRequired = updateData.mfaRequired;
      if (updateData.ipWhitelist)
        upsertData.ipWhitelist = updateData.ipWhitelist;
      if (updateData.failedLoginAttempts !== undefined)
        upsertData.failedLoginAttempts = updateData.failedLoginAttempts;
      if (updateData.accountLockoutDuration !== undefined)
        upsertData.accountLockoutDuration = updateData.accountLockoutDuration;
      if (updateData.auditLogging !== undefined)
        upsertData.auditLogging = updateData.auditLogging;

      await this.prisma.companySecuritySettings.upsert({
        where: { companyId },
        update: upsertData,
        create: { companyId, ...upsertData },
      });
    }

    return this.getSecuritySettings(companyId);
  }

  async createBackup(companyId: string, userId: string): Promise<BackupResult> {
    // This would create an actual backup of the company data
    // For now, just create a backup record
    const backup = await this.prisma.dataBackup.create({
      data: {
        companyId,
        createdBy: userId,
        filename: `backup-${companyId}-${new Date().toISOString().split("T")[0]}.zip`,
        status: "COMPLETED",
        size: "0 MB", // Would be actual size
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
      },
    });

    return {
      id: backup.id,
      filename: backup.filename,
      size: backup.size,
      status: backup.status as "COMPLETED" | "FAILED" | "IN_PROGRESS",
      createdAt: backup.createdAt,
      expiresAt: backup.expiresAt,
      downloadUrl: `/api/settings/backup/${backup.id}/download`,
    };
  }

  async getBackupHistory(companyId: string): Promise<BackupResult[]> {
    const backups = await this.prisma.dataBackup.findMany({
      where: { companyId },
      orderBy: { createdAt: "desc" },
    });

    return backups.map((backup) => ({
      id: backup.id,
      filename: backup.filename,
      size: backup.size,
      status: backup.status as "COMPLETED" | "FAILED" | "IN_PROGRESS",
      createdAt: backup.createdAt,
      expiresAt: backup.expiresAt,
      downloadUrl: `/api/settings/backup/${backup.id}/download`,
    }));
  }
}

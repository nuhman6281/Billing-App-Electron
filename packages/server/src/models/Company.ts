import { PrismaClient, Company } from '@prisma/client';

export interface CreateCompanyInput {
  name: string;
  legalName?: string;
  taxId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateCompanyInput {
  name?: string;
  legalName?: string;
  taxId?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  phone?: string;
  email?: string;
  website?: string;
  logo?: string;
  isActive?: boolean;
  updatedBy: string;
}

export interface CompanyWithStats extends Company {
  _count?: {
    users: number;
    chartOfAccounts: number;
    journalEntries: number;
    invoices: number;
    bills: number;
    customers: number;
    vendors: number;
  };
}

export class CompanyService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new company
   */
  async createCompany(input: CreateCompanyInput): Promise<Company> {
    // Validate company name uniqueness
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        name: input.name,
        isDeleted: false,
      },
    });

    if (existingCompany) {
      throw new Error(`Company name "${input.name}" already exists`);
    }

    // Validate email uniqueness if provided
    if (input.email) {
      const existingCompanyWithEmail = await this.prisma.company.findFirst({
        where: {
          email: input.email,
          isDeleted: false,
        },
      });

      if (existingCompanyWithEmail) {
        throw new Error(`Company with email "${input.email}" already exists`);
      }
    }

    // Validate tax ID uniqueness if provided
    if (input.taxId) {
      const existingCompanyWithTaxId = await this.prisma.company.findFirst({
        where: {
          taxId: input.taxId,
          isDeleted: false,
        },
      });

      if (existingCompanyWithTaxId) {
        throw new Error(`Company with tax ID "${input.taxId}" already exists`);
      }
    }

    return this.prisma.company.create({
      data: {
        ...input,
        isActive: true,
      },
    });
  }

  /**
   * Update an existing company
   */
  async updateCompany(id: string, input: UpdateCompanyInput): Promise<Company> {
    // Check if company exists
    const existingCompany = await this.prisma.company.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!existingCompany) {
      throw new Error('Company not found');
    }

    // Validate name uniqueness if changing
    if (input.name && input.name !== existingCompany.name) {
      const duplicateCompany = await this.prisma.company.findFirst({
        where: {
          name: input.name,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateCompany) {
        throw new Error(`Company name "${input.name}" already exists`);
      }
    }

    // Validate email uniqueness if changing
    if (input.email && input.email !== existingCompany.email) {
      const duplicateCompany = await this.prisma.company.findFirst({
        where: {
          email: input.email,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateCompany) {
        throw new Error(`Company with email "${input.email}" already exists`);
      }
    }

    // Validate tax ID uniqueness if changing
    if (input.taxId && input.taxId !== existingCompany.taxId) {
      const duplicateCompany = await this.prisma.company.findFirst({
        where: {
          taxId: input.taxId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateCompany) {
        throw new Error(`Company with tax ID "${input.taxId}" already exists`);
      }
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get company by ID
   */
  async getCompanyById(id: string): Promise<Company | null> {
    return this.prisma.company.findFirst({
      where: {
        id,
        isDeleted: false,
      },
    });
  }

  /**
   * Get company with statistics
   */
  async getCompanyWithStats(id: string): Promise<CompanyWithStats | null> {
    return this.prisma.company.findFirst({
      where: {
        id,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            users: true,
            chartOfAccounts: true,
            journalEntries: true,
            invoices: true,
            bills: true,
            customers: true,
            vendors: true,
          },
        },
      },
    });
  }

  /**
   * Get all companies with optional filtering
   */
  async getCompanies(options: {
    isActive?: boolean;
    search?: string;
    limit?: number;
    offset?: number;
  } = {}): Promise<{ companies: Company[]; total: number }> {
    const where: any = {
      isDeleted: false,
    };

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { legalName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
        { taxId: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      this.prisma.company.findMany({
        where,
        orderBy: [
          { name: 'asc' },
          { createdAt: 'desc' },
        ],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.company.count({ where }),
    ]);

    return { companies, total };
  }

  /**
   * Delete company (soft delete)
   */
  async deleteCompany(id: string, deletedBy: string): Promise<void> {
    // Check if company exists
    const company = await this.getCompanyById(id);
    if (!company) {
      throw new Error('Company not found');
    }

    // Check if company has active users
    const hasActiveUsers = await this.prisma.user.findFirst({
      where: {
        companyId: id,
        isDeleted: false,
      },
    });

    if (hasActiveUsers) {
      throw new Error('Cannot delete company with active users. Please deactivate or remove users first.');
    }

    // Check if company has chart of accounts
    const hasChartOfAccounts = await this.prisma.chartOfAccount.findFirst({
      where: {
        companyId: id,
        isDeleted: false,
      },
    });

    if (hasChartOfAccounts) {
      throw new Error('Cannot delete company with chart of accounts. Please remove accounts first.');
    }

    // Check if company has journal entries
    const hasJournalEntries = await this.prisma.journalEntry.findFirst({
      where: {
        companyId: id,
        isDeleted: false,
      },
    });

    if (hasJournalEntries) {
      throw new Error('Cannot delete company with journal entries. Please remove entries first.');
    }

    // Check if company has invoices
    const hasInvoices = await this.prisma.invoice.findFirst({
      where: {
        companyId: id,
        isDeleted: false,
      },
    });

    if (hasInvoices) {
      throw new Error('Cannot delete company with invoices. Please remove invoices first.');
    }

    // Check if company has bills
    const hasBills = await this.prisma.bill.findFirst({
      where: {
        companyId: id,
        isDeleted: false,
      },
    });

    if (hasBills) {
      throw new Error('Cannot delete company with bills. Please remove bills first.');
    }

    // Soft delete
    await this.prisma.company.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Activate/Deactivate company
   */
  async toggleCompanyStatus(id: string, isActive: boolean, updatedBy: string): Promise<Company> {
    // Check if company exists
    const company = await this.getCompanyById(id);
    if (!company) {
      throw new Error('Company not found');
    }

    return this.prisma.company.update({
      where: { id },
      data: {
        isActive,
        updatedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get company dashboard statistics
   */
  async getCompanyDashboardStats(companyId: string): Promise<{
    totalUsers: number;
    totalAccounts: number;
    totalJournalEntries: number;
    totalInvoices: number;
    totalBills: number;
    totalCustomers: number;
    totalVendors: number;
    recentActivity: any[];
  }> {
    const [
      totalUsers,
      totalAccounts,
      totalJournalEntries,
      totalInvoices,
      totalBills,
      totalCustomers,
      totalVendors,
      recentActivity,
    ] = await Promise.all([
      this.prisma.user.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.chartOfAccount.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.journalEntry.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.invoice.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.bill.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.customer.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.vendor.count({
        where: {
          companyId,
          isDeleted: false,
        },
      }),
      this.prisma.journalEntry.findMany({
        where: {
          companyId,
          isDeleted: false,
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: 10,
        include: {
          user: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
      }),
    ]);

    return {
      totalUsers,
      totalAccounts,
      totalJournalEntries,
      totalInvoices,
      totalBills,
      totalCustomers,
      totalVendors,
      recentActivity,
    };
  }

  /**
   * Get company financial summary
   */
  async getCompanyFinancialSummary(companyId: string): Promise<{
    totalAssets: number;
    totalLiabilities: number;
    totalEquity: number;
    totalRevenue: number;
    totalExpenses: number;
    netIncome: number;
  }> {
    // Get all accounts for the company
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        companyId,
        isDeleted: false,
        isActive: true,
      },
      select: {
        type: true,
        balance: true,
      },
    });

    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalEquity = 0;
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const account of accounts) {
      const balance = parseFloat(account.balance.toString());
      
      switch (account.type) {
        case 'ASSET':
          totalAssets += balance;
          break;
        case 'LIABILITY':
          totalLiabilities += balance;
          break;
        case 'EQUITY':
          totalEquity += balance;
          break;
        case 'REVENUE':
          totalRevenue += balance;
          break;
        case 'EXPENSE':
          totalExpenses += balance;
          break;
      }
    }

    const netIncome = totalRevenue - totalExpenses;

    return {
      totalAssets,
      totalLiabilities,
      totalEquity,
      totalRevenue,
      totalExpenses,
      netIncome,
    };
  }

  /**
   * Get default company settings
   */
  getDefaultCompanySettings() {
    return {
      fiscalYearStart: '01-01', // January 1st
      defaultCurrency: 'USD',
      dateFormat: 'MM/DD/YYYY',
      timeFormat: '12', // 12-hour format
      decimalPlaces: 2,
      taxCalculationMethod: 'PERCENTAGE',
      invoiceNumbering: 'SEQUENTIAL',
      billNumbering: 'SEQUENTIAL',
      journalEntryNumbering: 'SEQUENTIAL',
      autoBackup: true,
      backupFrequency: 'DAILY',
      retentionPeriod: 7, // years
    };
  }

  /**
   * Initialize company with default settings
   */
  async initializeCompany(companyId: string, createdBy: string): Promise<void> {
    // This method will be called after company creation to set up:
    // 1. Default chart of accounts
    // 2. Default company settings
    // 3. Initial user setup
    // 4. Basic templates
    
    // Note: Chart of accounts initialization is handled by ChartOfAccountService
    // This method can be extended to handle other company-specific initializations
  }
}


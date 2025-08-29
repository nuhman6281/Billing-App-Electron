import { PrismaClient, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

// Define the types locally since they're not exported from Prisma client
type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
type AccountCategory =
  | "CURRENT_ASSETS"
  | "FIXED_ASSETS"
  | "CURRENT_LIABILITIES"
  | "LONG_TERM_LIABILITIES"
  | "EQUITY"
  | "OPERATING_REVENUE"
  | "OPERATING_EXPENSE"
  | "NON_OPERATING_REVENUE"
  | "NON_OPERATING_EXPENSE";

export interface CreateChartOfAccountInput {
  code: string;
  name: string;
  type: string; // Accept string from frontend, will be mapped to enum
  category: string; // Accept string from frontend, will be mapped to enum
  parentId?: string;
  companyId: string;
  description?: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateChartOfAccountInput {
  code?: string;
  name?: string;
  type?: string; // Accept string from frontend, will be mapped to enum
  category?: string; // Accept string from frontend, will be mapped to enum
  parentId?: string;
  description?: string;
  isActive?: boolean;
  updatedBy: string;
}

export interface ChartOfAccountWithChildren {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  balance: Decimal;
  isActive: boolean;
  parentId?: string | null;
  companyId: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  children?: ChartOfAccountWithChildren[];
  _count?: {
    children: number;
  };
}

export interface ChartOfAccountTree {
  id: string;
  code: string;
  name: string;
  type: AccountType;
  category: AccountCategory;
  balance: Decimal;
  isActive: boolean;
  children: ChartOfAccountTree[];
}

export class ChartOfAccountService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new chart of account
   */
  async createAccount(
    input: CreateChartOfAccountInput
  ): Promise<ChartOfAccountWithChildren> {
    // Validate account code uniqueness within company
    const existingAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingAccount) {
      throw new Error(
        `Account code ${input.code} already exists in this company`
      );
    }

    // Validate parent account exists and belongs to same company
    if (input.parentId) {
      const parentAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: input.parentId,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (!parentAccount) {
        throw new Error(
          "Parent account not found or does not belong to this company"
        );
      }
    }

    // Validate and map enum values
    const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
    const validCategories = [
      "CURRENT_ASSETS",
      "FIXED_ASSETS",
      "CURRENT_LIABILITIES",
      "LONG_TERM_LIABILITIES",
      "EQUITY",
      "OPERATING_REVENUE",
      "OPERATING_EXPENSE",
      "NON_OPERATING_REVENUE",
      "NON_OPERATING_EXPENSE",
    ];

    // Normalize the input values
    const normalizedType = input.type.toUpperCase().replace(/\s+/g, "_");
    const normalizedCategory = input.category
      .toUpperCase()
      .replace(/\s+/g, "_");

    // Validate type
    if (!validTypes.includes(normalizedType)) {
      throw new Error(
        `Invalid account type: ${input.type}. Must be one of: ${validTypes.join(", ")}`
      );
    }

    // Validate category
    if (!validCategories.includes(normalizedCategory)) {
      throw new Error(
        `Invalid account category: ${input.category}. Must be one of: ${validCategories.join(", ")}`
      );
    }

    // Handle empty parentId
    const parentId =
      input.parentId && input.parentId.trim() !== "" ? input.parentId : null;

    return this.prisma.chartOfAccount.create({
      data: {
        ...input,
        type: normalizedType as AccountType,
        category: normalizedCategory as AccountCategory,
        parentId,
        balance: new Decimal(0),
      },
    });
  }

  /**
   * Update an existing chart of account
   */
  async updateAccount(
    id: string,
    input: UpdateChartOfAccountInput,
    companyId: string
  ): Promise<ChartOfAccountWithChildren> {
    // Check if account exists and belongs to company
    const existingAccount = await this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingAccount) {
      throw new Error("Account not found");
    }

    // Validate account code uniqueness if changing
    if (input.code && input.code !== existingAccount.code) {
      const duplicateAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          code: input.code,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateAccount) {
        throw new Error(
          `Account code ${input.code} already exists in this company`
        );
      }
    }

    // Validate parent account if changing
    if (input.parentId && input.parentId !== existingAccount.parentId) {
      if (input.parentId === id) {
        throw new Error("Account cannot be its own parent");
      }

      const parentAccount = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: input.parentId,
          companyId,
          isDeleted: false,
        },
      });

      if (!parentAccount) {
        throw new Error(
          "Parent account not found or does not belong to this company"
        );
      }

      // Check for circular references
      if (await this.wouldCreateCircularReference(id, input.parentId)) {
        throw new Error(
          "This would create a circular reference in the account hierarchy"
        );
      }
    }

    // Prepare update data
    const updateData: any = { ...input, updatedAt: new Date() };

    // Handle enum values if provided
    if (input.type) {
      const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
      const normalizedType = input.type.toUpperCase().replace(/\s+/g, "_");

      if (!validTypes.includes(normalizedType)) {
        throw new Error(
          `Invalid account type: ${input.type}. Must be one of: ${validTypes.join(", ")}`
        );
      }

      updateData.type = normalizedType;
    }

    if (input.category) {
      const validCategories = [
        "CURRENT_ASSETS",
        "FIXED_ASSETS",
        "CURRENT_LIABILITIES",
        "LONG_TERM_LIABILITIES",
        "EQUITY",
        "OPERATING_REVENUE",
        "OPERATING_EXPENSE",
        "NON_OPERATING_REVENUE",
        "NON_OPERATING_EXPENSE",
      ];
      const normalizedCategory = input.category
        .toUpperCase()
        .replace(/\s+/g, "_");

      if (!validCategories.includes(normalizedCategory)) {
        throw new Error(
          `Invalid account category: ${input.category}. Must be one of: ${validCategories.join(", ")}`
        );
      }

      updateData.category = normalizedCategory;
    }

    // Handle empty parentId
    if (input.parentId !== undefined) {
      updateData.parentId =
        input.parentId && input.parentId.trim() !== "" ? input.parentId : null;
    }

    return this.prisma.chartOfAccount.update({
      where: { id },
      data: updateData,
    });
  }

  /**
   * Get account by ID with company validation
   */
  async getAccountById(
    id: string,
    companyId: string
  ): Promise<ChartOfAccountWithChildren | null> {
    return this.prisma.chartOfAccount.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });
  }

  /**
   * Get all accounts for a company with optional filtering
   */
  async getAccounts(
    companyId: string,
    options: {
      type?: string; // Accept string from frontend, will be mapped to enum
      category?: string; // Accept string from frontend, will be mapped to enum
      isActive?: boolean;
      parentId?: string | null;
      search?: string;
    } = {}
  ): Promise<ChartOfAccountWithChildren[]> {
    const where: any = {
      companyId,
      isDeleted: false,
    };

    // Map frontend display values to database enum values for filtering
    if (options.type) {
      const validTypes = ["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"];
      const normalizedType = options.type.toUpperCase().replace(/\s+/g, "_");
      if (validTypes.includes(normalizedType)) {
        where.type = normalizedType;
      }
    }
    if (options.category) {
      const validCategories = [
        "CURRENT_ASSETS",
        "FIXED_ASSETS",
        "CURRENT_LIABILITIES",
        "LONG_TERM_LIABILITIES",
        "EQUITY",
        "OPERATING_REVENUE",
        "OPERATING_EXPENSE",
        "NON_OPERATING_REVENUE",
        "NON_OPERATING_EXPENSE",
      ];
      const normalizedCategory = options.category
        .toUpperCase()
        .replace(/\s+/g, "_");
      if (validCategories.includes(normalizedCategory)) {
        where.category = normalizedCategory;
      }
    }
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.parentId !== undefined) where.parentId = options.parentId;
    if (options.search) {
      where.OR = [
        { code: { contains: options.search, mode: "insensitive" } },
        { name: { contains: options.search, mode: "insensitive" } },
        { description: { contains: options.search, mode: "insensitive" } },
      ];
    }

    return this.prisma.chartOfAccount.findMany({
      where,
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });
  }

  /**
   * Get account hierarchy tree for a company
   */
  async getAccountTree(companyId: string): Promise<ChartOfAccountTree[]> {
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        companyId,
        isDeleted: false,
        isActive: true,
      },
      orderBy: [{ code: "asc" }, { name: "asc" }],
    });

    return this.buildAccountTree(accounts);
  }

  /**
   * Get account balance with all child account balances
   */
  async getAccountBalance(id: string, companyId: string): Promise<Decimal> {
    const account = await this.getAccountById(id, companyId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Get all child accounts recursively
    const childAccountIds = await this.getAllChildAccountIds(id);

    // Calculate total balance including children
    const accounts = await this.prisma.chartOfAccount.findMany({
      where: {
        id: { in: [id, ...childAccountIds] },
        companyId,
        isDeleted: false,
      },
      select: { balance: true },
    });

    return accounts.reduce(
      (total, acc) => total.plus(acc.balance),
      new Decimal(0)
    );
  }

  /**
   * Update account balance (used by journal entries)
   */
  async updateAccountBalance(
    id: string,
    debitAmount: Decimal,
    creditAmount: Decimal
  ): Promise<void> {
    const debit = debitAmount || new Decimal(0);
    const credit = creditAmount || new Decimal(0);
    const netChange = debit.minus(credit);

    await this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        balance: {
          increment: netChange,
        },
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete account (soft delete)
   */
  async deleteAccount(
    id: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    // Check if account exists and belongs to company
    const account = await this.getAccountById(id, companyId);
    if (!account) {
      throw new Error("Account not found");
    }

    // Check if account has children
    const hasChildren = await this.prisma.chartOfAccount.findFirst({
      where: {
        parentId: id,
        isDeleted: false,
      },
    });

    if (hasChildren) {
      throw new Error(
        "Cannot delete account with child accounts. Please delete children first."
      );
    }

    // Check if account has journal entry lines
    const hasJournalEntries = await this.prisma.journalEntryLine.findFirst({
      where: {
        accountId: id,
      },
    });

    if (hasJournalEntries) {
      throw new Error(
        "Cannot delete account with journal entries. Please void or reverse entries first."
      );
    }

    // Soft delete
    await this.prisma.chartOfAccount.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedBy: deletedBy,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get default chart of accounts for a new company
   */
  async getDefaultChartOfAccounts(): Promise<
    Omit<CreateChartOfAccountInput, "companyId" | "createdBy" | "updatedBy">[]
  > {
    return [
      // Assets
      {
        code: "1000",
        name: "Current Assets",
        type: "ASSET",
        category: "CURRENT_ASSETS",
        description: "Short-term assets",
      },
      {
        code: "1100",
        name: "Cash and Cash Equivalents",
        type: "ASSET",
        category: "CURRENT_ASSETS",
        parentId: undefined,
        description: "Cash, bank accounts, and short-term investments",
      },
      {
        code: "1200",
        name: "Accounts Receivable",
        type: "ASSET",
        category: "CURRENT_ASSETS",
        parentId: undefined,
        description: "Amounts owed by customers",
      },
      {
        code: "1300",
        name: "Inventory",
        type: "ASSET",
        category: "CURRENT_ASSETS",
        parentId: undefined,
        description: "Goods held for sale",
      },
      {
        code: "1400",
        name: "Prepaid Expenses",
        type: "ASSET",
        category: "CURRENT_ASSETS",
        parentId: undefined,
        description: "Expenses paid in advance",
      },

      {
        code: "2000",
        name: "Fixed Assets",
        type: "ASSET",
        category: "FIXED_ASSETS",
        description: "Long-term assets",
      },
      {
        code: "2100",
        name: "Equipment",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parentId: undefined,
        description: "Office equipment and machinery",
      },
      {
        code: "2200",
        name: "Buildings",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parentId: undefined,
        description: "Office buildings and facilities",
      },
      {
        code: "2300",
        name: "Vehicles",
        type: "ASSET",
        category: "FIXED_ASSETS",
        parentId: undefined,
        description: "Company vehicles",
      },

      // Liabilities
      {
        code: "3000",
        name: "Current Liabilities",
        type: "LIABILITY",
        category: "CURRENT_LIABILITIES",
        description: "Short-term obligations",
      },
      {
        code: "3100",
        name: "Accounts Payable",
        type: "LIABILITY",
        category: "CURRENT_LIABILITIES",
        parentId: undefined,
        description: "Amounts owed to suppliers",
      },
      {
        code: "3200",
        name: "Accrued Expenses",
        type: "LIABILITY",
        category: "CURRENT_LIABILITIES",
        parentId: undefined,
        description: "Expenses incurred but not yet paid",
      },
      {
        code: "3300",
        name: "Short-term Loans",
        type: "LIABILITY",
        category: "CURRENT_LIABILITIES",
        parentId: undefined,
        description: "Short-term borrowings",
      },

      {
        code: "4000",
        name: "Long-term Liabilities",
        type: "LIABILITY",
        category: "LONG_TERM_LIABILITIES",
        description: "Long-term obligations",
      },
      {
        code: "4100",
        name: "Long-term Loans",
        type: "LIABILITY",
        category: "LONG_TERM_LIABILITIES",
        parentId: undefined,
        description: "Long-term borrowings",
      },

      // Equity
      {
        code: "5000",
        name: "Equity",
        type: "EQUITY",
        category: "EQUITY",
        description: "Owner's equity",
      },
      {
        code: "5100",
        name: "Common Stock",
        type: "EQUITY",
        category: "EQUITY",
        parentId: undefined,
        description: "Common stock issued",
      },
      {
        code: "5200",
        name: "Retained Earnings",
        type: "EQUITY",
        category: "EQUITY",
        parentId: undefined,
        description: "Accumulated profits",
      },

      // Revenue
      {
        code: "6000",
        name: "Operating Revenue",
        type: "REVENUE",
        category: "OPERATING_REVENUE",
        description: "Revenue from core business operations",
      },
      {
        code: "6100",
        name: "Sales Revenue",
        type: "REVENUE",
        category: "OPERATING_REVENUE",
        parentId: undefined,
        description: "Revenue from sales of goods/services",
      },
      {
        code: "6200",
        name: "Service Revenue",
        type: "REVENUE",
        category: "OPERATING_REVENUE",
        parentId: undefined,
        description: "Revenue from services provided",
      },

      // Expenses
      {
        code: "7000",
        name: "Operating Expenses",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        description: "Expenses from core business operations",
      },
      {
        code: "7100",
        name: "Cost of Goods Sold",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Direct costs of producing goods/services",
      },
      {
        code: "7200",
        name: "Salaries and Wages",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Employee compensation",
      },
      {
        code: "7300",
        name: "Rent Expense",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Office and facility rent",
      },
      {
        code: "7400",
        name: "Utilities",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Electricity, water, internet, etc.",
      },
      {
        code: "7500",
        name: "Office Supplies",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Office materials and supplies",
      },
      {
        code: "7600",
        name: "Marketing and Advertising",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Promotional activities",
      },
      {
        code: "7700",
        name: "Insurance",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Business insurance premiums",
      },
      {
        code: "7800",
        name: "Depreciation",
        type: "EXPENSE",
        category: "OPERATING_EXPENSE",
        parentId: undefined,
        description: "Asset depreciation expense",
      },
    ];
  }

  /**
   * Initialize default chart of accounts for a new company
   */
  async initializeDefaultChartOfAccounts(
    companyId: string,
    createdBy: string
  ): Promise<void> {
    const defaultAccounts = await this.getDefaultChartOfAccounts();

    // Create parent accounts first
    const parentAccounts = new Map<string, string>();

    for (const account of defaultAccounts) {
      if (!account.parentId) {
        const createdAccount = await this.createAccount({
          ...account,
          companyId,
          createdBy,
          updatedBy: createdBy,
        });
        parentAccounts.set(account.code, createdAccount.id);
      }
    }

    // Create child accounts with proper parent references
    for (const account of defaultAccounts) {
      if (account.parentId) {
        const parentCode = account.code.substring(0, account.code.length - 2);
        const parentId = parentAccounts.get(parentCode);

        if (parentId) {
          await this.createAccount({
            ...account,
            companyId,
            parentId,
            createdBy,
            updatedBy: createdBy,
          });
        }
      }
    }
  }

  // Private helper methods
  private async wouldCreateCircularReference(
    accountId: string,
    newParentId: string
  ): Promise<boolean> {
    let currentParentId = newParentId;
    const visited = new Set<string>();

    while (currentParentId) {
      if (visited.has(currentParentId)) {
        return true; // Circular reference detected
      }

      if (currentParentId === accountId) {
        return true; // Would create circular reference
      }

      visited.add(currentParentId);

      const parent = await this.prisma.chartOfAccount.findUnique({
        where: { id: currentParentId },
        select: { parentId: true },
      });

      currentParentId = parent?.parentId || "";
    }

    return false;
  }

  private async getAllChildAccountIds(parentId: string): Promise<string[]> {
    const children = await this.prisma.chartOfAccount.findMany({
      where: {
        parentId,
        isDeleted: false,
      },
      select: { id: true },
    });

    const childIds = children.map((child) => child.id);
    const grandChildIds = await Promise.all(
      childIds.map((id) => this.getAllChildAccountIds(id))
    );

    return [...childIds, ...grandChildIds.flat()];
  }

  private buildAccountTree(
    accounts: ChartOfAccountWithChildren[]
  ): ChartOfAccountTree[] {
    const accountMap = new Map<string, ChartOfAccountTree>();
    const rootAccounts: ChartOfAccountTree[] = [];

    // Create map of all accounts
    for (const account of accounts) {
      accountMap.set(account.id, {
        id: account.id,
        code: account.code,
        name: account.name,
        type: account.type,
        category: account.category,
        balance: account.balance,
        isActive: account.isActive,
        children: [],
      });
    }

    // Build tree structure
    for (const account of accounts) {
      const treeAccount = accountMap.get(account.id)!;

      if (account.parentId) {
        const parent = accountMap.get(account.parentId);
        if (parent) {
          parent.children.push(treeAccount);
        }
      } else {
        rootAccounts.push(treeAccount);
      }
    }

    return rootAccounts;
  }

  /**
   * Get chart of accounts statistics
   */
  async getStats(companyId: string) {
    const [totalAccounts, activeAccounts, accountsByType, accountsByCategory] =
      await Promise.all([
        // Total accounts
        this.prisma.chartOfAccount.count({
          where: {
            companyId,
            isDeleted: false,
          },
        }),
        // Active accounts
        this.prisma.chartOfAccount.count({
          where: {
            companyId,
            isDeleted: false,
            isActive: true,
          },
        }),
        // Accounts by type
        this.prisma.chartOfAccount.groupBy({
          by: ["type"],
          where: {
            companyId,
            isDeleted: false,
          },
          _count: {
            type: true,
          },
        }),
        // Accounts by category
        this.prisma.chartOfAccount.groupBy({
          by: ["category"],
          where: {
            companyId,
            isDeleted: false,
          },
          _count: {
            category: true,
          },
        }),
      ]);

    return {
      totalAccounts,
      activeAccounts,
      inactiveAccounts: totalAccounts - activeAccounts,
      accountsByType: accountsByType.reduce(
        (acc, item) => {
          acc[item.type] = item._count.type;
          return acc;
        },
        {} as Record<string, number>
      ),
      accountsByCategory: accountsByCategory.reduce(
        (acc, item) => {
          acc[item.category] = item._count.category;
          return acc;
        },
        {} as Record<string, number>
      ),
    };
  }

  /**
   * Get total count of chart of accounts
   */
  async getCount(companyId: string): Promise<number> {
    return this.prisma.chartOfAccount.count({
      where: {
        companyId,
        isDeleted: false,
      },
    });
  }
}

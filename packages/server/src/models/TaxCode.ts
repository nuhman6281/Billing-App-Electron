import { PrismaClient, TaxCode } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateTaxCodeInput {
  code: string;
  name: string;
  description?: string;
  taxType: "GST" | "VAT" | "SALES_TAX" | "EXCISE" | "CUSTOMS" | "OTHER";
  rate: Decimal;
  isCompound: boolean;
  isActive: boolean;
  companyId: string;
  createdBy: string;
  
  // GST specific fields (India)
  gstRate?: Decimal;
  cgstRate?: Decimal;
  sgstRate?: Decimal;
  igstRate?: Decimal;
  hsnCode?: string;
  
  // VAT specific fields
  vatRate?: Decimal;
  inputVatRate?: Decimal;
  outputVatRate?: Decimal;
  
  // Sales Tax specific fields
  salesTaxRate?: Decimal;
  stateTaxRate?: Decimal;
  localTaxRate?: Decimal;
  
  // Other fields
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isRecoverable: boolean;
  accountId?: string;
  reverseCharge?: boolean;
  thresholdAmount?: Decimal;
  exemptionLimit?: Decimal;
}

export interface UpdateTaxCodeInput {
  code?: string;
  name?: string;
  description?: string;
  taxType?: "GST" | "VAT" | "SALES_TAX" | "EXCISE" | "CUSTOMS" | "OTHER";
  rate?: Decimal;
  isCompound?: boolean;
  isActive?: boolean;
  
  // GST specific fields
  gstRate?: Decimal;
  cgstRate?: Decimal;
  sgstRate?: Decimal;
  igstRate?: Decimal;
  hsnCode?: string;
  
  // VAT specific fields
  vatRate?: Decimal;
  inputVatRate?: Decimal;
  outputVatRate?: Decimal;
  
  // Sales Tax specific fields
  salesTaxRate?: Decimal;
  stateTaxRate?: Decimal;
  localTaxRate?: Decimal;
  
  // Other fields
  effectiveFrom?: Date;
  effectiveTo?: Date;
  isRecoverable?: boolean;
  accountId?: string;
  reverseCharge?: boolean;
  thresholdAmount?: Decimal;
  exemptionLimit?: Decimal;
}

export interface TaxCodeFilters {
  search?: string;
  taxType?: string;
  isActive?: boolean;
  isCompound?: boolean;
  isRecoverable?: boolean;
  limit?: number;
  offset?: number;
}

export interface TaxCodeWithDetails extends TaxCode {
  account?: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    items: number;
    invoices: number;
    bills: number;
  };
}

export interface TaxCodeStats {
  totalTaxCodes: number;
  activeTaxCodes: number;
  inactiveTaxCodes: number;
  compoundTaxCodes: number;
  recoverableTaxCodes: number;
  taxTypeDistribution: Array<{
    taxType: string;
    count: number;
    averageRate: number;
  }>;
  totalTaxCollected: Decimal;
  totalTaxPaid: Decimal;
}

export class TaxCodeService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new tax code
   */
  async createTaxCode(input: CreateTaxCodeInput): Promise<TaxCode> {
    // Validate tax code uniqueness within company
    const existingTaxCode = await this.prisma.taxCode.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingTaxCode) {
      throw new Error(`Tax code ${input.code} already exists in this company`);
    }

    // Validate name uniqueness within company
    const existingName = await this.prisma.taxCode.findFirst({
      where: {
        name: input.name,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingName) {
      throw new Error(`Tax name ${input.name} already exists in this company`);
    }

    // Validate HSN code uniqueness if provided
    if (input.hsnCode) {
      const existingHsn = await this.prisma.taxCode.findFirst({
        where: {
          hsnCode: input.hsnCode,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingHsn) {
        throw new Error(`HSN code ${input.hsnCode} already exists in this company`);
      }
    }

    // Validate account exists if provided
    if (input.accountId) {
      const account = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: input.accountId,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (!account) {
        throw new Error("Tax account not found");
      }
    }

    // Set default values based on tax type
    const defaultValues = this.getDefaultValuesForTaxType(input.taxType, input.rate);

    return this.prisma.taxCode.create({
      data: {
        ...input,
        updatedBy: input.createdBy, // Set updatedBy to same as createdBy for new records
        ...defaultValues,
        isActive: true,
        effectiveFrom: input.effectiveFrom || new Date(),
        thresholdAmount: input.thresholdAmount || new Decimal(0),
        exemptionLimit: input.exemptionLimit || new Decimal(0),
      },
    });
  }

  /**
   * Update an existing tax code
   */
  async updateTaxCode(
    id: string,
    companyId: string,
    input: UpdateTaxCodeInput
  ): Promise<TaxCode> {
    // Check if tax code exists and belongs to company
    const existingTaxCode = await this.prisma.taxCode.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingTaxCode) {
      throw new Error("Tax code not found");
    }

    // Validate code uniqueness if changing
    if (input.code && input.code !== existingTaxCode.code) {
      const duplicateCode = await this.prisma.taxCode.findFirst({
        where: {
          code: input.code,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateCode) {
        throw new Error(`Tax code ${input.code} already exists in this company`);
      }
    }

    // Validate name uniqueness if changing
    if (input.name && input.name !== existingTaxCode.name) {
      const duplicateName = await this.prisma.taxCode.findFirst({
        where: {
          name: input.name,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateName) {
        throw new Error(`Tax name ${input.name} already exists in this company`);
      }
    }

    // Validate HSN code uniqueness if changing
    if (input.hsnCode && input.hsnCode !== existingTaxCode.hsnCode) {
      const duplicateHsn = await this.prisma.taxCode.findFirst({
        where: {
          hsnCode: input.hsnCode,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateHsn) {
        throw new Error(`HSN code ${input.hsnCode} already exists in this company`);
      }
    }

    // Validate account exists if changing
    if (input.accountId && input.accountId !== existingTaxCode.accountId) {
      const account = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: input.accountId,
          companyId,
          isDeleted: false,
        },
      });

      if (!account) {
        throw new Error("Tax account not found");
      }
    }

    return this.prisma.taxCode.update({
      where: { id },
      data: input,
    });
  }

  /**
   * Get tax code by ID with details
   */
  async getTaxCodeById(id: string, companyId: string): Promise<TaxCodeWithDetails | null> {
    return this.prisma.taxCode.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        account: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            items: true,
            invoices: true,
            bills: true,
          },
        },
      },
    });
  }

  /**
   * Get tax codes with filtering and pagination
   */
  async getTaxCodes(companyId: string, filters: TaxCodeFilters = {}) {
    const {
      search,
      taxType,
      isActive,
      isCompound,
      isRecoverable,
      limit = 50,
      offset = 0,
    } = filters;

    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { hsnCode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (taxType) {
      where.taxType = taxType;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (isCompound !== undefined) {
      where.isCompound = isCompound;
    }

    if (isRecoverable !== undefined) {
      where.isRecoverable = isRecoverable;
    }

    const [taxCodes, total] = await Promise.all([
      this.prisma.taxCode.findMany({
        where,
        include: {
          account: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          _count: {
            select: {
              items: true,
              invoices: true,
              bills: true,
            },
          },
        },
        orderBy: [
          { taxType: "asc" },
          { name: "asc" },
        ],
        take: limit,
        skip: offset,
      }),
      this.prisma.taxCode.count({ where }),
    ]);

    return {
      taxCodes,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get tax codes by type
   */
  async getTaxCodesByType(companyId: string, taxType: string): Promise<TaxCode[]> {
    return this.prisma.taxCode.findMany({
      where: {
        companyId,
        taxType: taxType as any,
        isActive: true,
        isDeleted: false,
      },
      orderBy: [
        { rate: "asc" },
        { name: "asc" },
      ],
    });
  }

  /**
   * Get active GST tax codes
   */
  async getGSTTaxCodes(companyId: string): Promise<TaxCode[]> {
    return this.prisma.taxCode.findMany({
      where: {
        companyId,
        taxType: "GST",
        isActive: true,
        isDeleted: false,
      },
      orderBy: [
        { gstRate: "asc" },
        { name: "asc" },
      ],
    });
  }

  /**
   * Get tax code statistics
   */
  async getTaxCodeStats(companyId: string): Promise<TaxCodeStats> {
    const [
      totalTaxCodes,
      activeTaxCodes,
      inactiveTaxCodes,
      compoundTaxCodes,
      recoverableTaxCodes,
      taxTypeDistribution,
    ] = await Promise.all([
      this.prisma.taxCode.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.taxCode.count({
        where: { companyId, isActive: true, isDeleted: false },
      }),
      this.prisma.taxCode.count({
        where: { companyId, isActive: false, isDeleted: false },
      }),
      this.prisma.taxCode.count({
        where: { companyId, isCompound: true, isDeleted: false },
      }),
      this.prisma.taxCode.count({
        where: { companyId, isRecoverable: true, isDeleted: false },
      }),
      this.prisma.taxCode.groupBy({
        by: ["taxType"],
        where: { companyId, isDeleted: false },
        _count: true,
        _avg: {
          rate: true,
        },
      }),
    ]);

    return {
      totalTaxCodes,
      activeTaxCodes,
      inactiveTaxCodes,
      compoundTaxCodes,
      recoverableTaxCodes,
      taxTypeDistribution: taxTypeDistribution.map((item) => ({
        taxType: item.taxType,
        count: item._count,
        averageRate: Number(item._avg.rate) || 0,
      })),
      totalTaxCollected: new Decimal(0), // TODO: Calculate from transactions
      totalTaxPaid: new Decimal(0), // TODO: Calculate from transactions
    };
  }

  /**
   * Get next available tax code
   */
  async getNextTaxCode(companyId: string): Promise<string> {
    const lastTaxCode = await this.prisma.taxCode.findFirst({
      where: {
        companyId,
        isDeleted: false,
        code: { not: null },
      },
      orderBy: {
        code: "desc",
      },
      select: {
        code: true,
      },
    });

    if (!lastTaxCode || !lastTaxCode.code) {
      return "TAX001";
    }

    const match = lastTaxCode.code.match(/^TAX(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `TAX${nextNumber.toString().padStart(3, "0")}`;
    }

    const totalTaxCodes = await this.prisma.taxCode.count({
      where: { companyId, isDeleted: false },
    });
    return `TAX${(totalTaxCodes + 1).toString().padStart(3, "0")}`;
  }

  /**
   * Calculate tax amount for a given base amount
   */
  calculateTaxAmount(
    taxCode: TaxCode,
    baseAmount: Decimal,
    quantity: number = 1
  ): {
    taxAmount: Decimal;
    cgstAmount: Decimal;
    sgstAmount: Decimal;
    igstAmount: Decimal;
    totalAmount: Decimal;
  } {
    const base = baseAmount.mul(quantity);
    let taxAmount = new Decimal(0);
    let cgstAmount = new Decimal(0);
    let sgstAmount = new Decimal(0);
    let igstAmount = new Decimal(0);

    switch (taxCode.taxType) {
      case "GST":
        if (taxCode.gstRate) {
          taxAmount = base.mul(taxCode.gstRate).div(100);
          
          if (taxCode.cgstRate && taxCode.sgstRate) {
            cgstAmount = base.mul(taxCode.cgstRate).div(100);
            sgstAmount = base.mul(taxCode.sgstRate).div(100);
          } else if (taxCode.igstRate) {
            igstAmount = base.mul(taxCode.igstRate).div(100);
          }
        }
        break;
      
      case "VAT":
        if (taxCode.vatRate) {
          taxAmount = base.mul(taxCode.vatRate).div(100);
        }
        break;
      
      case "SALES_TAX":
        if (taxCode.salesTaxRate) {
          taxAmount = base.mul(taxCode.salesTaxRate).div(100);
        }
        break;
      
      default:
        if (taxCode.rate) {
          taxAmount = base.mul(taxCode.rate).div(100);
        }
        break;
    }

    const totalAmount = base.add(taxAmount);

    return {
      taxAmount,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalAmount,
    };
  }

  /**
   * Delete tax code (soft delete)
   */
  async deleteTaxCode(id: string, companyId: string): Promise<void> {
    const taxCode = await this.prisma.taxCode.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            items: true,
            invoices: true,
            bills: true,
          },
        },
      },
    });

    if (!taxCode) {
      throw new Error("Tax code not found");
    }

    // Check if tax code has any usage
    if (taxCode._count.items > 0 || taxCode._count.invoices > 0 || taxCode._count.bills > 0) {
      throw new Error("Cannot delete tax code with existing usage");
    }

    await this.prisma.taxCode.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Toggle tax code status
   */
  async toggleTaxCodeStatus(id: string, companyId: string): Promise<TaxCode> {
    const taxCode = await this.prisma.taxCode.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!taxCode) {
      throw new Error("Tax code not found");
    }

    return this.prisma.taxCode.update({
      where: { id },
      data: { isActive: !taxCode.isActive },
    });
  }

  /**
   * Get default values for tax type
   */
  private getDefaultValuesForTaxType(
    taxType: string,
    rate: Decimal
  ): Partial<CreateTaxCodeInput> {
    switch (taxType) {
      case "GST":
        return {
          gstRate: rate,
          cgstRate: rate.div(2),
          sgstRate: rate.div(2),
          igstRate: rate,
        };
      
      case "VAT":
        return {
          vatRate: rate,
          inputVatRate: rate,
          outputVatRate: rate,
        };
      
      case "SALES_TAX":
        return {
          salesTaxRate: rate,
          stateTaxRate: rate.mul(0.7), // 70% of total
          localTaxRate: rate.mul(0.3), // 30% of total
        };
      
      default:
        return {};
    }
  }
}


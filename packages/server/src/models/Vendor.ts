import { PrismaClient, Vendor } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateVendorInput {
  code: string;
  name: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxId?: string;
  creditLimit?: Decimal;
  companyId: string;
  createdBy: string;
}

export interface UpdateVendorInput {
  code?: string;
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };
  taxId?: string;
  creditLimit?: Decimal;
  isActive?: boolean;
}

export interface VendorWithStats extends Vendor {
  _count: {
    bills: number;
    payments: number;
  };
  totalOutstanding: Decimal;
  totalPaid: Decimal;
  lastPaymentDate?: Date;
  lastBillDate?: Date;
}

export interface VendorSearchOptions {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class VendorService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new vendor
   */
  async createVendor(input: CreateVendorInput): Promise<Vendor> {
    // Validate vendor code uniqueness within company
    const existingVendor = await this.prisma.vendor.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingVendor) {
      throw new Error(
        `Vendor code ${input.code} already exists in this company`
      );
    }

    // Validate email uniqueness if provided
    if (input.email) {
      const existingEmail = await this.prisma.vendor.findFirst({
        where: {
          email: input.email,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingEmail) {
        throw new Error(
          `Vendor with email ${input.email} already exists in this company`
        );
      }
    }

    return this.prisma.vendor.create({
      data: {
        ...input,
        creditLimit: input.creditLimit || new Decimal(0),
        isActive: true,
      },
    });
  }

  /**
   * Update an existing vendor
   */
  async updateVendor(
    id: string,
    input: UpdateVendorInput,
    companyId: string
  ): Promise<Vendor> {
    // Check if vendor exists and belongs to company
    const existingVendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingVendor) {
      throw new Error("Vendor not found");
    }

    // Validate code uniqueness if being updated
    if (input.code && input.code !== existingVendor.code) {
      const existingCode = await this.prisma.vendor.findFirst({
        where: {
          code: input.code,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingCode) {
        throw new Error(
          `Vendor code ${input.code} already exists in this company`
        );
      }
    }

    // Validate email uniqueness if being updated
    if (input.email && input.email !== existingVendor.email) {
      const existingEmail = await this.prisma.vendor.findFirst({
        where: {
          email: input.email,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new Error(
          `Vendor with email ${input.email} already exists in this company`
        );
      }
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        ...input,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get vendor by ID
   */
  async getVendorById(
    id: string,
    companyId: string
  ): Promise<VendorWithStats | null> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            bills: true,
            payments: true,
          },
        },
      },
    });

    if (!vendor) return null;

    // Calculate financial statistics
    const [totalOutstanding, totalPaid, lastPayment, lastBill] =
      await Promise.all([
        this.prisma.bill.aggregate({
          where: {
            vendorId: id,
            companyId,
            status: { not: "VOIDED" },
            isDeleted: false,
          },
          _sum: {
            total: true,
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            vendorId: id,
            companyId,
            isDeleted: false,
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.payment.findFirst({
          where: {
            vendorId: id,
            companyId,
            isDeleted: false,
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
          },
        }),
        this.prisma.bill.findFirst({
          where: {
            vendorId: id,
            companyId,
            isDeleted: false,
          },
          orderBy: {
            date: "desc",
          },
          select: {
            date: true,
          },
        }),
      ]);

    return {
      ...vendor,
      totalOutstanding: totalOutstanding._sum.total || new Decimal(0),
      totalPaid: totalPaid._sum.amount || new Decimal(0),
      lastPaymentDate: lastPayment?.date,
      lastBillDate: lastBill?.date,
    };
  }

  /**
   * Get all vendors for a company
   */
  async getVendors(
    companyId: string,
    options: VendorSearchOptions = {}
  ): Promise<{ vendors: VendorWithStats[]; total: number }> {
    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    // Note: Address filtering would need to be implemented differently for JSON fields
    // For now, we'll skip city/state/country filtering

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: "insensitive" } },
        { code: { contains: options.search, mode: "insensitive" } },
        { email: { contains: options.search, mode: "insensitive" } },
      ];
    }

    const [vendors, total] = await Promise.all([
      this.prisma.vendor.findMany({
        where,
        include: {
          _count: {
            select: {
              bills: true,
              payments: true,
            },
          },
        },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.vendor.count({ where }),
    ]);

    // Calculate financial statistics for each vendor
    const vendorsWithStats = await Promise.all(
      vendors.map(async (vendor) => {
        const [totalOutstanding, totalPaid, lastPayment, lastBill] =
          await Promise.all([
            this.prisma.bill.aggregate({
              where: {
                vendorId: vendor.id,
                companyId,
                status: { not: "VOIDED" },
                isDeleted: false,
              },
              _sum: {
                total: true,
              },
            }),
            this.prisma.payment.aggregate({
              where: {
                vendorId: vendor.id,
                companyId,
                isDeleted: false,
              },
              _sum: {
                amount: true,
              },
            }),
            this.prisma.payment.findFirst({
              where: {
                vendorId: vendor.id,
                companyId,
                isDeleted: false,
              },
              orderBy: {
                date: "desc",
              },
              select: {
                date: true,
              },
            }),
            this.prisma.bill.findFirst({
              where: {
                vendorId: vendor.id,
                companyId,
                isDeleted: false,
              },
              orderBy: {
                date: "desc",
              },
              select: {
                date: true,
              },
            }),
          ]);

        return {
          ...vendor,
          totalOutstanding: totalOutstanding._sum.total || new Decimal(0),
          totalPaid: totalPaid._sum.amount || new Decimal(0),
          lastPaymentDate: lastPayment?.date,
          lastBillDate: lastBill?.date,
        };
      })
    );

    return { vendors: vendorsWithStats, total };
  }

  /**
   * Get vendor aging report
   */
  async getVendorAging(companyId: string): Promise<
    {
      vendorId: string;
      vendorName: string;
      vendorCode: string;
      current: Decimal;
      days30: Decimal;
      days60: Decimal;
      days90: Decimal;
      over90: Decimal;
      total: Decimal;
    }[]
  > {
    const vendors = await this.prisma.vendor.findMany({
      where: {
        companyId,
        isDeleted: false,
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        code: true,
      },
    });

    const agingData = await Promise.all(
      vendors.map(async (vendor) => {
        const bills = await this.prisma.bill.findMany({
          where: {
            vendorId: vendor.id,
            companyId,
            status: { not: "VOIDED" },
            isDeleted: false,
          },
          select: {
            total: true,
            dueDate: true,
            date: true,
          },
        });

        const now = new Date();
        let current = new Decimal(0);
        let days30 = new Decimal(0);
        let days60 = new Decimal(0);
        let days90 = new Decimal(0);
        let over90 = new Decimal(0);

        bills.forEach((bill) => {
          const dueDate = bill.dueDate || bill.date;
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysOverdue <= 0) {
            current = current.plus(bill.total);
          } else if (daysOverdue <= 30) {
            days30 = days30.plus(bill.total);
          } else if (daysOverdue <= 60) {
            days60 = days60.plus(bill.total);
          } else if (daysOverdue <= 90) {
            days90 = days90.plus(bill.total);
          } else {
            over90 = over90.plus(bill.total);
          }
        });

        const total = current
          .plus(days30)
          .plus(days60)
          .plus(days90)
          .plus(over90);

        return {
          vendorId: vendor.id,
          vendorName: vendor.name,
          vendorCode: vendor.code,
          current,
          days30,
          days60,
          days90,
          over90,
          total,
        };
      })
    );

    return agingData.filter((item) => item.total.greaterThan(0));
  }

  /**
   * Toggle vendor active status
   */
  async toggleVendorStatus(id: string, companyId: string): Promise<Vendor> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    return this.prisma.vendor.update({
      where: { id },
      data: {
        isActive: !vendor.isActive,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete vendor (soft delete)
   */
  async deleteVendor(id: string, companyId: string): Promise<void> {
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            bills: true,
            payments: true,
          },
        },
      },
    });

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Check if vendor has any bills or payments
    if (vendor._count.bills > 0 || vendor._count.payments > 0) {
      throw new Error("Cannot delete vendor with existing bills or payments");
    }

    await this.prisma.vendor.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get vendor statistics
   */
  async getVendorStats(companyId: string): Promise<{
    totalVendors: number;
    activeVendors: number;
    inactiveVendors: number;
    totalOutstanding: Decimal;
    totalCreditLimit: Decimal;
  }> {
    const [
      totalVendors,
      activeVendors,
      inactiveVendors,
      outstanding,
      creditLimits,
    ] = await Promise.all([
      this.prisma.vendor.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.vendor.count({
        where: { companyId, isActive: true, isDeleted: false },
      }),
      this.prisma.vendor.count({
        where: { companyId, isActive: false, isDeleted: false },
      }),
      this.prisma.bill.aggregate({
        where: {
          companyId,
          status: { not: "VOIDED" },
          isDeleted: false,
        },
        _sum: {
          total: true,
        },
      }),
      this.prisma.vendor.aggregate({
        where: { companyId, isActive: true, isDeleted: false },
        _sum: {
          creditLimit: true,
        },
      }),
    ]);

    return {
      totalVendors,
      activeVendors,
      inactiveVendors,
      totalOutstanding: outstanding._sum.total || new Decimal(0),
      totalCreditLimit: creditLimits._sum.creditLimit || new Decimal(0),
    };
  }

  /**
   * Get total count of vendors
   */
  async getCount(companyId: string): Promise<number> {
    return this.prisma.vendor.count({
      where: {
        companyId,
        isDeleted: false,
      },
    });
  }

  /**
   * Get next available vendor code
   */
  async getNextVendorCode(companyId: string): Promise<string> {
    // Get the last vendor code for this company
    const lastVendor = await this.prisma.vendor.findFirst({
      where: {
        companyId,
        isDeleted: false,
      },
      orderBy: {
        code: 'desc',
      },
      select: {
        code: true,
      },
    });

    if (!lastVendor) {
      // If no vendors exist, start with V001
      return 'V001';
    }

    // Extract the numeric part and increment
    const match = lastVendor.code.match(/^V(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `V${nextNumber.toString().padStart(3, '0')}`;
    }

    // If the code format is unexpected, generate a new one
    const totalVendors = await this.getCount(companyId);
    return `V${(totalVendors + 1).toString().padStart(3, '0')}`;
  }
}

import { PrismaClient, Bill, BillItem } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateBillInput {
  number: string;
  vendorId: string;
  date: Date;
  dueDate?: Date;
  status: "DRAFT" | "RECEIVED" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  total: Decimal;
  notes?: string;
  terms?: string;
  companyId: string;
  createdBy: string;
}

export interface CreateBillItemInput {
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  taxRate: Decimal;
  discountRate: Decimal;
  total: Decimal;
}

export interface UpdateBillInput {
  number?: string;
  vendorId?: string;
  date?: Date;
  dueDate?: Date;
  status?: "DRAFT" | "RECEIVED" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal?: Decimal;
  taxAmount?: Decimal;
  discountAmount?: Decimal;
  total?: Decimal;
  notes?: string;
  terms?: string;
}

export interface UpdateBillItemInput {
  description?: string;
  quantity?: Decimal;
  unitPrice?: Decimal;
  taxRate?: Decimal;
  discountRate?: Decimal;
  total: Decimal;
}

export interface BillWithItems extends Bill {
  items: BillItem[];
  vendor: {
    id: string;
    name: string;
    code: string;
    email?: string;
  };
}

export interface BillWithStats extends BillWithItems {
  totalOutstanding: Decimal;
  totalPaid: Decimal;
  daysOverdue: number;
}

export class BillService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new bill with items
   */
  async createBill(
    input: CreateBillInput,
    items: CreateBillItemInput[]
  ): Promise<BillWithItems> {
    // Validate bill number uniqueness
    const existingBill = await this.prisma.bill.findFirst({
      where: {
        number: input.number,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingBill) {
      throw new Error(
        `Bill number ${input.number} already exists in this company`
      );
    }

    // Validate vendor exists and belongs to company
    const vendor = await this.prisma.vendor.findFirst({
      where: {
        id: input.vendorId,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (!vendor) {
      throw new Error("Vendor not found");
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Bill must have at least one item");
    }

    // Calculate totals from items
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum.plus(item.total),
      new Decimal(0)
    );

    if (!calculatedSubtotal.equals(input.subtotal)) {
      throw new Error("Subtotal does not match sum of line items");
    }

    // Create bill and items in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const bill = await tx.bill.create({
        data: {
          number: input.number,
          vendorId: input.vendorId,
          date: input.date,
          dueDate: input.dueDate,
          status: input.status,
          subtotal: input.subtotal,
          taxAmount: input.taxAmount,
          discountAmount: input.discountAmount,
          total: input.total,
          notes: input.notes,
          terms: input.terms,
          companyId: input.companyId,
          createdBy: input.createdBy,
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
            },
          },
        },
      });

      const billItems = await Promise.all(
        items.map((item) =>
          tx.billItem.create({
            data: {
              billId: bill.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              taxRate: item.taxRate,
              discountRate: item.discountRate,
              total: item.total,
            },
          })
        )
      );

      return {
        ...bill,
        items: billItems,
      };
    });

    return result;
  }

  /**
   * Update an existing bill
   */
  async updateBill(
    id: string,
    input: UpdateBillInput,
    companyId: string
  ): Promise<BillWithItems> {
    // Check if bill exists and belongs to company
    const existingBill = await this.prisma.bill.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingBill) {
      throw new Error("Bill not found");
    }

    // Only allow updates for DRAFT bills
    if (existingBill.status !== "DRAFT") {
      throw new Error("Only DRAFT bills can be updated");
    }

    // Validate bill number uniqueness if changing
    if (input.number && input.number !== existingBill.number) {
      const duplicateBill = await this.prisma.bill.findFirst({
        where: {
          number: input.number,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateBill) {
        throw new Error(
          `Bill number ${input.number} already exists in this company`
        );
      }
    }

    // Validate vendor if changing
    if (input.vendorId && input.vendorId !== existingBill.vendorId) {
      const vendor = await this.prisma.vendor.findFirst({
        where: {
          id: input.vendorId,
          companyId,
          isDeleted: false,
        },
      });

      if (!vendor) {
        throw new Error("Vendor not found");
      }
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: input,
      include: {
        items: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    return updatedBill;
  }

  /**
   * Get bill by ID with items and vendor info
   */
  async getBillById(
    id: string,
    companyId: string
  ): Promise<BillWithStats | null> {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        items: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    if (!bill) {
      return null;
    }

    // Calculate financial statistics
    const [totalOutstanding, totalPaid] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          billId: id,
          companyId,
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalPaidAmount = totalPaid._sum.amount || new Decimal(0);
    const totalOutstandingAmount = bill.total.minus(totalPaidAmount);

    // Calculate days overdue
    const now = new Date();
    const dueDate = bill.dueDate || bill.date;
    const daysOverdue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      ...bill,
      totalOutstanding: totalOutstandingAmount,
      totalPaid: totalPaidAmount,
      daysOverdue,
    };
  }

  /**
   * Get all bills for a company with filtering and pagination
   */
  async getBills(
    companyId: string,
    options: {
      search?: string;
      status?: string;
      vendorId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ bills: BillWithStats[]; total: number }> {
    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (options.search) {
      where.OR = [
        { number: { contains: options.search, mode: "insensitive" } },
        { vendor: { name: { contains: options.search, mode: "insensitive" } } },
        { vendor: { code: { contains: options.search, mode: "insensitive" } } },
      ];
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.vendorId) {
      where.vendorId = options.vendorId;
    }

    if (options.dateFrom || options.dateTo) {
      where.date = {};
      if (options.dateFrom) where.date.gte = options.dateFrom;
      if (options.dateTo) where.date.lte = options.dateTo;
    }

    const [bills, total] = await Promise.all([
      this.prisma.bill.findMany({
        where,
        include: {
          items: true,
          vendor: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { number: "desc" }],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.bill.count({ where }),
    ]);

    // Calculate financial statistics for each bill
    const billsWithStats = await Promise.all(
      bills.map(async (bill) => {
        const [totalPaid] = await Promise.all([
          this.prisma.payment.aggregate({
            where: {
              billId: bill.id,
              companyId,
              isDeleted: false,
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        const totalPaidAmount = totalPaid._sum.amount || new Decimal(0);
        const totalOutstandingAmount = bill.total.minus(totalPaidAmount);

        const now = new Date();
        const dueDate = bill.dueDate || bill.date;
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        return {
          ...bill,
          totalOutstanding: totalOutstandingAmount,
          totalPaid: totalPaidAmount,
          daysOverdue,
        };
      })
    );

    return {
      bills: billsWithStats,
      total,
    };
  }

  /**
   * Update bill status
   */
  async updateBillStatus(
    id: string,
    status: "RECEIVED" | "PAID" | "OVERDUE" | "VOIDED",
    companyId: string
  ): Promise<BillWithItems> {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    // Validate status transitions
    if (status === "VOIDED" && bill.status === "PAID") {
      throw new Error("Cannot void a paid bill");
    }

    if (status === "PAID" && bill.status === "VOIDED") {
      throw new Error("Cannot mark a voided bill as paid");
    }

    const updatedBill = await this.prisma.bill.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        vendor: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    return updatedBill;
  }

  /**
   * Delete bill (soft delete)
   */
  async deleteBill(id: string, companyId: string): Promise<void> {
    const bill = await this.prisma.bill.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            payments: true,
          },
        },
      },
    });

    if (!bill) {
      throw new Error("Bill not found");
    }

    // Prevent deletion if bill has payments
    if (bill._count.payments > 0) {
      throw new Error("Cannot delete bill with existing payments");
    }

    await this.prisma.bill.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Get bill statistics for dashboard
   */
  async getBillStats(companyId: string): Promise<{
    totalBills: number;
    totalAmount: Decimal;
    paidAmount: Decimal;
    outstandingAmount: Decimal;
    overdueAmount: Decimal;
    overdueCount: number;
  }> {
    const [totalBills, totalAmount, paidAmount, overdueBills] =
      await Promise.all([
        this.prisma.bill.count({
          where: {
            companyId,
            isDeleted: false,
            status: { not: "VOIDED" },
          },
        }),
        this.prisma.bill.aggregate({
          where: {
            companyId,
            isDeleted: false,
            status: { not: "VOIDED" },
          },
          _sum: {
            total: true,
          },
        }),
        this.prisma.payment.aggregate({
          where: {
            companyId,
            isDeleted: false,
            bill: {
              status: { not: "VOIDED" },
              isDeleted: false,
            },
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.bill.findMany({
          where: {
            companyId,
            isDeleted: false,
            status: { not: "VOIDED" },
            dueDate: { lt: new Date() },
          },
          select: {
            total: true,
            dueDate: true,
          },
        }),
      ]);

    const totalAmountValue = totalAmount._sum.total || new Decimal(0);
    const paidAmountValue = paidAmount._sum.amount || new Decimal(0);
    const outstandingAmountValue = totalAmountValue.minus(paidAmountValue);

    // Calculate overdue amounts
    let overdueAmount = new Decimal(0);
    let overdueCount = 0;

    for (const bill of overdueBills) {
      const payments = await this.prisma.payment.aggregate({
        where: {
          billId: bill.id,
          companyId,
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      });

      const paidAmount = payments._sum.amount || new Decimal(0);
      const outstanding = bill.total.minus(paidAmount);

      if (outstanding.greaterThan(0)) {
        overdueAmount = overdueAmount.plus(outstanding);
        overdueCount++;
      }
    }

    return {
      totalBills,
      totalAmount: totalAmountValue,
      paidAmount: paidAmountValue,
      outstandingAmount: outstandingAmountValue,
      overdueAmount,
      overdueCount,
    };
  }

  /**
   * Generate next bill number
   */
  async generateBillNumber(companyId: string): Promise<string> {
    const lastBill = await this.prisma.bill.findFirst({
      where: { companyId, isDeleted: false },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    if (!lastBill) return "BILL-001";

    const match = lastBill.number.match(/^BILL-(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `BILL-${nextNumber.toString().padStart(3, "0")}`;
    }

    return `BILL-${Date.now()}`;
  }

  /**
   * Get total count of bills
   */
  async getCount(companyId: string): Promise<number> {
    return this.prisma.bill.count({
      where: {
        companyId,
        isDeleted: false,
      },
    });
  }

  /**
   * Get recent bills
   */
  async getRecent(limit: number, companyId: string): Promise<any[]> {
    return this.prisma.bill.findMany({
      where: {
        companyId,
        isDeleted: false,
      },
      take: limit,
      orderBy: {
        createdAt: "desc",
      },
      select: {
        id: true,
        number: true,
        vendorName: true,
        total: true,
        status: true,
        createdAt: true,
      },
    });
  }
}

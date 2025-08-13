import { PrismaClient, Invoice, InvoiceItem } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateInvoiceInput {
  number: string;
  customerId: string;
  date: Date;
  dueDate?: Date;
  type: "SALE" | "CREDIT_MEMO";
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal: Decimal;
  taxAmount: Decimal;
  discountAmount: Decimal;
  total: Decimal;
  notes?: string;
  terms?: string;
  companyId: string;
  createdBy: string;
}

export interface CreateInvoiceItemInput {
  description: string;
  quantity: Decimal;
  unitPrice: Decimal;
  taxRate: Decimal;
  discountRate: Decimal;
  total: Decimal;
}

export interface UpdateInvoiceInput {
  number?: string;
  customerId?: string;
  date?: Date;
  dueDate?: Date;
  type?: "SALE" | "CREDIT_MEMO";
  status?: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal?: Decimal;
  taxAmount?: Decimal;
  discountAmount?: Decimal;
  total?: Decimal;
  notes?: string;
  terms?: string;
}

export interface UpdateInvoiceItemInput {
  description?: string;
  quantity?: Decimal;
  unitPrice?: Decimal;
  taxRate?: Decimal;
  discountRate?: Decimal;
  total?: Decimal;
}

export interface InvoiceWithItems extends Invoice {
  items: InvoiceItem[];
  customer: {
    id: string;
    name: string;
    code: string;
    email?: string;
  };
}

export interface InvoiceWithStats extends InvoiceWithItems {
  totalOutstanding: Decimal;
  totalPaid: Decimal;
  daysOverdue: number;
}

export class InvoiceService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new invoice with items
   */
  async createInvoice(
    input: CreateInvoiceInput,
    items: CreateInvoiceItemInput[]
  ): Promise<InvoiceWithItems> {
    // Validate invoice number uniqueness
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        number: input.number,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingInvoice) {
      throw new Error(
        `Invoice number ${input.number} already exists in this company`
      );
    }

    // Validate customer exists and belongs to company
    const customer = await this.prisma.customer.findFirst({
      where: {
        id: input.customerId,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Validate items
    if (!items || items.length === 0) {
      throw new Error("Invoice must have at least one item");
    }

    // Calculate totals from items
    const calculatedSubtotal = items.reduce(
      (sum, item) => sum.plus(item.total),
      new Decimal(0)
    );

    if (!calculatedSubtotal.equals(input.subtotal)) {
      throw new Error("Subtotal does not match sum of line items");
    }

    // Create invoice and items in a transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.create({
        data: {
          number: input.number,
          customerId: input.customerId,
          date: input.date,
          dueDate: input.dueDate,
          type: input.type,
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
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
              email: true,
            },
          },
        },
      });

      const invoiceItems = await Promise.all(
        items.map((item) =>
          tx.invoiceItem.create({
            data: {
              invoiceId: invoice.id,
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
        ...invoice,
        items: invoiceItems,
      };
    });

    return result;
  }

  /**
   * Update an existing invoice
   */
  async updateInvoice(
    id: string,
    input: UpdateInvoiceInput,
    companyId: string
  ): Promise<InvoiceWithItems> {
    // Check if invoice exists and belongs to company
    const existingInvoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingInvoice) {
      throw new Error("Invoice not found");
    }

    // Only allow updates for DRAFT invoices
    if (existingInvoice.status !== "DRAFT") {
      throw new Error("Only DRAFT invoices can be updated");
    }

    // Validate invoice number uniqueness if changing
    if (input.number && input.number !== existingInvoice.number) {
      const duplicateInvoice = await this.prisma.invoice.findFirst({
        where: {
          number: input.number,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (duplicateInvoice) {
        throw new Error(
          `Invoice number ${input.number} already exists in this company`
        );
      }
    }

    // Validate customer if changing
    if (input.customerId && input.customerId !== existingInvoice.customerId) {
      const customer = await this.prisma.customer.findFirst({
        where: {
          id: input.customerId,
          companyId,
          isDeleted: false,
        },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: input,
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    return updatedInvoice;
  }

  /**
   * Get invoice by ID with items and customer info
   */
  async getInvoiceById(
    id: string,
    companyId: string
  ): Promise<InvoiceWithStats | null> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    if (!invoice) {
      return null;
    }

    // Calculate financial statistics
    const [totalOutstanding, totalPaid] = await Promise.all([
      this.prisma.payment.aggregate({
        where: {
          invoiceId: id,
          companyId,
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      }),
    ]);

    const totalPaidAmount = totalPaid._sum.amount || new Decimal(0);
    const totalOutstandingAmount = invoice.total.minus(totalPaidAmount);

    // Calculate days overdue
    const now = new Date();
    const dueDate = invoice.dueDate || invoice.date;
    const daysOverdue = Math.max(
      0,
      Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
    );

    return {
      ...invoice,
      totalOutstanding: totalOutstandingAmount,
      totalPaid: totalPaidAmount,
      daysOverdue,
    };
  }

  /**
   * Get all invoices for a company with filtering and pagination
   */
  async getInvoices(
    companyId: string,
    options: {
      search?: string;
      status?: string;
      customerId?: string;
      dateFrom?: Date;
      dateTo?: Date;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ invoices: InvoiceWithStats[]; total: number }> {
    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (options.search) {
      where.OR = [
        { number: { contains: options.search, mode: "insensitive" } },
        {
          customer: { name: { contains: options.search, mode: "insensitive" } },
        },
        {
          customer: { code: { contains: options.search, mode: "insensitive" } },
        },
      ];
    }

    if (options.status) {
      where.status = options.status;
    }

    if (options.customerId) {
      where.customerId = options.customerId;
    }

    if (options.dateFrom || options.dateTo) {
      where.date = {};
      if (options.dateFrom) where.date.gte = options.dateFrom;
      if (options.dateTo) where.date.lte = options.dateTo;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        include: {
          items: true,
          customer: {
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
      this.prisma.invoice.count({ where }),
    ]);

    // Calculate financial statistics for each invoice
    const invoicesWithStats = await Promise.all(
      invoices.map(async (invoice) => {
        const [totalPaid] = await Promise.all([
          this.prisma.payment.aggregate({
            where: {
              invoiceId: invoice.id,
              companyId,
              isDeleted: false,
            },
            _sum: {
              amount: true,
            },
          }),
        ]);

        const totalPaidAmount = totalPaid._sum.amount || new Decimal(0);
        const totalOutstandingAmount = invoice.total.minus(totalPaidAmount);

        const now = new Date();
        const dueDate = invoice.dueDate || invoice.date;
        const daysOverdue = Math.max(
          0,
          Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          )
        );

        return {
          ...invoice,
          totalOutstanding: totalOutstandingAmount,
          totalPaid: totalPaidAmount,
          daysOverdue,
        };
      })
    );

    return {
      invoices: invoicesWithStats,
      total,
    };
  }

  /**
   * Update invoice status
   */
  async updateInvoiceStatus(
    id: string,
    status: "SENT" | "PAID" | "OVERDUE" | "VOIDED",
    companyId: string
  ): Promise<InvoiceWithItems> {
    const invoice = await this.prisma.invoice.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Validate status transitions
    if (status === "VOIDED" && invoice.status === "PAID") {
      throw new Error("Cannot void a paid invoice");
    }

    if (status === "PAID" && invoice.status === "VOIDED") {
      throw new Error("Cannot mark a voided invoice as paid");
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: { status },
      include: {
        items: true,
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
            email: true,
          },
        },
      },
    });

    return updatedInvoice;
  }

  /**
   * Delete invoice (soft delete)
   */
  async deleteInvoice(id: string, companyId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findFirst({
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

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    // Prevent deletion if invoice has payments
    if (invoice._count.payments > 0) {
      throw new Error("Cannot delete invoice with existing payments");
    }

    await this.prisma.invoice.update({
      where: { id },
      data: { isDeleted: true },
    });
  }

  /**
   * Get invoice statistics for dashboard
   */
  async getInvoiceStats(companyId: string): Promise<{
    totalInvoices: number;
    totalAmount: Decimal;
    paidAmount: Decimal;
    outstandingAmount: Decimal;
    overdueAmount: Decimal;
    overdueCount: number;
  }> {
    const [totalInvoices, totalAmount, paidAmount, overdueInvoices] =
      await Promise.all([
        this.prisma.invoice.count({
          where: {
            companyId,
            isDeleted: false,
            status: { not: "VOIDED" },
          },
        }),
        this.prisma.invoice.aggregate({
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
            invoice: {
              status: { not: "VOIDED" },
              isDeleted: false,
            },
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.invoice.findMany({
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

    for (const invoice of overdueInvoices) {
      const payments = await this.prisma.payment.aggregate({
        where: {
          invoiceId: invoice.id,
          companyId,
          isDeleted: false,
        },
        _sum: {
          amount: true,
        },
      });

      const paidAmount = payments._sum.amount || new Decimal(0);
      const outstanding = invoice.total.minus(paidAmount);

      if (outstanding.greaterThan(0)) {
        overdueAmount = overdueAmount.plus(outstanding);
        overdueCount++;
      }
    }

    return {
      totalInvoices,
      totalAmount: totalAmountValue,
      paidAmount: paidAmountValue,
      outstandingAmount: outstandingAmountValue,
      overdueAmount,
      overdueCount,
    };
  }

  /**
   * Generate next invoice number
   */
  async generateInvoiceNumber(companyId: string): Promise<string> {
    const lastInvoice = await this.prisma.invoice.findFirst({
      where: { companyId, isDeleted: false },
      orderBy: { number: "desc" },
      select: { number: true },
    });

    if (!lastInvoice) return "INV-001";

    const match = lastInvoice.number.match(/^INV-(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `INV-${nextNumber.toString().padStart(3, "0")}`;
    }

    return `INV-${Date.now()}`;
  }
}

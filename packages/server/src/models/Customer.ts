import { PrismaClient, Customer } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateCustomerInput {
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

export interface UpdateCustomerInput {
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

export interface CustomerWithStats extends Customer {
  _count: {
    invoices: number;
    payments: number;
  };
  totalOutstanding: Decimal;
  totalPaid: Decimal;
  lastPaymentDate?: Date;
  lastInvoiceDate?: Date;
}

export interface CustomerSearchOptions {
  search?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export class CustomerService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new customer
   */
  async createCustomer(input: CreateCustomerInput): Promise<Customer> {
    // Validate customer code uniqueness within company
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingCustomer) {
      throw new Error(
        `Customer code ${input.code} already exists in this company`
      );
    }

    // Validate email uniqueness if provided
    if (input.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: {
          email: input.email,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingEmail) {
        throw new Error(
          `Customer with email ${input.email} already exists in this company`
        );
      }
    }

    return this.prisma.customer.create({
      data: {
        ...input,
        creditLimit: input.creditLimit || new Decimal(0),
        isActive: true,
      },
    });
  }

  /**
   * Update an existing customer
   */
  async updateCustomer(
    id: string,
    input: UpdateCustomerInput,
    companyId: string
  ): Promise<Customer> {
    // Check if customer exists and belongs to company
    const existingCustomer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingCustomer) {
      throw new Error("Customer not found");
    }

    // Validate code uniqueness if being updated
    if (input.code && input.code !== existingCustomer.code) {
      const existingCode = await this.prisma.customer.findFirst({
        where: {
          code: input.code,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingCode) {
        throw new Error(
          `Customer code ${input.code} already exists in this company`
        );
      }
    }

    // Validate email uniqueness if being updated
    if (input.email && input.email !== existingCustomer.email) {
      const existingEmail = await this.prisma.customer.findFirst({
        where: {
          email: input.email,
          companyId,
          isDeleted: false,
          id: { not: id },
        },
      });

      if (existingEmail) {
        throw new Error(
          `Customer with email ${input.email} already exists in this company`
        );
      }
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        ...input,
      },
    });
  }

  /**
   * Get customer by ID
   */
  async getCustomerById(
    id: string,
    companyId: string
  ): Promise<CustomerWithStats | null> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true,
          },
        },
      },
    });

    if (!customer) return null;

    // Calculate financial statistics
    const [totalOutstanding, totalPaid, lastPayment, lastInvoice] =
      await Promise.all([
        this.prisma.invoice.aggregate({
          where: {
            customerId: id,
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
            customerId: id,
            companyId,
            isDeleted: false,
          },
          _sum: {
            amount: true,
          },
        }),
        this.prisma.payment.findFirst({
          where: {
            customerId: id,
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
        this.prisma.invoice.findFirst({
          where: {
            customerId: id,
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
      ...customer,
      totalOutstanding: totalOutstanding._sum.total || new Decimal(0),
      totalPaid: totalPaid._sum.amount || new Decimal(0),
      lastPaymentDate: lastPayment?.date,
      lastInvoiceDate: lastInvoice?.date,
    };
  }

  /**
   * Get all customers for a company
   */
  async getCustomers(
    companyId: string,
    options: CustomerSearchOptions = {}
  ): Promise<{ customers: CustomerWithStats[]; total: number }> {
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

    const [customers, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        include: {
          _count: {
            select: {
              invoices: true,
              payments: true,
            },
          },
        },
        orderBy: [{ name: "asc" }, { createdAt: "desc" }],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.customer.count({ where }),
    ]);

    // Calculate financial statistics for each customer
    const customersWithStats = await Promise.all(
      customers.map(async (customer) => {
        const [totalOutstanding, totalPaid, lastPayment, lastInvoice] =
          await Promise.all([
            this.prisma.invoice.aggregate({
              where: {
                customerId: customer.id,
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
                customerId: customer.id,
                companyId,
                isDeleted: false,
              },
              _sum: {
                amount: true,
              },
            }),
            this.prisma.payment.findFirst({
              where: {
                customerId: customer.id,
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
            this.prisma.invoice.findFirst({
              where: {
                customerId: customer.id,
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
          ...customer,
          totalOutstanding: totalOutstanding._sum.total || new Decimal(0),
          totalPaid: totalPaid._sum.amount || new Decimal(0),
          lastPaymentDate: lastPayment?.date,
          lastInvoiceDate: lastInvoice?.date,
        };
      })
    );

    return { customers: customersWithStats, total };
  }

  /**
   * Get customer aging report
   */
  async getCustomerAging(companyId: string): Promise<
    {
      customerId: string;
      customerName: string;
      customerCode: string;
      current: Decimal;
      days30: Decimal;
      days60: Decimal;
      days90: Decimal;
      over90: Decimal;
      total: Decimal;
    }[]
  > {
    const customers = await this.prisma.customer.findMany({
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
      customers.map(async (customer) => {
        const invoices = await this.prisma.invoice.findMany({
          where: {
            customerId: customer.id,
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

        invoices.forEach((invoice) => {
          const dueDate = invoice.dueDate || invoice.date;
          const daysOverdue = Math.floor(
            (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysOverdue <= 0) {
            current = current.plus(invoice.total);
          } else if (daysOverdue <= 30) {
            days30 = days30.plus(invoice.total);
          } else if (daysOverdue <= 60) {
            days60 = days60.plus(invoice.total);
          } else if (daysOverdue <= 90) {
            days90 = days90.plus(invoice.total);
          } else {
            over90 = over90.plus(invoice.total);
          }
        });

        const total = current
          .plus(days30)
          .plus(days60)
          .plus(days90)
          .plus(over90);

        return {
          customerId: customer.id,
          customerName: customer.name,
          customerCode: customer.code,
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
   * Toggle customer active status
   */
  async toggleCustomerStatus(id: string, companyId: string): Promise<Customer> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        isActive: !customer.isActive,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Delete customer (soft delete)
   */
  async deleteCustomer(id: string, companyId: string): Promise<void> {
    const customer = await this.prisma.customer.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            invoices: true,
            payments: true,
          },
        },
      },
    });

    if (!customer) {
      throw new Error("Customer not found");
    }

    // Check if customer has any invoices or payments
    if (customer._count.invoices > 0 || customer._count.payments > 0) {
      throw new Error(
        "Cannot delete customer with existing invoices or payments"
      );
    }

    await this.prisma.customer.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Get customer statistics
   */
  async getCustomerStats(companyId: string): Promise<{
    totalCustomers: number;
    activeCustomers: number;
    inactiveCustomers: number;
    totalOutstanding: Decimal;
    totalCreditLimit: Decimal;
  }> {
    const [
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      outstanding,
      creditLimits,
    ] = await Promise.all([
      this.prisma.customer.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.customer.count({
        where: { companyId, isActive: true, isDeleted: false },
      }),
      this.prisma.customer.count({
        where: { companyId, isActive: false, isDeleted: false },
      }),
      this.prisma.invoice.aggregate({
        where: {
          companyId,
          status: { not: "VOIDED" },
          isDeleted: false,
        },
        _sum: {
          total: true,
        },
      }),
      this.prisma.customer.aggregate({
        where: { companyId, isActive: true, isDeleted: false },
        _sum: {
          creditLimit: true,
        },
      }),
    ]);

    return {
      totalCustomers,
      activeCustomers,
      inactiveCustomers,
      totalOutstanding: outstanding._sum.total || new Decimal(0),
      totalCreditLimit: creditLimits._sum.creditLimit || new Decimal(0),
    };
  }

  /**
   * Get total count of customers
   */
  async getCount(companyId: string): Promise<number> {
    return this.prisma.customer.count({
      where: {
        companyId,
        isDeleted: false,
      },
    });
  }
}

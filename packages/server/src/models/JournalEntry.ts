import {
  PrismaClient,
  JournalEntry,
  JournalEntryLine,
  JournalEntryStatus,
} from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateJournalEntryInput {
  reference: string;
  description: string;
  date: Date;
  companyId: string;
  createdBy: string;
  updatedBy: string;
  lines: CreateJournalEntryLineInput[];
}

export interface CreateJournalEntryLineInput {
  accountId: string;
  debit: Decimal;
  credit: Decimal;
  description?: string;
  reference?: string;
}

export interface UpdateJournalEntryInput {
  reference?: string;
  description?: string;
  date?: Date;
  status?: JournalEntryStatus;
  updatedBy: string;
  lines?: UpdateJournalEntryLineInput[];
}

export interface UpdateJournalEntryLineInput {
  id?: string;
  accountId: string;
  debit: Decimal;
  credit: Decimal;
  description?: string;
  reference?: string;
}

export interface JournalEntryWithLines extends JournalEntry {
  lines: JournalEntryLine[];
  user: {
    displayName: string;
    username: string;
  };
}

export interface JournalEntryLineWithAccount extends JournalEntryLine {
  account: {
    code: string;
    name: string;
    type: string;
  };
}

export class JournalEntryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new journal entry with lines
   */
  async createJournalEntry(
    input: CreateJournalEntryInput
  ): Promise<JournalEntryWithLines> {
    // Validate that debits equal credits
    const totalDebits = input.lines.reduce(
      (sum, line) => sum.plus(line.debit),
      new Decimal(0)
    );
    const totalCredits = input.lines.reduce(
      (sum, line) => sum.plus(line.credit),
      new Decimal(0)
    );

    if (!totalDebits.equals(totalCredits)) {
      throw new Error("Total debits must equal total credits");
    }

    // Validate that at least two lines exist
    if (input.lines.length < 2) {
      throw new Error("Journal entry must have at least two lines");
    }

    // Validate that each line has either debit or credit, not both
    for (const line of input.lines) {
      if (line.debit.greaterThan(0) && line.credit.greaterThan(0)) {
        throw new Error("Each line must have either debit or credit, not both");
      }
      if (line.debit.equals(0) && line.credit.equals(0)) {
        throw new Error("Each line must have either debit or credit amount");
      }
    }

    // Validate that accounts exist and belong to the company
    for (const line of input.lines) {
      const account = await this.prisma.chartOfAccount.findFirst({
        where: {
          id: line.accountId,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (!account) {
        throw new Error(
          `Account ${line.accountId} not found or does not belong to this company`
        );
      }
    }

    // Create journal entry and lines in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Generate a unique number for the journal entry
      const number = await this.generateJournalEntryNumber(input.companyId, tx);

      // Create the journal entry
      const journalEntry = await tx.journalEntry.create({
        data: {
          number,
          reference: input.reference,
          description: input.description,
          date: input.date,
          companyId: input.companyId,
          status: "DRAFT",
          createdBy: input.createdBy,
        },
      });

      // Create the journal entry lines
      const lines = await Promise.all(
        input.lines.map((line) =>
          tx.journalEntryLine.create({
            data: {
              journalEntryId: journalEntry.id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
              reference: line.reference,
            },
          })
        )
      );

      // Update account balances
      await this.updateAccountBalances(input.lines, input.companyId, tx);

      // Return the complete journal entry with lines
      return {
        ...journalEntry,
        lines,
        user: {
          displayName: "", // Will be populated by the route
          username: "",
        },
      };
    });
  }

  /**
   * Update an existing journal entry
   */
  async updateJournalEntry(
    id: string,
    input: UpdateJournalEntryInput,
    companyId: string
  ): Promise<JournalEntryWithLines> {
    // Check if journal entry exists and belongs to company
    const existingEntry = await this.prisma.journalEntry.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        lines: true,
      },
    });

    if (!existingEntry) {
      throw new Error("Journal entry not found");
    }

    // Only allow updates if entry is in DRAFT status
    if (existingEntry.status !== "DRAFT") {
      throw new Error(
        "Cannot update journal entry that is not in DRAFT status"
      );
    }

    // If lines are being updated, validate the new lines
    if (input.lines) {
      // Validate that debits equal credits
      const totalDebits = input.lines.reduce(
        (sum, line) => sum.plus(line.debit),
        new Decimal(0)
      );
      const totalCredits = input.lines.reduce(
        (sum, line) => sum.plus(line.credit),
        new Decimal(0)
      );

      if (!totalDebits.equals(totalCredits)) {
        throw new Error("Total debits must equal total credits");
      }

      // Validate that at least two lines exist
      if (input.lines.length < 2) {
        throw new Error("Journal entry must have at least two lines");
      }

      // Validate that each line has either debit or credit, not both
      for (const line of input.lines) {
        if (line.debit.greaterThan(0) && line.credit.greaterThan(0)) {
          throw new Error(
            "Each line must have either debit or credit, not both"
          );
        }
        if (line.debit.equals(0) && line.credit.equals(0)) {
          throw new Error("Each line must have either debit or credit amount");
        }
      }

      // Validate that accounts exist and belong to the company
      for (const line of input.lines) {
        const account = await this.prisma.chartOfAccount.findFirst({
          where: {
            id: line.accountId,
            companyId,
            isDeleted: false,
          },
        });

        if (!account) {
          throw new Error(
            `Account ${line.accountId} not found or does not belong to this company`
          );
        }
      }
    }

    // Update in a transaction
    return this.prisma.$transaction(async (tx) => {
      // Reverse the old account balances
      await this.reverseAccountBalances(existingEntry.lines, companyId, tx);

      // Update the journal entry
      const updatedEntry = await tx.journalEntry.update({
        where: { id },
        data: {
          reference: input.reference,
          description: input.description,
          date: input.date,
          status: input.status,
        },
      });

      // Delete old lines and create new ones
      await tx.journalEntryLine.deleteMany({
        where: { journalEntryId: id },
      });

      const lines = await Promise.all(
        input.lines!.map((line) =>
          tx.journalEntryLine.create({
            data: {
              journalEntryId: id,
              accountId: line.accountId,
              debit: line.debit,
              credit: line.credit,
              description: line.description,
              reference: line.reference,
            },
          })
        )
      );

      // Update account balances with new lines
      await this.updateAccountBalances(input.lines!, companyId, tx);

      // Return the updated journal entry with lines
      return {
        ...updatedEntry,
        lines,
        user: {
          displayName: "", // Will be populated by the route
          username: "",
        },
      };
    });
  }

  /**
   * Get journal entry by ID
   */
  async getJournalEntryById(
    id: string,
    companyId: string
  ): Promise<JournalEntryWithLines | null> {
    return this.prisma.journalEntry.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Get all journal entries for a company
   */
  async getJournalEntries(
    companyId: string,
    options: {
      status?: JournalEntryStatus;
      startDate?: Date;
      endDate?: Date;
      reference?: string;
      accountId?: string;
      limit?: number;
      offset?: number;
    } = {}
  ): Promise<{ entries: JournalEntryWithLines[]; total: number }> {
    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (options.status) {
      where.status = options.status;
    }

    if (options.startDate || options.endDate) {
      where.date = {};
      if (options.startDate) where.date.gte = options.startDate;
      if (options.endDate) where.date.lte = options.endDate;
    }

    if (options.reference) {
      where.reference = { contains: options.reference, mode: "insensitive" };
    }

    if (options.accountId) {
      where.lines = {
        some: {
          accountId: options.accountId,
        },
      };
    }

    const [entries, total] = await Promise.all([
      this.prisma.journalEntry.findMany({
        where,
        include: {
          lines: {
            include: {
              account: {
                select: {
                  code: true,
                  name: true,
                  type: true,
                },
              },
            },
          },
          user: {
            select: {
              displayName: true,
              username: true,
            },
          },
        },
        orderBy: [{ date: "desc" }, { createdAt: "desc" }],
        take: options.limit || 50,
        skip: options.offset || 0,
      }),
      this.prisma.journalEntry.count({ where }),
    ]);

    return { entries, total };
  }

  /**
   * Post a journal entry (change status from DRAFT to POSTED)
   */
  async postJournalEntry(
    id: string,
    companyId: string,
    postedBy: string
  ): Promise<JournalEntryWithLines> {
    const entry = await this.getJournalEntryById(id, companyId);
    if (!entry) {
      throw new Error("Journal entry not found");
    }

    if (entry.status !== "DRAFT") {
      throw new Error("Only DRAFT journal entries can be posted");
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: "POSTED",
        postedAt: new Date(),
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Void a journal entry (change status to VOIDED)
   */
  async voidJournalEntry(
    id: string,
    companyId: string,
    voidedBy: string
  ): Promise<JournalEntryWithLines> {
    const entry = await this.getJournalEntryById(id, companyId);
    if (!entry) {
      throw new Error("Journal entry not found");
    }

    if (entry.status === "VOIDED") {
      throw new Error("Journal entry is already voided");
    }

    if (entry.status === "POSTED") {
      // Reverse account balances for posted entries
      await this.reverseAccountBalances(entry.lines, companyId);
    }

    return this.prisma.journalEntry.update({
      where: { id },
      data: {
        status: "VOIDED",
      },
      include: {
        lines: {
          include: {
            account: {
              select: {
                code: true,
                name: true,
                type: true,
              },
            },
          },
        },
        user: {
          select: {
            displayName: true,
            username: true,
          },
        },
      },
    });
  }

  /**
   * Delete a journal entry (soft delete)
   */
  async deleteJournalEntry(
    id: string,
    companyId: string,
    deletedBy: string
  ): Promise<void> {
    const entry = await this.getJournalEntryById(id, companyId);
    if (!entry) {
      throw new Error("Journal entry not found");
    }

    if (entry.status === "POSTED") {
      throw new Error(
        "Cannot delete posted journal entries. Please void them first."
      );
    }

    // Reverse account balances if entry was posted
    if (entry.status === "POSTED") {
      await this.reverseAccountBalances(entry.lines, companyId);
    }

    await this.prisma.journalEntry.update({
      where: { id },
      data: {
        isDeleted: true,
      },
    });
  }

  /**
   * Get journal entry statistics for a company
   */
  async getJournalEntryStats(companyId: string): Promise<{
    totalEntries: number;
    draftEntries: number;
    postedEntries: number;
    voidedEntries: number;
    totalDebits: Decimal;
    totalCredits: Decimal;
  }> {
    const [totalEntries, draftEntries, postedEntries, voidedEntries, totals] =
      await Promise.all([
        this.prisma.journalEntry.count({
          where: { companyId, isDeleted: false },
        }),
        this.prisma.journalEntry.count({
          where: { companyId, status: "DRAFT", isDeleted: false },
        }),
        this.prisma.journalEntry.count({
          where: { companyId, status: "POSTED", isDeleted: false },
        }),
        this.prisma.journalEntry.count({
          where: { companyId, status: "VOIDED", isDeleted: false },
        }),
        this.prisma.journalEntryLine.aggregate({
          where: {
            journalEntry: {
              companyId,
              status: "POSTED",
              isDeleted: false,
            },
          },
          _sum: {
            debit: true,
            credit: true,
          },
        }),
      ]);

    return {
      totalEntries,
      draftEntries,
      postedEntries,
      voidedEntries,
      totalDebits: totals._sum.debit || new Decimal(0),
      totalCredits: totals._sum.credit || new Decimal(0),
    };
  }

  /**
   * Private helper method to update account balances
   */
  private async updateAccountBalances(
    lines: CreateJournalEntryLineInput[],
    companyId: string,
    tx?: any
  ): Promise<void> {
    const prisma = tx || this.prisma;

    for (const line of lines) {
      const account = await prisma.chartOfAccount.findFirst({
        where: {
          id: line.accountId,
          companyId,
          isDeleted: false,
        },
      });

      if (account) {
        const currentBalance = account.balance;
        let newBalance: Decimal;

        if (line.debit.greaterThan(0)) {
          // Debit increases assets and expenses, decreases liabilities and equity
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance = currentBalance.plus(line.debit);
          } else {
            newBalance = currentBalance.minus(line.debit);
          }
        } else {
          // Credit decreases assets and expenses, increases liabilities and equity
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance = currentBalance.minus(line.credit);
          } else {
            newBalance = currentBalance.plus(line.credit);
          }
        }

        await prisma.chartOfAccount.update({
          where: { id: line.accountId },
          data: { balance: newBalance },
        });
      }
    }
  }

  /**
   * Private helper method to generate unique journal entry numbers
   */
  private async generateJournalEntryNumber(
    companyId: string,
    tx?: any
  ): Promise<string> {
    const prisma = tx || this.prisma;

    // Get the last journal entry number for this company
    const lastEntry = await prisma.journalEntry.findFirst({
      where: {
        companyId,
        isDeleted: false,
      },
      orderBy: {
        number: "desc",
      },
      select: {
        number: true,
      },
    });

    if (!lastEntry) {
      // First entry for this company
      return "JE-001";
    }

    // Extract the number part and increment
    const match = lastEntry.number.match(/^JE-(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `JE-${nextNumber.toString().padStart(3, "0")}`;
    }

    // Fallback if format is unexpected
    return `JE-${Date.now()}`;
  }

  /**
   * Private helper method to reverse account balances
   */
  private async reverseAccountBalances(
    lines: JournalEntryLine[],
    companyId: string,
    tx?: any
  ): Promise<void> {
    const prisma = tx || this.prisma;

    for (const line of lines) {
      const account = await prisma.chartOfAccount.findFirst({
        where: {
          id: line.accountId,
          companyId,
          isDeleted: false,
        },
      });

      if (account) {
        const currentBalance = account.balance;
        let newBalance: Decimal;

        if (line.debit.greaterThan(0)) {
          // Reverse debit: decrease assets/expenses, increase liabilities/equity
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance = currentBalance.minus(line.debit);
          } else {
            newBalance = currentBalance.plus(line.debit);
          }
        } else {
          // Reverse credit: increase assets/expenses, decrease liabilities/equity
          if (account.type === "ASSET" || account.type === "EXPENSE") {
            newBalance = currentBalance.plus(line.credit);
          } else {
            newBalance = currentBalance.minus(line.credit);
          }
        }

        await prisma.chartOfAccount.update({
          where: { id: line.accountId },
          data: { balance: newBalance },
        });
      }
    }
  }
}

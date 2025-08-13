import { Router, Request, Response } from "express";
import { JournalEntryService } from "../models/JournalEntry";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/auth";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();
const journalEntryService = new JournalEntryService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/journal-entries
 * @desc    Get all journal entries for the authenticated user's company
 * @access  Private
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const { status, startDate, endDate, reference, accountId, limit, offset } =
      req.query;

    const result = await journalEntryService.getJournalEntries(companyId, {
      status: status as any,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      reference: reference as string,
      accountId: accountId as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Journal entries retrieved successfully",
      data: result.entries,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        hasMore:
          (offset ? parseInt(offset as string) : 0) +
            (limit ? parseInt(limit as string) : 50) <
          result.total,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving journal entries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/journal-entries/stats
 * @desc    Get journal entries statistics
 * @access  Private
 */
router.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const stats = await journalEntryService.getStats(companyId);
    res.json({
      success: true,
      message: "Journal entries stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving journal entries stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/journal-entries/:id
 * @desc    Get a specific journal entry by ID
 * @access  Private
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const entry = await journalEntryService.getJournalEntryById(id, companyId);

    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Journal entry not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Journal entry retrieved successfully",
      data: entry,
    });
  } catch (error: any) {
    console.error("Error retrieving journal entry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/journal-entries
 * @desc    Create a new journal entry
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.post(
  "/",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const createdBy = req.user?.userId;

      if (!companyId || !createdBy) {
        return res.status(400).json({
          success: false,
          message: "Company ID and user ID are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      // Validate and parse the input
      const { reference, description, date, lines } = req.body;

      if (
        !reference ||
        !description ||
        !date ||
        !lines ||
        !Array.isArray(lines)
      ) {
        return res.status(400).json({
          success: false,
          message: "Reference, description, date, and lines are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      // Parse and validate lines
      const parsedLines = lines.map((line: any) => ({
        accountId: line.accountId,
        debit: new Decimal(line.debit || 0),
        credit: new Decimal(line.credit || 0),
        description: line.description,
        reference: line.reference,
      }));

      const entryData = {
        reference,
        description,
        date: new Date(date),
        companyId,
        createdBy,
        updatedBy: createdBy,
        lines: parsedLines,
      };

      const entry = await journalEntryService.createJournalEntry(entryData);

      res.status(201).json({
        success: true,
        message: "Journal entry created successfully",
        data: entry,
      });
    } catch (error: any) {
      console.error("Error creating journal entry:", error);

      if (error.message.includes("debits must equal credits")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "UNBALANCED_ENTRY",
        });
      }

      if (error.message.includes("at least two lines")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INSUFFICIENT_LINES",
        });
      }

      if (error.message.includes("debit or credit, not both")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_LINE_AMOUNTS",
        });
      }

      if (
        error.message.includes("Account") &&
        error.message.includes("not found")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_ACCOUNT",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   PUT /api/journal-entries/:id
 * @desc    Update an existing journal entry
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.put(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const updatedBy = req.user?.userId;

      if (!companyId || !updatedBy) {
        return res.status(400).json({
          success: false,
          message: "Company ID and user ID are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      // Validate and parse the input
      const { reference, description, date, lines } = req.body;

      const updateData: any = {
        updatedBy,
      };

      if (reference !== undefined) updateData.reference = reference;
      if (description !== undefined) updateData.description = description;
      if (date !== undefined) updateData.date = new Date(date);

      // Parse and validate lines if provided
      if (lines && Array.isArray(lines)) {
        const parsedLines = lines.map((line: any) => ({
          accountId: line.accountId,
          debit: new Decimal(line.debit || 0),
          credit: new Decimal(line.credit || 0),
          description: line.description,
          reference: line.reference,
        }));

        updateData.lines = parsedLines;
      }

      const entry = await journalEntryService.updateJournalEntry(
        id,
        updateData,
        companyId
      );

      res.json({
        success: true,
        message: "Journal entry updated successfully",
        data: entry,
      });
    } catch (error: any) {
      console.error("Error updating journal entry:", error);

      if (error.message.includes("Journal entry not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("not in DRAFT status")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_STATUS",
        });
      }

      if (error.message.includes("debits must equal credits")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "UNBALANCED_ENTRY",
        });
      }

      if (error.message.includes("at least two lines")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INSUFFICIENT_LINES",
        });
      }

      if (error.message.includes("debit or credit, not both")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_LINE_AMOUNTS",
        });
      }

      if (
        error.message.includes("Account") &&
        error.message.includes("not found")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_ACCOUNT",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/journal-entries/:id/post
 * @desc    Post a journal entry (change status from DRAFT to POSTED)
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.post(
  "/:id/post",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const postedBy = req.user?.userId;

      if (!companyId || !postedBy) {
        return res.status(400).json({
          success: false,
          message: "Company ID and user ID are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const entry = await journalEntryService.postJournalEntry(
        id,
        companyId,
        postedBy
      );

      res.json({
        success: true,
        message: "Journal entry posted successfully",
        data: entry,
      });
    } catch (error: any) {
      console.error("Error posting journal entry:", error);

      if (error.message.includes("Journal entry not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Only DRAFT journal entries can be posted")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_STATUS",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/journal-entries/:id/void
 * @desc    Void a journal entry (change status to VOIDED)
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.post(
  "/:id/void",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const voidedBy = req.user?.userId;

      if (!companyId || !voidedBy) {
        return res.status(400).json({
          success: false,
          message: "Company ID and user ID are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const entry = await journalEntryService.voidJournalEntry(
        id,
        companyId,
        voidedBy
      );

      res.json({
        success: true,
        message: "Journal entry voided successfully",
        data: entry,
      });
    } catch (error: any) {
      console.error("Error voiding journal entry:", error);

      if (error.message.includes("Journal entry not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("already voided")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "ALREADY_VOIDED",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   DELETE /api/journal-entries/:id
 * @desc    Delete a journal entry (soft delete)
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.delete(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const companyId = req.user?.companyId;
      const deletedBy = req.user?.userId;

      if (!companyId || !deletedBy) {
        return res.status(400).json({
          success: false,
          message: "Company ID and user ID are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      await journalEntryService.deleteJournalEntry(id, companyId, deletedBy);

      res.json({
        success: true,
        message: "Journal entry deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting journal entry:", error);

      if (error.message.includes("Journal entry not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Cannot delete posted journal entries")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_POSTED",
        });
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        code: "INTERNAL_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/journal-entries/stats
 * @desc    Get journal entry statistics for the company
 * @access  Private
 */
router.get("/stats", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const stats = await journalEntryService.getJournalEntryStats(companyId);

    res.json({
      success: true,
      message: "Journal entry statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving journal entry statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

export default router;

import { Router, Response } from "express";
import { BillService } from "../models/Bill";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();
const billService = new BillService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/bills
 * @desc    Get all bills for the company with filtering and pagination
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

    const { search, status, vendorId, dateFrom, dateTo, limit, offset } =
      req.query;

    const result = await billService.getBills(companyId, {
      search: search as string,
      status: status as string,
      vendorId: vendorId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Bills retrieved successfully",
      data: result.bills,
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
    console.error("Error retrieving bills:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bills/stats
 * @desc    Get bill statistics for the company
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

    const stats = await billService.getBillStats(companyId);

    res.json({
      success: true,
      message: "Bill statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving bill statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bills/next-number
 * @desc    Get next available bill number
 * @access  Private
 */
router.get("/next-number", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const nextNumber = await billService.generateBillNumber(companyId);

    res.json({
      success: true,
      message: "Next bill number generated successfully",
      data: { nextNumber },
    });
  } catch (error: any) {
    console.error("Error generating bill number:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/bills/:id
 * @desc    Get a specific bill by ID
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

    const bill = await billService.getBillById(id, companyId);

    if (!bill) {
      return res.status(404).json({
        success: false,
        message: "Bill not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Bill retrieved successfully",
      data: bill,
    });
  } catch (error: any) {
    console.error("Error retrieving bill:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/bills
 * @desc    Create a new bill
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

      const {
        number,
        vendorId,
        date,
        dueDate,
        status,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        notes,
        terms,
        items,
      } = req.body;

      if (!number || !vendorId || !date || !status || !items) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Bill must have at least one item",
          code: "INVALID_ITEMS",
        });
      }

      const billData = {
        number,
        vendorId,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        status,
        subtotal: new Decimal(subtotal),
        taxAmount: new Decimal(taxAmount || 0),
        discountAmount: new Decimal(discountAmount || 0),
        total: new Decimal(total),
        notes,
        terms,
        companyId,
        createdBy,
      };

      const billItems = items.map((item: any) => ({
        description: item.description,
        quantity: new Decimal(item.quantity),
        unitPrice: new Decimal(item.unitPrice),
        taxRate: new Decimal(item.taxRate || 0),
        discountRate: new Decimal(item.discountRate || 0),
        total: new Decimal(item.total),
      }));

      const bill = await billService.createBill(billData, billItems);

      res.status(201).json({
        success: true,
        message: "Bill created successfully",
        data: bill,
      });
    } catch (error: any) {
      console.error("Error creating bill:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_BILL",
        });
      }

      if (error.message.includes("Vendor not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "VENDOR_NOT_FOUND",
        });
      }

      if (error.message.includes("must have at least one item")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_ITEMS",
        });
      }

      if (error.message.includes("Subtotal does not match")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_CALCULATIONS",
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
 * @route   PUT /api/bills/:id
 * @desc    Update an existing bill
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.put(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
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

      const {
        number,
        vendorId,
        date,
        dueDate,
        status,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        notes,
        terms,
      } = req.body;

      const updateData: any = {};

      if (number !== undefined) updateData.number = number;
      if (vendorId !== undefined) updateData.vendorId = vendorId;
      if (date !== undefined) updateData.date = new Date(date);
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (status !== undefined) updateData.status = status;
      if (subtotal !== undefined) updateData.subtotal = new Decimal(subtotal);
      if (taxAmount !== undefined)
        updateData.taxAmount = new Decimal(taxAmount);
      if (discountAmount !== undefined)
        updateData.discountAmount = new Decimal(discountAmount);
      if (total !== undefined) updateData.total = new Decimal(total);
      if (notes !== undefined) updateData.notes = notes;
      if (terms !== undefined) updateData.terms = terms;

      const bill = await billService.updateBill(id, updateData, companyId);

      res.json({
        success: true,
        message: "Bill updated successfully",
        data: bill,
      });
    } catch (error: any) {
      console.error("Error updating bill:", error);

      if (error.message.includes("Bill not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Only DRAFT bills can be updated")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_STATUS",
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_BILL",
        });
      }

      if (error.message.includes("Vendor not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "VENDOR_NOT_FOUND",
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
 * @route   PATCH /api/bills/:id/status
 * @desc    Update bill status
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.patch(
  "/:id/status",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const companyId = req.user?.companyId;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!status) {
        return res.status(400).json({
          success: false,
          message: "Status is required",
          code: "MISSING_STATUS",
        });
      }

      if (!["RECEIVED", "PAID", "OVERDUE", "VOIDED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
          code: "INVALID_STATUS",
        });
      }

      const bill = await billService.updateBillStatus(id, status, companyId);

      res.json({
        success: true,
        message: `Bill status updated to ${status} successfully`,
        data: bill,
      });
    } catch (error: any) {
      console.error("Error updating bill status:", error);

      if (error.message.includes("Bill not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (
        error.message.includes("Cannot void a paid bill") ||
        error.message.includes("Cannot mark a voided bill as paid")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_STATUS_TRANSITION",
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
 * @route   DELETE /api/bills/:id
 * @desc    Delete a bill (soft delete)
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.delete(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
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

      await billService.deleteBill(id, companyId);

      res.json({
        success: true,
        message: "Bill deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting bill:", error);

      if (error.message.includes("Bill not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing payments")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_BILL",
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

export default router;

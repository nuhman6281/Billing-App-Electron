import { Router, Response } from "express";
import { InvoiceService } from "../models/Invoice";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();
const invoiceService = new InvoiceService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/invoices
 * @desc    Get all invoices for the company with filtering and pagination
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

    const { search, status, customerId, dateFrom, dateTo, limit, offset } =
      req.query;

    const result = await invoiceService.getInvoices(companyId, {
      search: search as string,
      status: status as string,
      customerId: customerId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Invoices retrieved successfully",
      data: result.invoices,
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
    console.error("Error retrieving invoices:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/invoices/stats
 * @desc    Get invoice statistics for the company
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

    const stats = await invoiceService.getInvoiceStats(companyId);

    res.json({
      success: true,
      message: "Invoice statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving invoice statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/invoices/next-number
 * @desc    Get next available invoice number
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

    const nextNumber = await invoiceService.generateInvoiceNumber(companyId);

    res.json({
      success: true,
      message: "Next invoice number generated successfully",
      data: { nextNumber },
    });
  } catch (error: any) {
    console.error("Error generating invoice number:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/invoices/:id
 * @desc    Get a specific invoice by ID
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

    const invoice = await invoiceService.getInvoiceById(id, companyId);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: "Invoice not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Invoice retrieved successfully",
      data: invoice,
    });
  } catch (error: any) {
    console.error("Error retrieving invoice:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/invoices
 * @desc    Create a new invoice
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
        customerId,
        date,
        dueDate,
        type,
        status,
        subtotal,
        taxAmount,
        discountAmount,
        total,
        notes,
        terms,
        items,
      } = req.body;

      if (!number || !customerId || !date || !type || !status || !items) {
        return res.status(400).json({
          success: false,
          message: "Required fields are missing",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: "Invoice must have at least one item",
          code: "INVALID_ITEMS",
        });
      }

      const invoiceData = {
        number,
        customerId,
        date: new Date(date),
        dueDate: dueDate ? new Date(dueDate) : undefined,
        type,
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

      const invoiceItems = items.map((item: any) => ({
        itemId: item.itemId || undefined,
        description: item.description,
        quantity: new Decimal(item.quantity),
        unitPrice: new Decimal(item.unitPrice),
        taxRate: new Decimal(item.taxRate || 0),
        discountRate: new Decimal(item.discountRate || 0),
        total: new Decimal(item.total),
      }));

      const invoice = await invoiceService.createInvoice(
        invoiceData,
        invoiceItems
      );

      res.status(201).json({
        success: true,
        message: "Invoice created successfully",
        data: invoice,
      });
    } catch (error: any) {
      console.error("Error creating invoice:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_INVOICE",
        });
      }

      if (error.message.includes("Customer not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CUSTOMER_NOT_FOUND",
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
 * @route   PUT /api/invoices/:id
 * @desc    Update an existing invoice
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
        customerId,
        date,
        dueDate,
        type,
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
      if (customerId !== undefined) updateData.customerId = customerId;
      if (date !== undefined) updateData.date = new Date(date);
      if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
      if (type !== undefined) updateData.type = type;
      if (status !== undefined) updateData.status = status;
      if (subtotal !== undefined) updateData.subtotal = new Decimal(subtotal);
      if (taxAmount !== undefined)
        updateData.taxAmount = new Decimal(taxAmount);
      if (discountAmount !== undefined)
        updateData.discountAmount = new Decimal(discountAmount);
      if (total !== undefined) updateData.total = new Decimal(total);
      if (notes !== undefined) updateData.notes = notes;
      if (terms !== undefined) updateData.terms = terms;

      const invoice = await invoiceService.updateInvoice(
        id,
        updateData,
        companyId
      );

      res.json({
        success: true,
        message: "Invoice updated successfully",
        data: invoice,
      });
    } catch (error: any) {
      console.error("Error updating invoice:", error);

      if (error.message.includes("Invoice not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Only DRAFT invoices can be updated")) {
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
          code: "DUPLICATE_INVOICE",
        });
      }

      if (error.message.includes("Customer not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CUSTOMER_NOT_FOUND",
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
 * @route   PATCH /api/invoices/:id/status
 * @desc    Update invoice status
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

      if (!["SENT", "PAID", "OVERDUE", "VOIDED"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Invalid status value",
          code: "INVALID_STATUS",
        });
      }

      const invoice = await invoiceService.updateInvoiceStatus(
        id,
        status,
        companyId
      );

      res.json({
        success: true,
        message: `Invoice status updated to ${status} successfully`,
        data: invoice,
      });
    } catch (error: any) {
      console.error("Error updating invoice status:", error);

      if (error.message.includes("Invoice not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (
        error.message.includes("Cannot void a paid invoice") ||
        error.message.includes("Cannot mark a voided invoice as paid")
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
 * @route   DELETE /api/invoices/:id
 * @desc    Delete an invoice (soft delete)
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

      await invoiceService.deleteInvoice(id, companyId);

      res.json({
        success: true,
        message: "Invoice deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting invoice:", error);

      if (error.message.includes("Invoice not found")) {
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
          code: "CANNOT_DELETE_INVOICE",
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

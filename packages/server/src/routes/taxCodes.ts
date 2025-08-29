import { Router, Response } from "express";
import { TaxCodeService } from "../models/TaxCode";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const taxCodeService = new TaxCodeService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/tax-codes
 * @desc    Get all tax codes for the authenticated user's company
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

    const {
      search,
      taxType,
      isActive,
      isCompound,
      isRecoverable,
      limit,
      offset,
    } = req.query;

    const result = await taxCodeService.getTaxCodes(companyId, {
      search: search as string,
      taxType: taxType as string,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      isCompound:
        isCompound === "true"
          ? true
          : isCompound === "false"
            ? false
            : undefined,
      isRecoverable:
        isRecoverable === "true"
          ? true
          : isRecoverable === "false"
            ? false
            : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Tax codes retrieved successfully",
      data: result.taxCodes,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving tax codes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/tax-codes/type/:taxType
 * @desc    Get tax codes by specific type
 * @access  Private
 */
router.get(
  "/type/:taxType",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { taxType } = req.params;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const taxCodes = await taxCodeService.getTaxCodesByType(
        companyId,
        taxType
      );

      res.json({
        success: true,
        message: `${taxType} tax codes retrieved successfully`,
        data: taxCodes,
      });
    } catch (error: any) {
      console.error("Error retrieving tax codes by type:", error);
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
 * @route   GET /api/tax-codes/gst
 * @desc    Get active GST tax codes
 * @access  Private
 */
router.get("/gst", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const taxCodes = await taxCodeService.getGSTTaxCodes(companyId);

    res.json({
      success: true,
      message: "GST tax codes retrieved successfully",
      data: taxCodes,
    });
  } catch (error: any) {
    console.error("Error retrieving GST tax codes:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/tax-codes/stats
 * @desc    Get tax code statistics for the company
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

    const stats = await taxCodeService.getTaxCodeStats(companyId);

    res.json({
      success: true,
      message: "Tax code statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving tax code statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/tax-codes/next-code
 * @desc    Get next available tax code
 * @access  Private
 */
router.get("/next-code", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const nextCode = await taxCodeService.getNextTaxCode(companyId);

    res.json({
      success: true,
      message: "Next tax code retrieved successfully",
      data: { nextCode },
    });
  } catch (error: any) {
    console.error("Error getting next tax code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/tax-codes/:id
 * @desc    Get tax code by ID
 * @access  Private
 */
router.get("/:id", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    const { id } = req.params;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const taxCode = await taxCodeService.getTaxCodeById(id, companyId);

    if (!taxCode) {
      return res.status(404).json({
        success: false,
        message: "Tax code not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Tax code retrieved successfully",
      data: taxCode,
    });
  } catch (error: any) {
    console.error("Error retrieving tax code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/tax-codes
 * @desc    Create a new tax code
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

      const taxCodeData = req.body;

      // Validate required fields
      if (
        !taxCodeData.code ||
        !taxCodeData.name ||
        !taxCodeData.taxType ||
        !taxCodeData.rate
      ) {
        return res.status(400).json({
          success: false,
          message: "Code, name, tax type, and rate are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      // Validate tax type
      const validTaxTypes = [
        "GST",
        "VAT",
        "SALES_TAX",
        "EXCISE",
        "CUSTOMS",
        "OTHER",
      ];
      if (!validTaxTypes.includes(taxCodeData.taxType)) {
        return res.status(400).json({
          success: false,
          message: "Invalid tax type",
          code: "INVALID_TAX_TYPE",
        });
      }

      // Validate rate
      if (taxCodeData.rate < 0 || taxCodeData.rate > 100) {
        return res.status(400).json({
          success: false,
          message: "Tax rate must be between 0 and 100",
          code: "INVALID_TAX_RATE",
        });
      }

      // Convert string values to Decimal objects
      const { Decimal } = require("@prisma/client/runtime/library");
      const processedData = {
        ...taxCodeData,
        rate: new Decimal(taxCodeData.rate),
        gstRate: taxCodeData.gstRate
          ? new Decimal(taxCodeData.gstRate)
          : undefined,
        cgstRate: taxCodeData.cgstRate
          ? new Decimal(taxCodeData.cgstRate)
          : undefined,
        sgstRate: taxCodeData.sgstRate
          ? new Decimal(taxCodeData.sgstRate)
          : undefined,
        igstRate: taxCodeData.igstRate
          ? new Decimal(taxCodeData.igstRate)
          : undefined,
        vatRate: taxCodeData.vatRate
          ? new Decimal(taxCodeData.vatRate)
          : undefined,
        inputVatRate: taxCodeData.inputVatRate
          ? new Decimal(taxCodeData.inputVatRate)
          : undefined,
        outputVatRate: taxCodeData.outputVatRate
          ? new Decimal(taxCodeData.outputVatRate)
          : undefined,
        salesTaxRate: taxCodeData.salesTaxRate
          ? new Decimal(taxCodeData.salesTaxRate)
          : undefined,
        stateTaxRate: taxCodeData.stateTaxRate
          ? new Decimal(taxCodeData.stateTaxRate)
          : undefined,
        localTaxRate: taxCodeData.localTaxRate
          ? new Decimal(taxCodeData.localTaxRate)
          : undefined,
        thresholdAmount: taxCodeData.thresholdAmount
          ? new Decimal(taxCodeData.thresholdAmount)
          : undefined,
        exemptionLimit: taxCodeData.exemptionLimit
          ? new Decimal(taxCodeData.exemptionLimit)
          : undefined,
        companyId,
        createdBy,
      };

      const taxCode = await taxCodeService.createTaxCode(processedData);

      res.status(201).json({
        success: true,
        message: "Tax code created successfully",
        data: taxCode,
      });
    } catch (error: any) {
      console.error("Error creating tax code:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_TAX_CODE",
        });
      }

      if (error.message.includes("not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "ACCOUNT_NOT_FOUND",
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
 * @route   PUT /api/tax-codes/:id
 * @desc    Update an existing tax code
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.put(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      const updateData = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      // Validate tax type if changing
      if (updateData.taxType) {
        const validTaxTypes = [
          "GST",
          "VAT",
          "SALES_TAX",
          "EXCISE",
          "CUSTOMS",
          "OTHER",
        ];
        if (!validTaxTypes.includes(updateData.taxType)) {
          return res.status(400).json({
            success: false,
            message: "Invalid tax type",
            code: "INVALID_TAX_TYPE",
          });
        }
      }

      // Validate rate if changing
      if (updateData.rate !== undefined) {
        if (updateData.rate < 0 || updateData.rate > 100) {
          return res.status(400).json({
            success: false,
            message: "Tax rate must be between 0 and 100",
            code: "INVALID_TAX_RATE",
          });
        }
      }

      // Convert string values to Decimal objects
      const { Decimal } = require("@prisma/client/runtime/library");
      const processedUpdateData = {
        ...updateData,
        rate: updateData.rate ? new Decimal(updateData.rate) : undefined,
        gstRate: updateData.gstRate
          ? new Decimal(updateData.gstRate)
          : undefined,
        cgstRate: updateData.cgstRate
          ? new Decimal(updateData.cgstRate)
          : undefined,
        sgstRate: updateData.sgstRate
          ? new Decimal(updateData.sgstRate)
          : undefined,
        igstRate: updateData.igstRate
          ? new Decimal(updateData.igstRate)
          : undefined,
        vatRate: updateData.vatRate
          ? new Decimal(updateData.vatRate)
          : undefined,
        inputVatRate: updateData.inputVatRate
          ? new Decimal(updateData.inputVatRate)
          : undefined,
        outputVatRate: updateData.outputVatRate
          ? new Decimal(updateData.outputVatRate)
          : undefined,
        salesTaxRate: updateData.salesTaxRate
          ? new Decimal(updateData.salesTaxRate)
          : undefined,
        stateTaxRate: updateData.stateTaxRate
          ? new Decimal(updateData.stateTaxRate)
          : undefined,
        localTaxRate: updateData.localTaxRate
          ? new Decimal(updateData.localTaxRate)
          : undefined,
        thresholdAmount: updateData.thresholdAmount
          ? new Decimal(updateData.thresholdAmount)
          : undefined,
        exemptionLimit: updateData.exemptionLimit
          ? new Decimal(updateData.exemptionLimit)
          : undefined,
      };

      const taxCode = await taxCodeService.updateTaxCode(
        id,
        companyId,
        processedUpdateData
      );

      res.json({
        success: true,
        message: "Tax code updated successfully",
        data: taxCode,
      });
    } catch (error: any) {
      console.error("Error updating tax code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_TAX_CODE",
        });
      }

      if (error.message.includes("not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "ACCOUNT_NOT_FOUND",
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
 * @route   POST /api/tax-codes/:id/calculate
 * @desc    Calculate tax amount for a given base amount
 * @access  Private
 */
router.post(
  "/:id/calculate",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      const { baseAmount, quantity = 1 } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!baseAmount) {
        return res.status(400).json({
          success: false,
          message: "Base amount is required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const taxCode = await taxCodeService.getTaxCodeById(id, companyId);

      if (!taxCode) {
        return res.status(404).json({
          success: false,
          message: "Tax code not found",
          code: "NOT_FOUND",
        });
      }

      const { Decimal } = require("@prisma/client/runtime/library");
      const baseAmountDecimal = new Decimal(baseAmount);
      const quantityNumber = parseInt(quantity) || 1;

      const calculation = taxCodeService.calculateTaxAmount(
        taxCode,
        baseAmountDecimal,
        quantityNumber
      );

      res.json({
        success: true,
        message: "Tax calculation completed successfully",
        data: {
          taxCode,
          baseAmount: baseAmountDecimal.toString(),
          quantity: quantityNumber,
          ...calculation,
        },
      });
    } catch (error: any) {
      console.error("Error calculating tax:", error);
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
 * @route   PATCH /api/tax-codes/:id/status
 * @desc    Toggle tax code status
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.patch(
  "/:id/status",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const taxCode = await taxCodeService.toggleTaxCodeStatus(id, companyId);

      res.json({
        success: true,
        message: `Tax code ${taxCode.isActive ? "activated" : "deactivated"} successfully`,
        data: taxCode,
      });
    } catch (error: any) {
      console.error("Error toggling tax code status:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
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
 * @route   DELETE /api/tax-codes/:id
 * @desc    Delete a tax code (soft delete)
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.delete(
  "/:id",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      await taxCodeService.deleteTaxCode(id, companyId);

      res.json({
        success: true,
        message: "Tax code deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting tax code:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing usage")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_TAX_CODE",
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

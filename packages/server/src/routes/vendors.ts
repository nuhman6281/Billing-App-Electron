import { Router, Request, Response } from "express";
import { VendorService } from "../models/Vendor";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../types/auth";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();
const vendorService = new VendorService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/vendors
 * @desc    Get all vendors for the authenticated user's company
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

    const { search, isActive, limit, offset } = req.query;

    const result = await vendorService.getVendors(companyId, {
      search: search as string,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Vendors retrieved successfully",
      data: result.vendors,
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
    console.error("Error retrieving vendors:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/vendors/aging
 * @desc    Get vendor aging report
 * @access  Private
 */
router.get("/aging", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const agingData = await vendorService.getVendorAging(companyId);

    res.json({
      success: true,
      message: "Vendor aging report retrieved successfully",
      data: agingData,
    });
  } catch (error: any) {
    console.error("Error retrieving vendor aging report:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/vendors/stats
 * @desc    Get vendor statistics for the company
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

    const stats = await vendorService.getVendorStats(companyId);

    res.json({
      success: true,
      message: "Vendor statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving vendor statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/vendors/:id
 * @desc    Get a specific vendor by ID
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

    const vendor = await vendorService.getVendorById(id, companyId);

    if (!vendor) {
      return res.status(404).json({
        success: false,
        message: "Vendor not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Vendor retrieved successfully",
      data: vendor,
    });
  } catch (error: any) {
    console.error("Error retrieving vendor:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/vendors
 * @desc    Create a new vendor
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
      const { code, name, email, phone, address, taxId, creditLimit } =
        req.body;

      if (!code || !name) {
        return res.status(400).json({
          success: false,
          message: "Vendor code and name are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const vendorData = {
        code,
        name,
        email,
        phone,
        address,
        taxId,
        creditLimit: creditLimit ? new Decimal(creditLimit) : undefined,
        companyId,
        createdBy,
      };

      const vendor = await vendorService.createVendor(vendorData);

      res.status(201).json({
        success: true,
        message: "Vendor created successfully",
        data: vendor,
      });
    } catch (error: any) {
      console.error("Error creating vendor:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_VENDOR",
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
 * @route   PUT /api/vendors/:id
 * @desc    Update an existing vendor
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
      const {
        code,
        name,
        email,
        phone,
        address,
        taxId,
        creditLimit,
        isActive,
      } = req.body;

      const updateData: any = {};

      if (code !== undefined) updateData.code = code;
      if (name !== undefined) updateData.name = name;
      if (email !== undefined) updateData.email = email;
      if (phone !== undefined) updateData.phone = phone;
      if (address !== undefined) updateData.address = address;
      if (taxId !== undefined) updateData.taxId = taxId;
      if (creditLimit !== undefined)
        updateData.creditLimit = new Decimal(creditLimit);
      if (isActive !== undefined) updateData.isActive = isActive;

      const vendor = await vendorService.updateVendor(
        id,
        updateData,
        companyId
      );

      res.json({
        success: true,
        message: "Vendor updated successfully",
        data: vendor,
      });
    } catch (error: any) {
      console.error("Error updating vendor:", error);

      if (error.message.includes("Vendor not found")) {
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
          code: "DUPLICATE_VENDOR",
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
 * @route   PATCH /api/vendors/:id/status
 * @desc    Toggle vendor active status
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.patch(
  "/:id/status",
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

      const vendor = await vendorService.toggleVendorStatus(id, companyId);

      res.json({
        success: true,
        message: `Vendor ${vendor.isActive ? "activated" : "deactivated"} successfully`,
        data: vendor,
      });
    } catch (error: any) {
      console.error("Error toggling vendor status:", error);

      if (error.message.includes("Vendor not found")) {
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
 * @route   DELETE /api/vendors/:id
 * @desc    Delete a vendor (soft delete)
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

      await vendorService.deleteVendor(id, companyId);

      res.json({
        success: true,
        message: "Vendor deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting vendor:", error);

      if (error.message.includes("Vendor not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing bills or payments")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_VENDOR",
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

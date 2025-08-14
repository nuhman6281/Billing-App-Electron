import { Router, Request, Response } from "express";
import { CustomerService } from "../models/Customer";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { Decimal } from "@prisma/client/runtime/library";

const router = Router();
const customerService = new CustomerService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/customers
 * @desc    Get all customers for the authenticated user's company
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

    const result = await customerService.getCustomers(companyId, {
      search: search as string,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Customers retrieved successfully",
      data: result.customers,
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
    console.error("Error retrieving customers:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/customers/aging
 * @desc    Get customer aging report
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

    const agingData = await customerService.getCustomerAging(companyId);

    res.json({
      success: true,
      message: "Customer aging report retrieved successfully",
      data: agingData,
    });
  } catch (error: any) {
    console.error("Error retrieving customer aging report:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/customers/stats
 * @desc    Get customer statistics for the company
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

    const stats = await customerService.getCustomerStats(companyId);

    res.json({
      success: true,
      message: "Customer statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving customer statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/customers/:id
 * @desc    Get a specific customer by ID
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

    const customer = await customerService.getCustomerById(id, companyId);

    if (!customer) {
      return res.status(404).json({
        success: false,
        message: "Customer not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Customer retrieved successfully",
      data: customer,
    });
  } catch (error: any) {
    console.error("Error retrieving customer:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/customers
 * @desc    Create a new customer
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
      const {
        code,
        name,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
        country,
        taxId,
        creditLimit,
        paymentTerms,
      } = req.body;

      if (!code || !name) {
        return res.status(400).json({
          success: false,
          message: "Customer code and name are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const customerData = {
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

      const customer = await customerService.createCustomer(customerData);

      res.status(201).json({
        success: true,
        message: "Customer created successfully",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error creating customer:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_CUSTOMER",
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
 * @route   PUT /api/customers/:id
 * @desc    Update an existing customer
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

      const customer = await customerService.updateCustomer(
        id,
        updateData,
        companyId
      );

      res.json({
        success: true,
        message: "Customer updated successfully",
        data: customer,
      });
    } catch (error: any) {
      console.error("Error updating customer:", error);

      if (error.message.includes("Customer not found")) {
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
          code: "DUPLICATE_CUSTOMER",
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
 * @route   PATCH /api/customers/:id/status
 * @desc    Toggle customer active status
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

      const customer = await customerService.toggleCustomerStatus(
        id,
        companyId
      );

      res.json({
        success: true,
        message: `Customer ${customer.isActive ? "activated" : "deactivated"} successfully`,
        data: customer,
      });
    } catch (error: any) {
      console.error("Error toggling customer status:", error);

      if (error.message.includes("Customer not found")) {
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
 * @route   DELETE /api/customers/:id
 * @desc    Delete a customer (soft delete)
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

      await customerService.deleteCustomer(id, companyId);

      res.json({
        success: true,
        message: "Customer deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting customer:", error);

      if (error.message.includes("Customer not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing invoices or payments")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_CUSTOMER",
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

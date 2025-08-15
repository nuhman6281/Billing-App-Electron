import { Router, Request, Response } from "express";
import { ChartOfAccountService } from "../models/ChartOfAccount";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { mapAccountCategoryToFrontend, mapAccountTypeToFrontend } from "../utils/enumMapping";

const router = Router();
const chartOfAccountService = new ChartOfAccountService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/chart-of-accounts
 * @desc    Get all chart of accounts for the authenticated user's company
 * @access  Private
 */
router.get("/", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { type, category, isActive, parentId, search } = req.query;
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const accounts = await chartOfAccountService.getAccounts(companyId, {
      type: type as any,
      category: category as any,
      isActive:
        isActive === "true" ? true : isActive === "false" ? false : undefined,
      parentId: parentId === "null" ? null : (parentId as string),
      search: search as string,
    });

    // Map database enum values back to frontend display values
    const mappedAccounts = accounts.map(account => ({
      ...account,
      type: mapAccountTypeToFrontend(account.type) || account.type,
      category: mapAccountCategoryToFrontend(account.category) || account.category,
    }));

    res.json({
      success: true,
      message: "Chart of accounts retrieved successfully",
      data: mappedAccounts,
    });
  } catch (error: any) {
    console.error("Error retrieving chart of accounts:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/chart-of-accounts/stats
 * @desc    Get chart of accounts statistics
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

    const stats = await chartOfAccountService.getStats(companyId);
    res.json({
      success: true,
      message: "Chart of accounts stats retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving chart of accounts stats:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/chart-of-accounts/tree
 * @desc    Get chart of accounts as a hierarchical tree
 * @access  Private
 */
router.get("/tree", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;

    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const accountTree = await chartOfAccountService.getAccountTree(companyId);

    // Map database enum values back to frontend display values recursively
    const mapTreeRecursively = (nodes: any[]): any[] => {
      return nodes.map(node => ({
        ...node,
        type: mapAccountTypeToFrontend(node.type) || node.type,
        category: mapAccountCategoryToFrontend(node.category) || node.category,
        children: node.children ? mapTreeRecursively(node.children) : [],
      }));
    };

    const mappedTree = mapTreeRecursively(accountTree);

    res.json({
      success: true,
      message: "Chart of accounts tree retrieved successfully",
      data: mappedTree,
    });
  } catch (error: any) {
    console.error("Error retrieving chart of accounts tree:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/chart-of-accounts/:id
 * @desc    Get a specific chart of account by ID
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

    const account = await chartOfAccountService.getAccountById(id, companyId);

    if (!account) {
      return res.status(404).json({
        success: false,
        message: "Chart of account not found",
        code: "NOT_FOUND",
      });
    }

    // Map database enum values back to frontend display values
    const mappedAccount = {
      ...account,
      type: mapAccountTypeToFrontend(account.type) || account.type,
      category: mapAccountCategoryToFrontend(account.category) || account.category,
    };

    res.json({
      success: true,
      message: "Chart of account retrieved successfully",
      data: mappedAccount,
    });
  } catch (error: any) {
    console.error("Error retrieving chart of account:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/chart-of-accounts/:id/balance
 * @desc    Get account balance including child accounts
 * @access  Private
 */
router.get("/:id/balance", async (req: AuthenticatedRequest, res: Response) => {
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

    const balance = await chartOfAccountService.getAccountBalance(
      id,
      companyId
    );

    res.json({
      success: true,
      message: "Account balance retrieved successfully",
      data: { balance: balance.toString() },
    });
  } catch (error: any) {
    console.error("Error retrieving account balance:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/chart-of-accounts
 * @desc    Create a new chart of account
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

      const accountData = {
        ...req.body,
        companyId,
        createdBy,
        updatedBy: createdBy,
      };

      const account = await chartOfAccountService.createAccount(accountData);

      res.status(201).json({
        success: true,
        message: "Chart of account created successfully",
        data: account,
      });
    } catch (error: any) {
      console.error("Error creating chart of account:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_ACCOUNT_CODE",
        });
      }

      if (error.message.includes("Parent account not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_PARENT_ACCOUNT",
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
 * @route   PUT /api/chart-of-accounts/:id
 * @desc    Update an existing chart of account
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

      const updateData = {
        ...req.body,
        updatedBy,
      };

      const account = await chartOfAccountService.updateAccount(
        id,
        updateData,
        companyId
      );

      res.json({
        success: true,
        message: "Chart of account updated successfully",
        data: account,
      });
    } catch (error: any) {
      console.error("Error updating chart of account:", error);

      if (error.message.includes("Account not found")) {
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
          code: "DUPLICATE_ACCOUNT_CODE",
        });
      }

      if (error.message.includes("Parent account not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_PARENT_ACCOUNT",
        });
      }

      if (error.message.includes("circular reference")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CIRCULAR_REFERENCE",
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
 * @route   DELETE /api/chart-of-accounts/:id
 * @desc    Delete a chart of account (soft delete)
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

      await chartOfAccountService.deleteAccount(id, companyId, deletedBy);

      res.json({
        success: true,
        message: "Chart of account deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting chart of account:", error);

      if (error.message.includes("Account not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Cannot delete account with child accounts")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "HAS_CHILDREN",
        });
      }

      if (
        error.message.includes("Cannot delete account with journal entries")
      ) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "HAS_JOURNAL_ENTRIES",
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
 * @route   POST /api/chart-of-accounts/initialize
 * @desc    Initialize default chart of accounts for a company
 * @access  Private (Requires ADMIN role)
 */
router.post(
  "/initialize",
  requireRole(["ADMIN"]),
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

      // Check if company already has accounts
      const existingAccounts =
        await chartOfAccountService.getAccounts(companyId);
      if (existingAccounts.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Company already has chart of accounts",
          code: "ALREADY_INITIALIZED",
        });
      }

      await chartOfAccountService.initializeDefaultChartOfAccounts(
        companyId,
        createdBy
      );

      res.json({
        success: true,
        message: "Default chart of accounts initialized successfully",
      });
    } catch (error: any) {
      console.error("Error initializing default chart of accounts:", error);
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

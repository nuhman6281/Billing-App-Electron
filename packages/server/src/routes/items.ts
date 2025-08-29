import { Router, Response } from "express";
import { ItemService } from "../models/Item";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const itemService = new ItemService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/items
 * @desc    Get all items for the authenticated user's company
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
      categoryId,
      isActive,
      supplierId,
      taxCodeId,
      minPrice,
      maxPrice,
      inStock,
      limit,
      offset,
    } = req.query;

    const result = await itemService.getItems(companyId, {
      search: search as string,
      categoryId: categoryId as string,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      supplierId: supplierId as string,
      taxCodeId: taxCodeId as string,
      minPrice: minPrice ? new (require("decimal.js").Decimal)(minPrice as string) : undefined,
      maxPrice: maxPrice ? new (require("decimal.js").Decimal)(maxPrice as string) : undefined,
      inStock: inStock === "true" ? true : inStock === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Items retrieved successfully",
      data: result.items,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        hasMore: result.hasMore,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving items:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/items/stats
 * @desc    Get item statistics for the company
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

    const stats = await itemService.getItemStats(companyId);

    res.json({
      success: true,
      message: "Item statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving item statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/items/next-code
 * @desc    Get next available item code
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

    const nextCode = await itemService.getNextItemCode(companyId);

    res.json({
      success: true,
      message: "Next item code retrieved successfully",
      data: { nextCode },
    });
  } catch (error: any) {
    console.error("Error getting next item code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/items/:id
 * @desc    Get item by ID
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

    const item = await itemService.getItemById(id, companyId);

    if (!item) {
      return res.status(404).json({
        success: false,
        message: "Item not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Item retrieved successfully",
      data: item,
    });
  } catch (error: any) {
    console.error("Error retrieving item:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/items
 * @desc    Create a new item
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

      const itemData = req.body;

      // Validate required fields
      if (!itemData.code || !itemData.name || !itemData.categoryId) {
        return res.status(400).json({
          success: false,
          message: "Code, name, and category are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const item = await itemService.createItem({
        ...itemData,
        companyId,
        createdBy,
      });

      res.status(201).json({
        success: true,
        message: "Item created successfully",
        data: item,
      });
    } catch (error: any) {
      console.error("Error creating item:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_ITEM",
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
 * @route   PUT /api/items/:id
 * @desc    Update an existing item
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

      const item = await itemService.updateItem(id, companyId, updateData);

      res.json({
        success: true,
        message: "Item updated successfully",
        data: item,
      });
    } catch (error: any) {
      console.error("Error updating item:", error);

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
          code: "DUPLICATE_ITEM",
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
 * @route   PATCH /api/items/:id/stock
 * @desc    Update item stock
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.patch(
  "/:id/stock",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      const { quantity, operation } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!quantity || !operation) {
        return res.status(400).json({
          success: false,
          message: "Quantity and operation are required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      if (!["ADD", "SUBTRACT", "SET"].includes(operation)) {
        return res.status(400).json({
          success: false,
          message: "Invalid operation. Must be ADD, SUBTRACT, or SET",
          code: "INVALID_OPERATION",
        });
      }

      const item = await itemService.updateStock(
        id,
        companyId,
        parseInt(quantity),
        operation as "ADD" | "SUBTRACT" | "SET"
      );

      res.json({
        success: true,
        message: "Item stock updated successfully",
        data: item,
      });
    } catch (error: any) {
      console.error("Error updating item stock:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("Insufficient stock")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INSUFFICIENT_STOCK",
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
 * @route   PATCH /api/items/:id/status
 * @desc    Toggle item status
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

      const item = await itemService.toggleItemStatus(id, companyId);

      res.json({
        success: true,
        message: `Item ${item.isActive ? "activated" : "deactivated"} successfully`,
        data: item,
      });
    } catch (error: any) {
      console.error("Error toggling item status:", error);

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
 * @route   DELETE /api/items/:id
 * @desc    Delete an item (soft delete)
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

      await itemService.deleteItem(id, companyId);

      res.json({
        success: true,
        message: "Item deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting item:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing transactions")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_ITEM",
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



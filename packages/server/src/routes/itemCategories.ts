import { Router, Response } from "express";
import { ItemCategoryService } from "../models/ItemCategory";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";

const router = Router();
const categoryService = new ItemCategoryService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/item-categories
 * @desc    Get all item categories for the authenticated user's company
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
      parentId,
      isActive,
      limit,
      offset,
    } = req.query;

    const result = await categoryService.getCategories(companyId, {
      search: search as string,
      parentId: parentId as string,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: "Item categories retrieved successfully",
      data: result.categories,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 100,
        offset: offset ? parseInt(offset as string) : 0,
      },
    });
  } catch (error: any) {
    console.error("Error retrieving item categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/item-categories/root
 * @desc    Get root categories (no parent)
 * @access  Private
 */
router.get("/root", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const categories = await categoryService.getRootCategories(companyId);

    res.json({
      success: true,
      message: "Root categories retrieved successfully",
      data: categories,
    });
  } catch (error: any) {
    console.error("Error retrieving root categories:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/item-categories/stats
 * @desc    Get item category statistics for the company
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

    const stats = await categoryService.getCategoryStats(companyId);

    res.json({
      success: true,
      message: "Item category statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving item category statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/item-categories/next-code
 * @desc    Get next available category code
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

    const nextCode = await categoryService.getNextCategoryCode(companyId);

    res.json({
      success: true,
      message: "Next category code retrieved successfully",
      data: { nextCode },
    });
  } catch (error: any) {
    console.error("Error getting next category code:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/item-categories/:id
 * @desc    Get item category by ID
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

    const category = await categoryService.getCategoryById(id, companyId);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Item category not found",
        code: "NOT_FOUND",
      });
    }

    res.json({
      success: true,
      message: "Item category retrieved successfully",
      data: category,
    });
  } catch (error: any) {
    console.error("Error retrieving item category:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/item-categories
 * @desc    Create a new item category
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

      const categoryData = req.body;

      // Validate required fields
      if (!categoryData.name) {
        return res.status(400).json({
          success: false,
          message: "Category name is required",
          code: "MISSING_REQUIRED_FIELDS",
        });
      }

      const category = await categoryService.createCategory({
        ...categoryData,
        companyId,
        createdBy,
      });

      res.status(201).json({
        success: true,
        message: "Item category created successfully",
        data: category,
      });
    } catch (error: any) {
      console.error("Error creating item category:", error);

      if (error.message.includes("already exists")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "DUPLICATE_CATEGORY",
        });
      }

      if (error.message.includes("not found")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "PARENT_NOT_FOUND",
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
 * @route   PUT /api/item-categories/:id
 * @desc    Update an existing item category
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

      const category = await categoryService.updateCategory(id, companyId, updateData);

      res.json({
        success: true,
        message: "Item category updated successfully",
        data: category,
      });
    } catch (error: any) {
      console.error("Error updating item category:", error);

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
          code: "DUPLICATE_CATEGORY",
        });
      }

      if (error.message.includes("descendant")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_PARENT",
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
 * @route   PATCH /api/item-categories/:id/move
 * @desc    Move category to new parent
 * @access  Private (Requires ACCOUNTANT, BOOKKEEPER, or ADMIN role)
 */
router.patch(
  "/:id/move",
  requireRole(["ACCOUNTANT", "BOOKKEEPER", "ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      const { newParentId } = req.body;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const category = await categoryService.moveCategory(
        id,
        companyId,
        newParentId || null
      );

      res.json({
        success: true,
        message: "Item category moved successfully",
        data: category,
      });
    } catch (error: any) {
      console.error("Error moving item category:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("descendant")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "INVALID_PARENT",
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
 * @route   PATCH /api/item-categories/:id/status
 * @desc    Toggle item category status
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

      const category = await categoryService.toggleCategoryStatus(id, companyId);

      res.json({
        success: true,
        message: `Item category ${category.isActive ? "activated" : "deactivated"} successfully`,
        data: category,
      });
    } catch (error: any) {
      console.error("Error toggling item category status:", error);

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
 * @route   DELETE /api/item-categories/:id
 * @desc    Delete an item category (soft delete)
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

      await categoryService.deleteCategory(id, companyId);

      res.json({
        success: true,
        message: "Item category deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting item category:", error);

      if (error.message.includes("not found")) {
        return res.status(404).json({
          success: false,
          message: error.message,
          code: "NOT_FOUND",
        });
      }

      if (error.message.includes("existing items") || error.message.includes("subcategories")) {
        return res.status(400).json({
          success: false,
          message: error.message,
          code: "CANNOT_DELETE_CATEGORY",
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



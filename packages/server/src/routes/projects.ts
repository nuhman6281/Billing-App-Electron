import { Router, Response } from "express";
import { ProjectService } from "../models/Project";
import prisma from "../database";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { mapProjectStatusToFrontend } from "../utils/enumMapping";

const router = Router();
const projectService = new ProjectService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/projects
 * @desc    Get all projects for the company with filtering and pagination
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

    const { search, status, customerId, startDate, endDate, limit, offset } =
      req.query;

    const result = await projectService.getProjects(companyId, {
      search: search as string,
      status: status as string,
      customerId: customerId as string,
      startDate: startDate ? new Date(startDate as string) : undefined,
      endDate: endDate ? new Date(endDate as string) : undefined,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    // Map database enum values back to frontend display values
    const mappedProjects = result.projects.map((project) => ({
      ...project,
      status: mapProjectStatusToFrontend(project.status) || project.status,
    }));

    res.json({
      success: true,
      message: "Projects retrieved successfully",
      data: mappedProjects,
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
    console.error("Error retrieving projects:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/:id
 * @desc    Get a specific project by ID
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

    const project = await projectService.getProjectById(id, companyId);

    if (!project) {
      return res.status(404).json({
        success: false,
        message: "Project not found",
        code: "PROJECT_NOT_FOUND",
      });
    }

    // Map database enum values back to frontend display values
    const mappedProject = {
      ...project,
      status: mapProjectStatusToFrontend(project.status) || project.status,
    };

    res.json({
      success: true,
      message: "Project retrieved successfully",
      data: mappedProject,
    });
  } catch (error: any) {
    console.error("Error retrieving project:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/projects
 * @desc    Create a new project
 * @access  Private
 */
router.post(
  "/",
  requireRole(["ADMIN", "ACCOUNTANT", "MANAGER"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { userId } = req.user!;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const projectData = {
        ...req.body,
        companyId,
        createdBy: userId,
        updatedBy: userId,
      };

      const project = await projectService.createProject(projectData);

      res.status(201).json({
        success: true,
        message: "Project created successfully",
        data: project,
      });
    } catch (error: any) {
      console.error("Error creating project:", error);
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
 * @route   PUT /api/projects/:id
 * @desc    Update an existing project
 * @access  Private
 */
router.put(
  "/:id",
  requireRole(["ADMIN", "ACCOUNTANT", "MANAGER"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { id } = req.params;
      const { userId } = req.user!;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const project = await projectService.updateProject(
        id,
        companyId,
        updateData
      );

      if (!project) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        message: "Project updated successfully",
        data: project,
      });
    } catch (error: any) {
      console.error("Error updating project:", error);
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
 * @route   DELETE /api/projects/:id
 * @desc    Delete a project
 * @access  Private
 */
router.delete(
  "/:id",
  requireRole(["ADMIN", "ACCOUNTANT"]),
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

      const success = await projectService.deleteProject(id, companyId);

      if (!success) {
        return res.status(404).json({
          success: false,
          message: "Project not found",
          code: "PROJECT_NOT_FOUND",
        });
      }

      res.json({
        success: true,
        message: "Project deleted successfully",
      });
    } catch (error: any) {
      console.error("Error deleting project:", error);
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
 * @route   GET /api/projects/:id/expenses
 * @desc    Get project expenses
 * @access  Private
 */
router.get(
  "/:id/expenses",
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

      const expenses = await projectService.getProjectExpenses(id, companyId);

      res.json({
        success: true,
        message: "Project expenses retrieved successfully",
        data: expenses,
      });
    } catch (error: any) {
      console.error("Error retrieving project expenses:", error);
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
 * @route   GET /api/projects/:id/time
 * @desc    Get project time tracking
 * @access  Private
 */
router.get("/:id/time", async (req: AuthenticatedRequest, res: Response) => {
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

    const timeData = await projectService.getProjectTime(id, companyId);

    res.json({
      success: true,
      message: "Project time data retrieved successfully",
      data: timeData,
    });
  } catch (error: any) {
    console.error("Error retrieving project time data:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/projects/stats
 * @desc    Get project statistics
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

    const stats = await projectService.getProjectStats(companyId);

    res.json({
      success: true,
      message: "Project statistics retrieved successfully",
      data: stats,
    });
  } catch (error: any) {
    console.error("Error retrieving project statistics:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

export default router;

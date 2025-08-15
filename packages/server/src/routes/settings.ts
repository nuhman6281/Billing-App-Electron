import { Router, Response } from "express";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { SettingsService } from "../models/Settings";
import prisma from "../database";

const router = Router();
const settingsService = new SettingsService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/settings
 * @desc    Get all settings for the authenticated user's company
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

    const settings = await settingsService.getCompanySettings(companyId);

    res.json({
      success: true,
      message: "Settings retrieved successfully",
      data: settings,
    });
  } catch (error: any) {
    console.error("Error retrieving settings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/settings/company
 * @desc    Get company-specific settings
 * @access  Private
 */
router.get("/company", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const companySettings = await settingsService.getCompanyInfo(companyId);

    res.json({
      success: true,
      message: "Company settings retrieved successfully",
      data: companySettings,
    });
  } catch (error: any) {
    console.error("Error retrieving company settings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/settings/company
 * @desc    Update company settings
 * @access  Private (Admin only)
 */
router.put(
  "/company",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
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

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedSettings = await settingsService.updateCompanySettings(
        companyId,
        updateData
      );

      res.json({
        success: true,
        message: "Company settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating company settings:", error);
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
 * @route   GET /api/settings/financial
 * @desc    Get financial settings
 * @access  Private
 */
router.get("/financial", async (req: AuthenticatedRequest, res: Response) => {
  try {
    const companyId = req.user?.companyId;
    if (!companyId) {
      return res.status(400).json({
        success: false,
        message: "Company ID is required",
        code: "MISSING_COMPANY_ID",
      });
    }

    const financialSettings =
      await settingsService.getFinancialSettings(companyId);

    res.json({
      success: true,
      message: "Financial settings retrieved successfully",
      data: financialSettings,
    });
  } catch (error: any) {
    console.error("Error retrieving financial settings:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
      code: "INTERNAL_ERROR",
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/settings/financial
 * @desc    Update financial settings
 * @access  Private (Admin, Accountant only)
 */
router.put(
  "/financial",
  requireRole(["ADMIN", "ACCOUNTANT", "SUPER_ADMIN"]),
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

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedSettings = await settingsService.updateFinancialSettings(
        companyId,
        updateData
      );

      res.json({
        success: true,
        message: "Financial settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating financial settings:", error);
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
 * @route   GET /api/settings/integrations
 * @desc    Get integration settings
 * @access  Private
 */
router.get(
  "/integrations",
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const integrationSettings =
        await settingsService.getIntegrationSettings(companyId);

      res.json({
        success: true,
        message: "Integration settings retrieved successfully",
        data: integrationSettings,
      });
    } catch (error: any) {
      console.error("Error retrieving integration settings:", error);
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
 * @route   PUT /api/settings/integrations
 * @desc    Update integration settings
 * @access  Private (Admin only)
 */
router.put(
  "/integrations",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
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

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedSettings = await settingsService.updateIntegrationSettings(
        companyId,
        updateData
      );

      res.json({
        success: true,
        message: "Integration settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating integration settings:", error);
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
 * @route   GET /api/settings/notifications
 * @desc    Get notification settings
 * @access  Private
 */
router.get(
  "/notifications",
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

      const notificationSettings =
        await settingsService.getNotificationSettings(companyId, userId);

      res.json({
        success: true,
        message: "Notification settings retrieved successfully",
        data: notificationSettings,
      });
    } catch (error: any) {
      console.error("Error retrieving notification settings:", error);
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
 * @route   PUT /api/settings/notifications
 * @desc    Update notification settings
 * @access  Private
 */
router.put(
  "/notifications",
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

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedSettings = await settingsService.updateNotificationSettings(
        companyId,
        userId,
        updateData
      );

      res.json({
        success: true,
        message: "Notification settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating notification settings:", error);
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
 * @route   GET /api/settings/security
 * @desc    Get security settings
 * @access  Private (Admin only)
 */
router.get(
  "/security",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const securitySettings =
        await settingsService.getSecuritySettings(companyId);

      res.json({
        success: true,
        message: "Security settings retrieved successfully",
        data: securitySettings,
      });
    } catch (error: any) {
      console.error("Error retrieving security settings:", error);
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
 * @route   PUT /api/settings/security
 * @desc    Update security settings
 * @access  Private (Admin only)
 */
router.put(
  "/security",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
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

      const updateData = {
        ...req.body,
        updatedBy: userId,
      };

      const updatedSettings = await settingsService.updateSecuritySettings(
        companyId,
        updateData
      );

      res.json({
        success: true,
        message: "Security settings updated successfully",
        data: updatedSettings,
      });
    } catch (error: any) {
      console.error("Error updating security settings:", error);
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
 * @route   POST /api/settings/backup
 * @desc    Create a backup of company data
 * @access  Private (Admin only)
 */
router.post(
  "/backup",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
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

      const backupResult = await settingsService.createBackup(
        companyId,
        userId
      );

      res.json({
        success: true,
        message: "Backup created successfully",
        data: backupResult,
      });
    } catch (error: any) {
      console.error("Error creating backup:", error);
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
 * @route   GET /api/settings/backup/history
 * @desc    Get backup history
 * @access  Private (Admin only)
 */
router.get(
  "/backup/history",
  requireRole(["ADMIN", "SUPER_ADMIN"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      const backupHistory = await settingsService.getBackupHistory(companyId);

      res.json({
        success: true,
        message: "Backup history retrieved successfully",
        data: backupHistory,
      });
    } catch (error: any) {
      console.error("Error retrieving backup history:", error);
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

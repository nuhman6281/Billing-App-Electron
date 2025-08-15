import { Router, Response } from "express";
import multer from "multer";
import { authenticateToken, requireRole } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import { DataService } from "../models/Data";
import prisma from "../database";

const router = Router();
const dataService = new DataService(prisma);

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only CSV and Excel files are allowed."));
    }
  },
});

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   POST /api/data/import/validate
 * @desc    Validate uploaded file for import
 * @access  Private
 */
router.post(
  "/import/validate",
  requireRole(["ADMIN", "ACCOUNTANT", "BOOKKEEPER"]),
  upload.single("file"),
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

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "No file uploaded",
          code: "NO_FILE",
        });
      }

      const { type } = req.body;
      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Data type is required",
          code: "MISSING_TYPE",
        });
      }

      const validationResult = await dataService.validateImportFile(
        req.file,
        type,
        companyId
      );

      res.json({
        success: true,
        message: "File validation completed",
        data: validationResult,
      });
    } catch (error: any) {
      console.error("Error validating import file:", error);
      res.status(500).json({
        success: false,
        message: "Failed to validate file",
        code: "VALIDATION_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/data/import
 * @desc    Import data from validated file
 * @access  Private
 */
router.post(
  "/import",
  requireRole(["ADMIN", "ACCOUNTANT", "BOOKKEEPER"]),
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

      const { type, fileName, data } = req.body;

      if (!type || !fileName || !data) {
        return res.status(400).json({
          success: false,
          message: "Missing required import data",
          code: "MISSING_IMPORT_DATA",
        });
      }

      const importResult = await dataService.importData(
        type,
        data,
        companyId,
        userId
      );

      res.json({
        success: true,
        message: "Data imported successfully",
        data: importResult,
      });
    } catch (error: any) {
      console.error("Error importing data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to import data",
        code: "IMPORT_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   POST /api/data/export
 * @desc    Export data in specified format
 * @access  Private
 */
router.post(
  "/export",
  requireRole(["ADMIN", "ACCOUNTANT", "MANAGER"]),
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

      const { type, format, filters, dateRange } = req.body;

      if (!type || !format) {
        return res.status(400).json({
          success: false,
          message: "Export type and format are required",
          code: "MISSING_EXPORT_PARAMS",
        });
      }

      const exportData = await dataService.exportData(
        type,
        format,
        filters,
        dateRange,
        companyId
      );

      // Set response headers for file download
      const filename = `${type}-export-${new Date().toISOString().split("T")[0]}.${format}`;
      res.setHeader("Content-Type", "application/octet-stream");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      res.send(exportData);
    } catch (error: any) {
      console.error("Error exporting data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export data",
        code: "EXPORT_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/data/template
 * @desc    Download import template for specified data type
 * @access  Private
 */
router.get(
  "/template",
  requireRole(["ADMIN", "ACCOUNTANT", "BOOKKEEPER"]),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const companyId = req.user?.companyId;
      const { type } = req.query;

      if (!companyId) {
        return res.status(400).json({
          success: false,
          message: "Company ID is required",
          code: "MISSING_COMPANY_ID",
        });
      }

      if (!type) {
        return res.status(400).json({
          success: false,
          message: "Data type is required",
          code: "MISSING_TYPE",
        });
      }

      const template = await dataService.generateTemplate(type as string, companyId);

      // Set response headers for file download
      const filename = `${type}-template.csv`;
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);

      res.send(template);
    } catch (error: any) {
      console.error("Error generating template:", error);
      res.status(500).json({
        success: false,
        message: "Failed to generate template",
        code: "TEMPLATE_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/data/import/history
 * @desc    Get import history for the company
 * @access  Private
 */
router.get(
  "/import/history",
  requireRole(["ADMIN", "ACCOUNTANT", "MANAGER"]),
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

      const { limit, offset } = req.query;

      const history = await dataService.getImportHistory(
        companyId,
        limit ? parseInt(limit as string) : 50,
        offset ? parseInt(offset as string) : 0
      );

      res.json({
        success: true,
        message: "Import history retrieved successfully",
        data: history,
      });
    } catch (error: any) {
      console.error("Error retrieving import history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve import history",
        code: "HISTORY_ERROR",
        error: error.message,
      });
    }
  }
);

/**
 * @route   GET /api/data/export/history
 * @desc    Get export history for the company
 * @access  Private
 */
router.get(
  "/export/history",
  requireRole(["ADMIN", "ACCOUNTANT", "MANAGER"]),
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

      const { limit, offset } = req.query;

      const history = await dataService.getExportHistory(
        companyId,
        limit ? parseInt(limit as string) : 50,
        offset ? parseInt(offset as string) : 0
      );

      res.json({
        success: true,
        message: "Export history retrieved successfully",
        data: history,
      });
    } catch (error: any) {
      console.error("Error retrieving export history:", error);
      res.status(500).json({
        success: false,
        message: "Failed to retrieve export history",
        code: "HISTORY_ERROR",
        error: error.message,
      });
    }
  }
);

export default router;

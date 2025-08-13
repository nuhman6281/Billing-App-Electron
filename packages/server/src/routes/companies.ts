import { Router, Request, Response } from 'express';
import { CompanyService } from '../models/Company';
import prisma from '../database';
import { authenticateToken, requireRole } from '../middleware/auth';
import { AuthenticatedRequest } from '../types/auth';

const router = Router();
const companyService = new CompanyService(prisma);

// Apply authentication middleware to all routes
router.use(authenticateToken);

/**
 * @route   GET /api/companies
 * @desc    Get all companies with optional filtering
 * @access  Private (Requires ADMIN role)
 */
router.get('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { isActive, search, limit, offset } = req.query;
    
    const result = await companyService.getCompanies({
      isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      search: search as string,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined,
    });

    res.json({
      success: true,
      message: 'Companies retrieved successfully',
      data: result.companies,
      pagination: {
        total: result.total,
        limit: limit ? parseInt(limit as string) : 50,
        offset: offset ? parseInt(offset as string) : 0,
        hasMore: (offset ? parseInt(offset as string) : 0) + (limit ? parseInt(limit as string) : 50) < result.total,
      },
    });
  } catch (error: any) {
    console.error('Error retrieving companies:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/companies/:id
 * @desc    Get a specific company by ID
 * @access  Private
 */
router.get('/:id', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Users can only access their own company unless they're ADMIN
    if (req.user?.role !== 'ADMIN' && companyId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company.',
        code: 'ACCESS_DENIED',
      });
    }

    const company = await companyService.getCompanyById(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'Company retrieved successfully',
      data: company,
    });
  } catch (error: any) {
    console.error('Error retrieving company:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/companies/:id/stats
 * @desc    Get company with statistics
 * @access  Private
 */
router.get('/:id/stats', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Users can only access their own company unless they're ADMIN
    if (req.user?.role !== 'ADMIN' && companyId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company.',
        code: 'ACCESS_DENIED',
      });
    }

    const company = await companyService.getCompanyWithStats(id);

    if (!company) {
      return res.status(404).json({
        success: false,
        message: 'Company not found',
        code: 'NOT_FOUND',
      });
    }

    res.json({
      success: true,
      message: 'Company statistics retrieved successfully',
      data: company,
    });
  } catch (error: any) {
    console.error('Error retrieving company statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/companies/:id/dashboard
 * @desc    Get company dashboard statistics
 * @access  Private
 */
router.get('/:id/dashboard', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Users can only access their own company unless they're ADMIN
    if (req.user?.role !== 'ADMIN' && companyId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company.',
        code: 'ACCESS_DENIED',
      });
    }

    const stats = await companyService.getCompanyDashboardStats(id);

    res.json({
      success: true,
      message: 'Company dashboard statistics retrieved successfully',
      data: stats,
    });
  } catch (error: any) {
    console.error('Error retrieving company dashboard statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/companies/:id/financial-summary
 * @desc    Get company financial summary
 * @access  Private
 */
router.get('/:id/financial-summary', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Users can only access their own company unless they're ADMIN
    if (req.user?.role !== 'ADMIN' && companyId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company.',
        code: 'ACCESS_DENIED',
      });
    }

    const financialSummary = await companyService.getCompanyFinancialSummary(id);

    res.json({
      success: true,
      message: 'Company financial summary retrieved successfully',
      data: financialSummary,
    });
  } catch (error: any) {
    console.error('Error retrieving company financial summary:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   POST /api/companies
 * @desc    Create a new company
 * @access  Private (Requires ADMIN role)
 */
router.post('/', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const createdBy = req.user?.userId;

    if (!createdBy) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    }

    const companyData = {
      ...req.body,
      createdBy,
      updatedBy: createdBy,
    };

    const company = await companyService.createCompany(companyData);

    res.status(201).json({
      success: true,
      message: 'Company created successfully',
      data: company,
    });
  } catch (error: any) {
    console.error('Error creating company:', error);
    
    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_COMPANY',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   PUT /api/companies/:id
 * @desc    Update an existing company
 * @access  Private (Requires ADMIN role)
 */
router.put('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    }

    const updateData = {
      ...req.body,
      updatedBy,
    };

    const company = await companyService.updateCompany(id, updateData);

    res.json({
      success: true,
      message: 'Company updated successfully',
      data: company,
    });
  } catch (error: any) {
    console.error('Error updating company:', error);
    
    if (error.message.includes('Company not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'NOT_FOUND',
      });
    }

    if (error.message.includes('already exists')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'DUPLICATE_COMPANY',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   DELETE /api/companies/:id
 * @desc    Delete a company (soft delete)
 * @access  Private (Requires ADMIN role)
 */
router.delete('/:id', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const deletedBy = req.user?.userId;

    if (!deletedBy) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    }

    await companyService.deleteCompany(id, deletedBy);

    res.json({
      success: true,
      message: 'Company deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting company:', error);
    
    if (error.message.includes('Company not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'NOT_FOUND',
      });
    }

    if (error.message.includes('Cannot delete company with')) {
      return res.status(400).json({
        success: false,
        message: error.message,
        code: 'HAS_DEPENDENCIES',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   PATCH /api/companies/:id/status
 * @desc    Toggle company active status
 * @access  Private (Requires ADMIN role)
 */
router.patch('/:id/status', requireRole(['ADMIN']), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;
    const updatedBy = req.user?.userId;

    if (!updatedBy) {
      return res.status(400).json({
        success: false,
        message: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
    }

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value',
        code: 'INVALID_INPUT',
      });
    }

    const company = await companyService.toggleCompanyStatus(id, isActive, updatedBy);

    res.json({
      success: true,
      message: `Company ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: company,
    });
  } catch (error: any) {
    console.error('Error toggling company status:', error);
    
    if (error.message.includes('Company not found')) {
      return res.status(404).json({
        success: false,
        message: error.message,
        code: 'NOT_FOUND',
      });
    }

    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

/**
 * @route   GET /api/companies/:id/settings
 * @desc    Get company default settings
 * @access  Private
 */
router.get('/:id/settings', async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const companyId = req.user?.companyId;

    // Users can only access their own company unless they're ADMIN
    if (req.user?.role !== 'ADMIN' && companyId !== id) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only access your own company.',
        code: 'ACCESS_DENIED',
      });
    }

    const settings = companyService.getDefaultCompanySettings();

    res.json({
      success: true,
      message: 'Company settings retrieved successfully',
      data: settings,
    });
  } catch (error: any) {
    console.error('Error retrieving company settings:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      code: 'INTERNAL_ERROR',
      error: error.message,
    });
  }
});

export default router;

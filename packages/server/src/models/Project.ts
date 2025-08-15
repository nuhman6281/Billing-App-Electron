import { PrismaClient, Project, ProjectStatus, Prisma } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import { mapProjectStatusToDatabase } from "../utils/enumMapping";

export interface CreateProjectInput {
  code: string;
  name: string;
  description?: string;
  customerId: string;
  startDate: Date;
  endDate?: Date;
  status: string; // Accept string from frontend, will be mapped to enum
  budget: string;
  hourlyRate?: string;
  managerId?: string;
  notes?: string;
  companyId: string;
  createdBy: string;
  updatedBy: string;
}

export interface UpdateProjectInput {
  name?: string;
  description?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string; // Accept string from frontend, will be mapped to enum
  budget?: string;
  hourlyRate?: string;
  managerId?: string;
  notes?: string;
  updatedBy: string;
}

export interface ProjectFilters {
  search?: string;
  status?: string; // Accept string from frontend, will be mapped to enum
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface ProjectWithDetails extends Project {
  customer: {
    id: string;
    name: string;
    code: string;
  };
  manager?: {
    id: string;
    displayName: string;
  };
}

export interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: string;
  totalExpenses: string;
  totalRevenue: string;
  averageProjectDuration: number;
}

export interface ProjectExpense {
  id: string;
  description: string;
  amount: string;
  date: Date;
  category: string;
  billId?: string;
  invoiceId?: string;
}

export interface ProjectTimeEntry {
  id: string;
  description: string;
  hours: number;
  rate: string;
  date: Date;
  employeeId: string;
  employeeName: string;
  total: string;
}

export class ProjectService {
  constructor(private prisma: PrismaClient) {}

  async getProjects(
    companyId: string,
    filters: ProjectFilters
  ): Promise<{ projects: ProjectWithDetails[]; total: number }> {
    const where: Prisma.ProjectWhereInput = {
      companyId,
      isDeleted: false,
    };

    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: "insensitive" } },
        { description: { contains: filters.search, mode: "insensitive" } },
      ];
    }

    if (filters.status) {
      const mappedStatus =
        mapProjectStatusToDatabase(filters.status) || filters.status;
      where.status = mappedStatus as ProjectStatus;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (filters.startDate) {
      where.startDate = { gte: filters.startDate };
    }

    if (filters.endDate) {
      where.endDate = { lte: filters.endDate };
    }

    const [projects, total] = await Promise.all([
      this.prisma.project.findMany({
        where,
        include: {
          customer: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          manager: {
            select: {
              id: true,
              displayName: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        take: filters.limit || 50,
        skip: filters.offset || 0,
      }),
      this.prisma.project.count({ where }),
    ]);

    return { projects, total };
  }

  async getProjectById(
    id: string,
    companyId: string
  ): Promise<ProjectWithDetails | null> {
    return this.prisma.project.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        manager: {
          select: {
            id: true,
            displayName: true,
          },
        },
      },
    });
  }

  async createProject(data: CreateProjectInput): Promise<Project> {
    // Map frontend display values to database enum values
    const mappedStatus = mapProjectStatusToDatabase(data.status) || data.status;

    return this.prisma.project.create({
      data: {
        code: data.code,
        name: data.name,
        description: data.description,
        customerId: data.customerId,
        startDate: data.startDate,
        endDate: data.endDate,
        status: mappedStatus as ProjectStatus,
        budget: new Decimal(data.budget),
        hourlyRate: data.hourlyRate ? new Decimal(data.hourlyRate) : null,
        managerId: data.managerId,
        notes: data.notes,
        companyId: data.companyId,
        createdBy: data.createdBy,
        updatedBy: data.updatedBy,
      },
    });
  }

  async updateProject(
    id: string,
    companyId: string,
    data: UpdateProjectInput
  ): Promise<Project | null> {
    const updateData: Prisma.ProjectUpdateInput = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.description !== undefined)
      updateData.description = data.description;
    if (data.customerId !== undefined) updateData.customerId = data.customerId;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;
    if (data.status !== undefined) {
      const mappedStatus =
        mapProjectStatusToDatabase(data.status) || data.status;
      updateData.status = mappedStatus as ProjectStatus;
    }
    if (data.budget !== undefined) updateData.budget = new Decimal(data.budget);
    if (data.hourlyRate !== undefined) {
      updateData.hourlyRate = data.hourlyRate
        ? new Decimal(data.hourlyRate)
        : null;
    }
    if (data.managerId !== undefined) updateData.managerId = data.managerId;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.updatedBy !== undefined) updateData.updatedBy = data.updatedBy;

    updateData.updatedAt = new Date();

    return this.prisma.project.update({
      where: { id, companyId },
      data: updateData,
    });
  }

  async deleteProject(id: string, companyId: string): Promise<boolean> {
    try {
      await this.prisma.project.update({
        where: { id, companyId },
        data: {
          isDeleted: true,
          updatedAt: new Date(),
        },
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  async getProjectExpenses(
    projectId: string,
    companyId: string
  ): Promise<ProjectExpense[]> {
    const expenses = await this.prisma.projectExpense.findMany({
      where: {
        projectId,
        project: { companyId, isDeleted: false },
        isDeleted: false,
      },
      include: {
        bill: {
          select: { id: true, number: true },
        },
        invoice: {
          select: { id: true, number: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return expenses.map((expense) => ({
      id: expense.id,
      description: expense.description,
      amount: expense.amount.toString(),
      date: expense.date,
      category: expense.category,
      billId: expense.bill?.id,
      invoiceId: expense.invoice?.id,
    }));
  }

  async getProjectTime(
    projectId: string,
    companyId: string
  ): Promise<ProjectTimeEntry[]> {
    const timeEntries = await this.prisma.projectTimeEntry.findMany({
      where: {
        projectId,
        project: { companyId, isDeleted: false },
        isDeleted: false,
      },
      include: {
        employee: {
          select: { displayName: true },
        },
      },
      orderBy: { date: "desc" },
    });

    return timeEntries.map((entry) => ({
      id: entry.id,
      description: entry.description,
      hours: entry.hours,
      rate: entry.rate.toString(),
      date: entry.date,
      employeeId: entry.employeeId,
      employeeName: entry.employee.displayName,
      total: entry.total.toString(),
    }));
  }

  async getProjectStats(companyId: string): Promise<ProjectStats> {
    const [
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalBudget,
      totalExpenses,
      totalRevenue,
    ] = await Promise.all([
      this.prisma.project.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.project.count({
        where: { companyId, isDeleted: false, status: "ACTIVE" },
      }),
      this.prisma.project.count({
        where: { companyId, isDeleted: false, status: "COMPLETED" },
      }),
      this.prisma.project.count({
        where: { companyId, isDeleted: false, status: "ON_HOLD" },
      }),
      this.prisma.project.aggregate({
        where: { companyId, isDeleted: false },
        _sum: { budget: true },
      }),
      this.prisma.projectExpense.aggregate({
        where: {
          project: { companyId, isDeleted: false },
          isDeleted: false,
        },
        _sum: { amount: true },
      }),
      this.prisma.invoice.aggregate({
        where: {
          project: { companyId, isDeleted: false },
          status: "PAID",
          isDeleted: false,
        },
        _sum: { total: true },
      }),
    ]);

    // Calculate average project duration
    const projectsWithDuration = await this.prisma.project.findMany({
      where: {
        companyId,
        isDeleted: false,
        endDate: { not: null },
        startDate: { not: null },
      },
      select: {
        startDate: true,
        endDate: true,
      },
    });

    const totalDuration = projectsWithDuration.reduce((sum, project) => {
      const duration =
        project.endDate!.getTime() - project.startDate!.getTime();
      return sum + duration;
    }, 0);

    const averageProjectDuration =
      projectsWithDuration.length > 0
        ? Math.round(
            totalDuration / projectsWithDuration.length / (1000 * 60 * 60 * 24)
          ) // Convert to days
        : 0;

    return {
      totalProjects,
      activeProjects,
      completedProjects,
      onHoldProjects,
      totalBudget: totalBudget._sum.budget?.toString() || "0",
      totalExpenses: totalExpenses._sum.amount?.toString() || "0",
      totalRevenue: totalRevenue._sum.total?.toString() || "0",
      averageProjectDuration,
    };
  }
}

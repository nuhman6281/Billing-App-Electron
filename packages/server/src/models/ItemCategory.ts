import { PrismaClient, ItemCategory } from "@prisma/client";

export interface CreateItemCategoryInput {
  name: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  companyId: string;
  createdBy: string;
  code?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  taxRate?: number;
  gstRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  hsnCode?: string;
}

export interface UpdateItemCategoryInput {
  name?: string;
  description?: string;
  parentId?: string;
  isActive?: boolean;
  code?: string;
  color?: string;
  icon?: string;
  sortOrder?: number;
  taxRate?: number;
  gstRate?: number;
  cgstRate?: number;
  sgstRate?: number;
  igstRate?: number;
  hsnCode?: string;
}

export interface ItemCategoryFilters {
  search?: string;
  parentId?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
}

export interface ItemCategoryWithChildren extends ItemCategory {
  children: ItemCategoryWithChildren[];
  _count: {
    items: number;
    children: number;
  };
}

export interface ItemCategoryStats {
  totalCategories: number;
  activeCategories: number;
  inactiveCategories: number;
  rootCategories: number;
  leafCategories: number;
  categoryDistribution: Array<{
    categoryId: string;
    categoryName: string;
    itemCount: number;
    totalValue: number;
  }>;
}

export class ItemCategoryService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new item category
   */
  async createCategory(input: CreateItemCategoryInput): Promise<ItemCategory> {
    // Validate category name uniqueness within company and parent
    const existingCategory = await this.prisma.itemCategory.findFirst({
      where: {
        name: input.name,
        companyId: input.companyId,
        parentId: input.parentId || null,
        isDeleted: false,
      },
    });

    if (existingCategory) {
      throw new Error(
        `Category "${input.name}" already exists in this ${input.parentId ? "subcategory" : "level"}`
      );
    }

    // Validate code uniqueness if provided
    if (input.code) {
      const existingCode = await this.prisma.itemCategory.findFirst({
        where: {
          code: input.code,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingCode) {
        throw new Error(
          `Category code ${input.code} already exists in this company`
        );
      }
    }

    // Validate parent exists if provided
    if (input.parentId && input.parentId.trim() !== "") {
      const parentCategory = await this.prisma.itemCategory.findFirst({
        where: {
          id: input.parentId,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }
    }

    return this.prisma.itemCategory.create({
      data: {
        ...input,
        parentId:
          input.parentId && input.parentId.trim() !== ""
            ? input.parentId
            : null,
        updatedBy: input.createdBy, // Set updatedBy to same as createdBy for new records
        isActive: true,
        sortOrder: input.sortOrder || 0,
        taxRate: input.taxRate || 0,
        gstRate: input.gstRate || 0,
        cgstRate: input.cgstRate || 0,
        sgstRate: input.sgstRate || 0,
        igstRate: input.igstRate || 0,
      },
    });
  }

  /**
   * Update an existing item category
   */
  async updateCategory(
    id: string,
    companyId: string,
    input: UpdateItemCategoryInput
  ): Promise<ItemCategory> {
    // Check if category exists and belongs to company
    const existingCategory = await this.prisma.itemCategory.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingCategory) {
      throw new Error("Category not found");
    }

    // Validate name uniqueness if changing
    if (input.name && input.name !== existingCategory.name) {
      const duplicateName = await this.prisma.itemCategory.findFirst({
        where: {
          name: input.name,
          companyId,
          parentId: input.parentId || existingCategory.parentId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateName) {
        throw new Error(
          `Category "${input.name}" already exists in this ${input.parentId || existingCategory.parentId ? "subcategory" : "level"}`
        );
      }
    }

    // Validate code uniqueness if changing
    if (input.code && input.code !== existingCategory.code) {
      const duplicateCode = await this.prisma.itemCategory.findFirst({
        where: {
          code: input.code,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateCode) {
        throw new Error(
          `Category code ${input.code} already exists in this company`
        );
      }
    }

    // Validate parent exists if changing
    if (
      input.parentId &&
      input.parentId.trim() !== "" &&
      input.parentId !== existingCategory.parentId
    ) {
      const parentCategory = await this.prisma.itemCategory.findFirst({
        where: {
          id: input.parentId,
          companyId,
          isDeleted: false,
        },
      });

      if (!parentCategory) {
        throw new Error("Parent category not found");
      }

      // Prevent circular references
      if (input.parentId === id) {
        throw new Error("Category cannot be its own parent");
      }

      // Check if the new parent is a descendant of this category
      const isDescendant = await this.isDescendant(
        id,
        input.parentId,
        companyId
      );
      if (isDescendant) {
        throw new Error("Cannot set parent to a descendant category");
      }
    }

    return this.prisma.itemCategory.update({
      where: { id },
      data: {
        ...input,
        parentId:
          input.parentId && input.parentId.trim() !== ""
            ? input.parentId
            : null,
      },
    });
  }

  /**
   * Get category by ID with children
   */
  async getCategoryById(
    id: string,
    companyId: string
  ): Promise<ItemCategoryWithChildren | null> {
    return this.prisma.itemCategory.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        children: {
          where: { isDeleted: false },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: {
              select: {
                items: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
            children: true,
          },
        },
      },
    });
  }

  /**
   * Get all categories with hierarchical structure
   */
  async getCategories(
    companyId: string,
    filters: ItemCategoryFilters = {}
  ): Promise<{ categories: ItemCategoryWithChildren[]; total: number }> {
    const { search, parentId, isActive, limit = 100, offset = 0 } = filters;

    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
      ];
    }

    if (parentId !== undefined) {
      where.parentId = parentId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [categories, total] = await Promise.all([
      this.prisma.itemCategory.findMany({
        where,
        include: {
          children: {
            where: { isDeleted: false },
            orderBy: { sortOrder: "asc" },
            include: {
              _count: {
                select: {
                  items: true,
                  children: true,
                },
              },
            },
          },
          _count: {
            select: {
              items: true,
              children: true,
            },
          },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        take: limit,
        skip: offset,
      }),
      this.prisma.itemCategory.count({ where }),
    ]);

    return { categories, total };
  }

  /**
   * Get root categories (no parent)
   */
  async getRootCategories(
    companyId: string
  ): Promise<ItemCategoryWithChildren[]> {
    return this.prisma.itemCategory.findMany({
      where: {
        companyId,
        parentId: null,
        isDeleted: false,
        isActive: true,
      },
      include: {
        children: {
          where: { isDeleted: false, isActive: true },
          orderBy: { sortOrder: "asc" },
          include: {
            _count: {
              select: {
                items: true,
                children: true,
              },
            },
          },
        },
        _count: {
          select: {
            items: true,
            children: true,
          },
        },
      },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    });
  }

  /**
   * Get category statistics
   */
  async getCategoryStats(companyId: string): Promise<ItemCategoryStats> {
    const [
      totalCategories,
      activeCategories,
      inactiveCategories,
      rootCategories,
      leafCategories,
      categoryDistribution,
    ] = await Promise.all([
      this.prisma.itemCategory.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.itemCategory.count({
        where: { companyId, isActive: true, isDeleted: false },
      }),
      this.prisma.itemCategory.count({
        where: { companyId, isActive: false, isDeleted: false },
      }),
      this.prisma.itemCategory.count({
        where: { companyId, parentId: null, isDeleted: false },
      }),
      this.prisma.itemCategory.count({
        where: {
          companyId,
          isDeleted: false,
          children: { none: {} },
        },
      }),
      this.prisma.itemCategory.groupBy({
        by: ["id", "name"],
        where: { companyId, isDeleted: false },
        _count: {
          items: true,
        },
        _sum: {
          items: true,
        },
      }),
    ]);

    return {
      totalCategories,
      activeCategories,
      inactiveCategories,
      rootCategories,
      leafCategories,
      categoryDistribution: categoryDistribution.map((item) => ({
        categoryId: item.id,
        categoryName: item.name,
        itemCount: item._count.items,
        totalValue: Number(item._sum.items) || 0,
      })),
    };
  }

  /**
   * Get next available category code
   */
  async getNextCategoryCode(companyId: string): Promise<string> {
    const lastCategory = await this.prisma.itemCategory.findFirst({
      where: {
        companyId,
        isDeleted: false,
        code: { not: null },
      },
      orderBy: {
        code: "desc",
      },
      select: {
        code: true,
      },
    });

    if (!lastCategory || !lastCategory.code) {
      return "CAT001";
    }

    const match = lastCategory.code.match(/^CAT(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `CAT${nextNumber.toString().padStart(3, "0")}`;
    }

    const totalCategories = await this.prisma.itemCategory.count({
      where: { companyId, isDeleted: false },
    });
    return `CAT${(totalCategories + 1).toString().padStart(3, "0")}`;
  }

  /**
   * Check if a category is a descendant of another
   */
  private async isDescendant(
    ancestorId: string,
    descendantId: string,
    companyId: string
  ): Promise<boolean> {
    const children = await this.prisma.itemCategory.findMany({
      where: {
        parentId: ancestorId,
        companyId,
        isDeleted: false,
      },
      select: { id: true },
    });

    for (const child of children) {
      if (child.id === descendantId) {
        return true;
      }

      if (await this.isDescendant(child.id, descendantId, companyId)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Delete category (soft delete)
   */
  async deleteCategory(id: string, companyId: string): Promise<void> {
    const category = await this.prisma.itemCategory.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        _count: {
          select: {
            items: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Check if category has items
    if (category._count.items > 0) {
      throw new Error("Cannot delete category with existing items");
    }

    // Check if category has children
    if (category._count.children > 0) {
      throw new Error("Cannot delete category with subcategories");
    }

    await this.prisma.itemCategory.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Toggle category status
   */
  async toggleCategoryStatus(
    id: string,
    companyId: string
  ): Promise<ItemCategory> {
    const category = await this.prisma.itemCategory.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    return this.prisma.itemCategory.update({
      where: { id },
      data: { isActive: !category.isActive },
    });
  }

  /**
   * Move category to new parent
   */
  async moveCategory(
    id: string,
    companyId: string,
    newParentId: string | null
  ): Promise<ItemCategory> {
    const category = await this.prisma.itemCategory.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!category) {
      throw new Error("Category not found");
    }

    // Validate new parent exists if provided
    if (newParentId) {
      const parentCategory = await this.prisma.itemCategory.findFirst({
        where: {
          id: newParentId,
          companyId,
          isDeleted: false,
        },
      });

      if (!parentCategory) {
        throw new Error("New parent category not found");
      }

      // Prevent circular references
      if (newParentId === id) {
        throw new Error("Category cannot be its own parent");
      }

      // Check if the new parent is a descendant of this category
      const isDescendant = await this.isDescendant(id, newParentId, companyId);
      if (isDescendant) {
        throw new Error("Cannot move category to a descendant");
      }
    }

    return this.prisma.itemCategory.update({
      where: { id },
      data: { parentId: newParentId },
    });
  }
}

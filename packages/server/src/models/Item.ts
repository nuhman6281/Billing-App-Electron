import { PrismaClient, Item, ItemCategory, TaxCode } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";

export interface CreateItemInput {
  code: string;
  name: string;
  description?: string;
  categoryId: string;
  unit: string;
  basePrice: Decimal;
  sellingPrice: Decimal;
  costPrice: Decimal;
  wholesalePrice?: Decimal;
  retailPrice?: Decimal;
  minPrice?: Decimal;
  maxPrice?: Decimal;
  taxCodeId?: string;
  gstRate?: Decimal;
  cgstRate?: Decimal;
  sgstRate?: Decimal;
  igstRate?: Decimal;
  hsnCode?: string;
  isActive: boolean;
  companyId: string;
  createdBy: string;
  barcode?: string;
  sku?: string;
  weight?: Decimal;
  dimensions?: {
    length?: Decimal;
    width?: Decimal;
    height?: Decimal;
  };
  reorderPoint?: number;
  maxStock?: number;
  currentStock?: number;
  supplierId?: string;
  brand?: string;
  model?: string;
  warrantyPeriod?: number;
  warrantyUnit?: "DAYS" | "MONTHS" | "YEARS";
}

export interface UpdateItemInput {
  code?: string;
  name?: string;
  description?: string;
  categoryId?: string;
  unit?: string;
  basePrice?: Decimal;
  sellingPrice?: Decimal;
  costPrice?: Decimal;
  wholesalePrice?: Decimal;
  retailPrice?: Decimal;
  minPrice?: Decimal;
  maxPrice?: Decimal;
  taxCodeId?: string;
  gstRate?: Decimal;
  cgstRate?: Decimal;
  sgstRate?: Decimal;
  igstRate?: Decimal;
  hsnCode?: string;
  isActive?: boolean;
  barcode?: string;
  sku?: string;
  weight?: Decimal;
  dimensions?: {
    length?: Decimal;
    width?: Decimal;
    height?: Decimal;
  };
  reorderPoint?: number;
  maxStock?: number;
  currentStock?: number;
  supplierId?: string;
  brand?: string;
  model?: string;
  warrantyPeriod?: number;
  warrantyUnit?: "DAYS" | "MONTHS" | "YEARS";
}

export interface ItemFilters {
  search?: string;
  categoryId?: string;
  isActive?: boolean;
  supplierId?: string;
  taxCodeId?: string;
  minPrice?: Decimal;
  maxPrice?: Decimal;
  inStock?: boolean;
  limit?: number;
  offset?: number;
}

export interface ItemWithDetails extends Item {
  category: ItemCategory;
  taxCode?: TaxCode;
  supplier?: {
    id: string;
    name: string;
    code: string;
  };
  _count: {
    invoices: number;
    bills: number;
  };
}

export interface ItemStats {
  totalItems: number;
  activeItems: number;
  inactiveItems: number;
  lowStockItems: number;
  outOfStockItems: number;
  totalValue: Decimal;
  averagePrice: Decimal;
  categoryDistribution: Array<{
    categoryId: string;
    categoryName: string;
    count: number;
  }>;
}

export class ItemService {
  constructor(private prisma: PrismaClient) {}

  /**
   * Create a new item
   */
  async createItem(input: CreateItemInput): Promise<Item> {
    // Validate item code uniqueness within company
    const existingItem = await this.prisma.item.findFirst({
      where: {
        code: input.code,
        companyId: input.companyId,
        isDeleted: false,
      },
    });

    if (existingItem) {
      throw new Error(`Item code ${input.code} already exists in this company`);
    }

    // Validate SKU uniqueness if provided
    if (input.sku) {
      const existingSku = await this.prisma.item.findFirst({
        where: {
          sku: input.sku,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingSku) {
        throw new Error(`SKU ${input.sku} already exists in this company`);
      }
    }

    // Validate barcode uniqueness if provided
    if (input.barcode) {
      const existingBarcode = await this.prisma.item.findFirst({
        where: {
          barcode: input.barcode,
          companyId: input.companyId,
          isDeleted: false,
        },
      });

      if (existingBarcode) {
        throw new Error(
          `Barcode ${input.barcode} already exists in this company`
        );
      }
    }

    // Clean the input data to remove invalid fields and handle empty strings
    const cleanData = {
      code: input.code,
      name: input.name,
      description: input.description || null,
      sku: input.sku && input.sku.trim() !== "" ? input.sku : null,
      barcode:
        input.barcode && input.barcode.trim() !== "" ? input.barcode : null,
      itemType: input.itemType,
      categoryId:
        input.categoryId && input.categoryId.trim() !== ""
          ? input.categoryId
          : null,
      unitOfMeasure: input.unitOfMeasure,
      costPrice: input.costPrice || new Decimal(0),
      sellingPrice: input.sellingPrice || new Decimal(0),
      wholesalePrice: input.wholesalePrice || null,
      retailPrice: input.retailPrice || null,
      currentStock: input.currentStock || 0,
      minStock: input.minStock || 0,
      maxStock: input.maxStock || null,
      reorderPoint: input.reorderPoint || 0,
      gstRate: input.gstRate || new Decimal(0),
      cgstRate: input.cgstRate || new Decimal(0),
      sgstRate: input.sgstRate || new Decimal(0),
      igstRate: input.igstRate || new Decimal(0),
      manufacturer:
        input.manufacturer && input.manufacturer.trim() !== ""
          ? input.manufacturer
          : null,
      model: input.model && input.model.trim() !== "" ? input.model : null,
      batchNumber:
        input.batchNumber && input.batchNumber.trim() !== ""
          ? input.batchNumber
          : null,
      expiryDate:
        input.expiryDate && input.expiryDate.trim() !== ""
          ? new Date(input.expiryDate)
          : null,
      length:
        input.length && input.length.trim() !== ""
          ? new Decimal(input.length)
          : null,
      width:
        input.width && input.width.trim() !== ""
          ? new Decimal(input.width)
          : null,
      height:
        input.height && input.height.trim() !== ""
          ? new Decimal(input.height)
          : null,
      weight:
        input.weight && input.weight.trim() !== ""
          ? new Decimal(input.weight)
          : null,
      companyId: input.companyId,
      createdBy: input.createdBy,
      updatedBy: input.createdBy,
      isActive: true,
    };

    return this.prisma.item.create({
      data: cleanData,
    });
  }

  /**
   * Update an existing item
   */
  async updateItem(
    id: string,
    companyId: string,
    input: UpdateItemInput
  ): Promise<Item> {
    // Check if item exists and belongs to company
    const existingItem = await this.prisma.item.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
    });

    if (!existingItem) {
      throw new Error("Item not found");
    }

    // Validate code uniqueness if changing
    if (input.code && input.code !== existingItem.code) {
      const duplicateCode = await this.prisma.item.findFirst({
        where: {
          code: input.code,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateCode) {
        throw new Error(
          `Item code ${input.code} already exists in this company`
        );
      }
    }

    // Validate SKU uniqueness if changing
    if (input.sku && input.sku !== existingItem.sku) {
      const duplicateSku = await this.prisma.item.findFirst({
        where: {
          sku: input.sku,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateSku) {
        throw new Error(`SKU ${input.sku} already exists in this company`);
      }
    }

    // Validate barcode uniqueness if changing
    if (input.barcode && input.barcode !== existingItem.barcode) {
      const duplicateBarcode = await this.prisma.item.findFirst({
        where: {
          barcode: input.barcode,
          companyId,
          id: { not: id },
          isDeleted: false,
        },
      });

      if (duplicateBarcode) {
        throw new Error(
          `Barcode ${input.barcode} already exists in this company`
        );
      }
    }

    // Clean the input data for updates
    const cleanData: any = {};

    if (input.code !== undefined) cleanData.code = input.code;
    if (input.name !== undefined) cleanData.name = input.name;
    if (input.description !== undefined)
      cleanData.description = input.description || null;
    if (input.sku !== undefined)
      cleanData.sku = input.sku && input.sku.trim() !== "" ? input.sku : null;
    if (input.barcode !== undefined)
      cleanData.barcode =
        input.barcode && input.barcode.trim() !== "" ? input.barcode : null;
    if (input.itemType !== undefined) cleanData.itemType = input.itemType;
    if (input.categoryId !== undefined)
      cleanData.categoryId =
        input.categoryId && input.categoryId.trim() !== ""
          ? input.categoryId
          : null;
    if (input.unitOfMeasure !== undefined)
      cleanData.unitOfMeasure = input.unitOfMeasure;
    if (input.costPrice !== undefined) cleanData.costPrice = input.costPrice;
    if (input.sellingPrice !== undefined)
      cleanData.sellingPrice = input.sellingPrice;
    if (input.wholesalePrice !== undefined)
      cleanData.wholesalePrice = input.wholesalePrice;
    if (input.retailPrice !== undefined)
      cleanData.retailPrice = input.retailPrice;
    if (input.currentStock !== undefined)
      cleanData.currentStock = input.currentStock;
    if (input.minStock !== undefined) cleanData.minStock = input.minStock;
    if (input.maxStock !== undefined) cleanData.maxStock = input.maxStock;
    if (input.reorderPoint !== undefined)
      cleanData.reorderPoint = input.reorderPoint;
    if (input.gstRate !== undefined) cleanData.gstRate = input.gstRate;
    if (input.cgstRate !== undefined) cleanData.cgstRate = input.cgstRate;
    if (input.sgstRate !== undefined) cleanData.sgstRate = input.sgstRate;
    if (input.igstRate !== undefined) cleanData.igstRate = input.igstRate;
    if (input.manufacturer !== undefined)
      cleanData.manufacturer =
        input.manufacturer && input.manufacturer.trim() !== ""
          ? input.manufacturer
          : null;
    if (input.model !== undefined)
      cleanData.model =
        input.model && input.model.trim() !== "" ? input.model : null;
    if (input.batchNumber !== undefined)
      cleanData.batchNumber =
        input.batchNumber && input.batchNumber.trim() !== ""
          ? input.batchNumber
          : null;
    if (input.expiryDate !== undefined)
      cleanData.expiryDate =
        input.expiryDate && input.expiryDate.trim() !== ""
          ? new Date(input.expiryDate)
          : null;
    if (input.length !== undefined)
      cleanData.length =
        input.length && input.length.trim() !== ""
          ? new Decimal(input.length)
          : null;
    if (input.width !== undefined)
      cleanData.width =
        input.width && input.width.trim() !== ""
          ? new Decimal(input.width)
          : null;
    if (input.height !== undefined)
      cleanData.height =
        input.height && input.height.trim() !== ""
          ? new Decimal(input.height)
          : null;
    if (input.weight !== undefined)
      cleanData.weight =
        input.weight && input.weight.trim() !== ""
          ? new Decimal(input.weight)
          : null;
    if (input.isActive !== undefined) cleanData.isActive = input.isActive;
    if (input.updatedBy !== undefined) cleanData.updatedBy = input.updatedBy;

    return this.prisma.item.update({
      where: { id },
      data: cleanData,
    });
  }

  /**
   * Get item by ID with details
   */
  async getItemById(
    id: string,
    companyId: string
  ): Promise<ItemWithDetails | null> {
    return this.prisma.item.findFirst({
      where: {
        id,
        companyId,
        isDeleted: false,
      },
      include: {
        category: true,
        taxCode: true,
        supplier: {
          select: {
            id: true,
            name: true,
            code: true,
          },
        },
        _count: {
          select: {
            invoices: true,
            bills: true,
          },
        },
      },
    });
  }

  /**
   * Get items with filtering and pagination
   */
  async getItems(companyId: string, filters: ItemFilters = {}) {
    const {
      search,
      categoryId,
      isActive,
      supplierId,
      taxCodeId,
      minPrice,
      maxPrice,
      inStock,
      limit = 50,
      offset = 0,
    } = filters;

    const where: any = {
      companyId,
      isDeleted: false,
    };

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { sku: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (supplierId) {
      where.supplierId = supplierId;
    }

    if (taxCodeId) {
      where.taxCodeId = taxCodeId;
    }

    if (minPrice !== undefined) {
      where.sellingPrice = { gte: minPrice };
    }

    if (maxPrice !== undefined) {
      where.sellingPrice = { ...where.sellingPrice, lte: maxPrice };
    }

    if (inStock !== undefined) {
      if (inStock) {
        where.currentStock = { gt: 0 };
      } else {
        where.currentStock = { lte: 0 };
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.item.findMany({
        where,
        include: {
          category: true,
          taxCode: true,
          _count: {
            select: {
              invoiceItems: true,
              billItems: true,
            },
          },
        },
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
      this.prisma.item.count({ where }),
    ]);

    return {
      items,
      total,
      hasMore: offset + limit < total,
    };
  }

  /**
   * Get item statistics
   */
  async getItemStats(companyId: string): Promise<ItemStats> {
    const [
      totalItems,
      activeItems,
      inactiveItems,
      lowStockItems,
      outOfStockItems,
      totalValue,
      averagePrice,
      categoryDistribution,
    ] = await Promise.all([
      this.prisma.item.count({
        where: { companyId, isDeleted: false },
      }),
      this.prisma.item.count({
        where: { companyId, isActive: true, isDeleted: false },
      }),
      this.prisma.item.count({
        where: { companyId, isActive: false, isDeleted: false },
      }),
      this.prisma.item.count({
        where: {
          companyId,
          isDeleted: false,
          currentStock: { lte: this.prisma.item.fields.reorderPoint },
        },
      }),
      this.prisma.item.count({
        where: {
          companyId,
          isDeleted: false,
          currentStock: { lte: 0 },
        },
      }),
      this.prisma.item.aggregate({
        where: { companyId, isDeleted: false },
        _sum: {
          sellingPrice: true,
        },
      }),
      this.prisma.item.aggregate({
        where: { companyId, isDeleted: false },
        _avg: {
          sellingPrice: true,
        },
      }),
      this.prisma.item.groupBy({
        by: ["categoryId"],
        where: { companyId, isDeleted: false },
        _count: true,
      }),
    ]);

    // Get category names for distribution
    const categoryIds = categoryDistribution.map((item) => item.categoryId);
    const categories = await this.prisma.itemCategory.findMany({
      where: { id: { in: categoryIds } },
      select: { id: true, name: true },
    });

    const categoryMap = new Map(categories.map((cat) => [cat.id, cat.name]));

    return {
      totalItems,
      activeItems,
      inactiveItems,
      lowStockItems,
      outOfStockItems,
      totalValue: totalValue._sum.sellingPrice || new Decimal(0),
      averagePrice: averagePrice._avg.sellingPrice || new Decimal(0),
      categoryDistribution: categoryDistribution.map((item) => ({
        categoryId: item.categoryId,
        categoryName: categoryMap.get(item.categoryId) || "Unknown",
        count: item._count,
      })),
    };
  }

  /**
   * Get next available item code
   */
  async getNextItemCode(companyId: string): Promise<string> {
    const lastItem = await this.prisma.item.findFirst({
      where: {
        companyId,
        isDeleted: false,
      },
      orderBy: {
        code: "desc",
      },
      select: {
        code: true,
      },
    });

    if (!lastItem) {
      return "ITEM001";
    }

    const match = lastItem.code.match(/^ITEM(\d+)$/);
    if (match) {
      const nextNumber = parseInt(match[1]) + 1;
      return `ITEM${nextNumber.toString().padStart(3, "0")}`;
    }

    const totalItems = await this.prisma.item.count({
      where: { companyId, isDeleted: false },
    });
    return `ITEM${(totalItems + 1).toString().padStart(3, "0")}`;
  }

  /**
   * Update item stock
   */
  async updateStock(
    id: string,
    companyId: string,
    quantity: number,
    operation: "ADD" | "SUBTRACT" | "SET"
  ): Promise<Item> {
    const item = await this.prisma.item.findFirst({
      where: { id, companyId, isDeleted: false },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    let newStock: number;
    switch (operation) {
      case "ADD":
        newStock = Number(item.currentStock) + quantity;
        break;
      case "SUBTRACT":
        newStock = Number(item.currentStock) - quantity;
        if (newStock < 0) {
          throw new Error("Insufficient stock");
        }
        break;
      case "SET":
        newStock = quantity;
        break;
      default:
        throw new Error("Invalid operation");
    }

    return this.prisma.item.update({
      where: { id },
      data: { currentStock: newStock },
    });
  }

  /**
   * Delete item (soft delete)
   */
  async deleteItem(id: string, companyId: string): Promise<void> {
    const item = await this.prisma.item.findFirst({
      where: { id, companyId, isDeleted: false },
      include: {
        _count: {
          select: {
            invoices: true,
            bills: true,
          },
        },
      },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    // Check if item has any transactions
    if (item._count.invoices > 0 || item._count.bills > 0) {
      throw new Error("Cannot delete item with existing transactions");
    }

    await this.prisma.item.update({
      where: { id },
      data: {
        isDeleted: true,
        updatedAt: new Date(),
      },
    });
  }

  /**
   * Toggle item status
   */
  async toggleItemStatus(id: string, companyId: string): Promise<Item> {
    const item = await this.prisma.item.findFirst({
      where: { id, companyId, isDeleted: false },
    });

    if (!item) {
      throw new Error("Item not found");
    }

    return this.prisma.item.update({
      where: { id },
      data: { isActive: !item.isActive },
    });
  }
}

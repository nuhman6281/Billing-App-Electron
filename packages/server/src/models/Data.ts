import { PrismaClient } from "@prisma/client";
import { Decimal } from "@prisma/client/runtime/library";
import * as csv from "csv-parser";
import * as ExcelJS from "exceljs";
import { Readable } from "stream";

export interface ImportValidationResult {
  fileName: string;
  totalRows: number;
  validRows: number;
  invalidRows: number;
  errors: string[];
  preview: any[];
}

export interface ImportResult {
  success: boolean;
  importedCount: number;
  errors: string[];
  warnings: string[];
}

export interface ExportFilters {
  dateFrom?: Date;
  dateTo?: Date;
  status?: string;
  customerId?: string;
  vendorId?: string;
  accountId?: string;
}

export interface ExportDateRange {
  start: string;
  end: string;
}

export class DataService {
  constructor(private prisma: PrismaClient) {}

  async validateImportFile(
    file: Express.Multer.File,
    type: string,
    companyId: string
  ): Promise<ImportValidationResult> {
    const results: any[] = [];
    const errors: string[] = [];
    let totalRows = 0;
    let validRows = 0;

    try {
      if (file.mimetype === "text/csv") {
        await this.validateCSVFile(file, type, results, errors);
      } else {
        await this.validateExcelFile(file, type, results, errors);
      }

      totalRows = results.length;
      validRows = results.filter((row) => !row.hasErrors).length;

      // Generate preview (first 5 rows)
      const preview = results.slice(0, 5).map((row) => {
        const { hasErrors, errors: rowErrors, ...cleanRow } = row;
        return cleanRow;
      });

      return {
        fileName: file.originalname,
        totalRows,
        validRows,
        invalidRows: totalRows - validRows,
        errors,
        preview,
      };
    } catch (error) {
      throw new Error(`File validation failed: ${error}`);
    }
  }

  private async validateCSVFile(
    file: Express.Multer.File,
    type: string,
    results: any[],
    errors: string[]
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const stream = Readable.from(file.buffer);

      stream
        .pipe(csv())
        .on("data", (row) => {
          const validatedRow = this.validateRow(row, type);
          results.push(validatedRow);

          if (validatedRow.hasErrors) {
            errors.push(...validatedRow.errors);
          }
        })
        .on("end", () => resolve())
        .on("error", reject);
    });
  }

  private async validateExcelFile(
    file: Express.Multer.File,
    type: string,
    results: any[],
    errors: string[]
  ): Promise<void> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(file.buffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error("No worksheet found in Excel file");
    }

    const headers = this.getHeaders(worksheet);
    let isFirstRow = true;

    worksheet.eachRow((row, rowNumber) => {
      if (isFirstRow) {
        isFirstRow = false;
        return;
      }

      const rowData: any = {};
      headers.forEach((header, index) => {
        const cell = row.getCell(index + 1);
        rowData[header] = cell.value?.toString() || "";
      });

      const validatedRow = this.validateRow(rowData, type);
      results.push(validatedRow);

      if (validatedRow.hasErrors) {
        errors.push(...validatedRow.errors);
      }
    });
  }

  private getHeaders(worksheet: ExcelJS.Worksheet): string[] {
    const headers: string[] = [];
    const firstRow = worksheet.getRow(1);

    firstRow.eachCell((cell) => {
      headers.push(cell.value?.toString() || "");
    });

    return headers;
  }

  private validateRow(row: any, type: string): any {
    const errors: string[] = [];
    const validatedRow = { ...row, hasErrors: false, errors: [] };

    switch (type) {
      case "customers":
        this.validateCustomerRow(validatedRow, errors);
        break;
      case "vendors":
        this.validateVendorRow(validatedRow, errors);
        break;
      case "chart-of-accounts":
        this.validateAccountRow(validatedRow, errors);
        break;
      case "invoices":
        this.validateInvoiceRow(validatedRow, errors);
        break;
      case "bills":
        this.validateBillRow(validatedRow, errors);
        break;
      default:
        errors.push(`Unknown data type: ${type}`);
    }

    if (errors.length > 0) {
      validatedRow.hasErrors = true;
      validatedRow.errors = errors;
    }

    return validatedRow;
  }

  private validateCustomerRow(row: any, errors: string[]): void {
    if (!row.name || row.name.trim() === "") {
      errors.push("Customer name is required");
    }
    if (row.email && !this.isValidEmail(row.email)) {
      errors.push("Invalid email format");
    }
    if (row.creditLimit && isNaN(parseFloat(row.creditLimit))) {
      errors.push("Credit limit must be a valid number");
    }
  }

  private validateVendorRow(row: any, errors: string[]): void {
    if (!row.name || row.name.trim() === "") {
      errors.push("Vendor name is required");
    }
    if (row.email && !this.isValidEmail(row.email)) {
      errors.push("Invalid email format");
    }
  }

  private validateAccountRow(row: any, errors: string[]): void {
    if (!row.code || row.code.trim() === "") {
      errors.push("Account code is required");
    }
    if (!row.name || row.name.trim() === "") {
      errors.push("Account name is required");
    }
    if (
      !row.type ||
      !["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"].includes(row.type)
    ) {
      errors.push("Invalid account type");
    }
  }

  private validateInvoiceRow(row: any, errors: string[]): void {
    if (!row.number || row.number.trim() === "") {
      errors.push("Invoice number is required");
    }
    if (!row.customerId || row.customerId.trim() === "") {
      errors.push("Customer ID is required");
    }
    if (row.total && isNaN(parseFloat(row.total))) {
      errors.push("Total must be a valid number");
    }
  }

  private validateBillRow(row: any, errors: string[]): void {
    if (!row.number || row.number.trim() === "") {
      errors.push("Bill number is required");
    }
    if (!row.vendorId || row.vendorId.trim() === "") {
      errors.push("Vendor ID is required");
    }
    if (row.total && isNaN(parseFloat(row.total))) {
      errors.push("Total must be a valid number");
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  async importData(
    type: string,
    data: any[],
    companyId: string,
    userId: string
  ): Promise<ImportResult> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let importedCount = 0;

    try {
      switch (type) {
        case "customers":
          importedCount = await this.importCustomers(data, companyId, userId);
          break;
        case "vendors":
          importedCount = await this.importVendors(data, companyId, userId);
          break;
        case "chart-of-accounts":
          importedCount = await this.importAccounts(data, companyId, userId);
          break;
        case "invoices":
          importedCount = await this.importInvoices(data, companyId, userId);
          break;
        case "bills":
          importedCount = await this.importBills(data, companyId, userId);
          break;
        default:
          throw new Error(`Unsupported import type: ${type}`);
      }

      // Log import history
      await this.logImportHistory(type, importedCount, companyId, userId);

      return {
        success: true,
        importedCount,
        errors,
        warnings,
      };
    } catch (error: any) {
      errors.push(`Import failed: ${error.message}`);
      return {
        success: false,
        importedCount: 0,
        errors,
        warnings,
      };
    }
  }

  private async importCustomers(
    data: any[],
    companyId: string,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const row of data) {
      try {
        await this.prisma.customer.create({
          data: {
            code: row.code || this.generateCustomerCode(),
            name: row.name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            address: {
              street: row.street,
              city: row.city,
              state: row.state,
              zipCode: row.zipCode,
              country: row.country,
            },
            status: row.status || "ACTIVE",
            creditLimit: row.creditLimit
              ? new Decimal(row.creditLimit)
              : new Decimal(0),
            paymentTerms: row.paymentTerms || "Net 30",
            notes: row.notes,
            companyId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        importedCount++;
      } catch (error: any) {
        console.error(`Error importing customer ${row.name}:`, error);
      }
    }

    return importedCount;
  }

  private async importVendors(
    data: any[],
    companyId: string,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const row of data) {
      try {
        await this.prisma.vendor.create({
          data: {
            code: row.code || this.generateVendorCode(),
            name: row.name,
            email: row.email,
            phone: row.phone,
            company: row.company,
            address: {
              street: row.street,
              city: row.city,
              state: row.state,
              zipCode: row.zipCode,
              country: row.country,
            },
            status: row.status || "ACTIVE",
            paymentTerms: row.paymentTerms || "Net 30",
            notes: row.notes,
            taxId: row.taxId,
            website: row.website,
            contactPerson: row.contactPerson,
            companyId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        importedCount++;
      } catch (error: any) {
        console.error(`Error importing vendor ${row.name}:`, error);
      }
    }

    return importedCount;
  }

  private async importAccounts(
    data: any[],
    companyId: string,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const row of data) {
      try {
        await this.prisma.chartOfAccount.create({
          data: {
            code: row.code,
            name: row.name,
            type: row.type,
            category: row.category || "Other",
            description: row.description,
            parentId: row.parentId || null,
            isActive: row.isActive !== "false",
            companyId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        importedCount++;
      } catch (error: any) {
        console.error(`Error importing account ${row.code}:`, error);
      }
    }

    return importedCount;
  }

  private async importInvoices(
    data: any[],
    companyId: string,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const row of data) {
      try {
        await this.prisma.invoice.create({
          data: {
            number: row.number,
            customerId: row.customerId,
            date: new Date(row.date),
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            status: row.status || "DRAFT",
            subtotal: new Decimal(row.subtotal || 0),
            taxAmount: new Decimal(row.taxAmount || 0),
            discountAmount: new Decimal(row.discountAmount || 0),
            total: new Decimal(row.total || 0),
            notes: row.notes,
            terms: row.terms,
            companyId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        importedCount++;
      } catch (error: any) {
        console.error(`Error importing invoice ${row.number}:`, error);
      }
    }

    return importedCount;
  }

  private async importBills(
    data: any[],
    companyId: string,
    userId: string
  ): Promise<number> {
    let importedCount = 0;

    for (const row of data) {
      try {
        await this.prisma.bill.create({
          data: {
            number: row.number,
            vendorId: row.vendorId,
            date: new Date(row.date),
            dueDate: row.dueDate ? new Date(row.dueDate) : null,
            status: row.status || "DRAFT",
            subtotal: new Decimal(row.subtotal || 0),
            taxAmount: new Decimal(row.taxAmount || 0),
            discountAmount: new Decimal(row.discountAmount || 0),
            total: new Decimal(row.total || 0),
            notes: row.notes,
            terms: row.terms,
            companyId,
            createdBy: userId,
            updatedBy: userId,
          },
        });
        importedCount++;
      } catch (error: any) {
        console.error(`Error importing bill ${row.number}:`, error);
      }
    }

    return importedCount;
  }

  private generateCustomerCode(): string {
    return `CUST-${Date.now()}`;
  }

  private generateVendorCode(): string {
    return `VEND-${Date.now()}`;
  }

  async exportData(
    type: string,
    format: string,
    filters: ExportFilters,
    dateRange: ExportDateRange,
    companyId: string
  ): Promise<Buffer | string> {
    let data: any[] = [];

    switch (type) {
      case "customers":
        data = await this.exportCustomers(filters, dateRange, companyId);
        break;
      case "vendors":
        data = await this.exportVendors(filters, dateRange, companyId);
        break;
      case "invoices":
        data = await this.exportInvoices(filters, dateRange, companyId);
        break;
      case "bills":
        data = await this.exportBills(filters, dateRange, companyId);
        break;
      case "chart-of-accounts":
        data = await this.exportAccounts(filters, companyId);
        break;
      default:
        throw new Error(`Unsupported export type: ${type}`);
    }

    if (format === "csv") {
      return this.convertToCSV(data);
    } else if (format === "excel") {
      return await this.convertToExcel(data, type);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  }

  private async exportCustomers(
    filters: ExportFilters,
    dateRange: ExportDateRange,
    companyId: string
  ): Promise<any[]> {
    const where: any = { companyId, isDeleted: false };

    if (filters.status) {
      where.status = filters.status;
    }

    if (dateRange.start && dateRange.end) {
      where.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return this.prisma.customer.findMany({
      where,
      select: {
        code: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        creditLimit: true,
        paymentTerms: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  private async exportVendors(
    filters: ExportFilters,
    dateRange: ExportDateRange,
    companyId: string
  ): Promise<any[]> {
    const where: any = { companyId, isDeleted: false };

    if (filters.status) {
      where.status = filters.status;
    }

    if (dateRange.start && dateRange.end) {
      where.createdAt = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return this.prisma.vendor.findMany({
      where,
      select: {
        code: true,
        name: true,
        email: true,
        phone: true,
        company: true,
        status: true,
        paymentTerms: true,
        taxId: true,
        website: true,
        contactPerson: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  }

  private async exportInvoices(
    filters: ExportFilters,
    dateRange: ExportDateRange,
    companyId: string
  ): Promise<any[]> {
    const where: any = { companyId, isDeleted: false };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.customerId) {
      where.customerId = filters.customerId;
    }

    if (dateRange.start && dateRange.end) {
      where.date = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return this.prisma.invoice.findMany({
      where,
      include: {
        customer: {
          select: { name: true, code: true },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  private async exportBills(
    filters: ExportFilters,
    dateRange: ExportDateRange,
    companyId: string
  ): Promise<any[]> {
    const where: any = { companyId, isDeleted: false };

    if (filters.status) {
      where.status = filters.status;
    }

    if (filters.vendorId) {
      where.vendorId = filters.vendorId;
    }

    if (dateRange.start && dateRange.end) {
      where.date = {
        gte: new Date(dateRange.start),
        lte: new Date(dateRange.end),
      };
    }

    return this.prisma.bill.findMany({
      where,
      include: {
        vendor: {
          select: { name: true, code: true },
        },
      },
      orderBy: { date: "desc" },
    });
  }

  private async exportAccounts(
    filters: ExportFilters,
    companyId: string
  ): Promise<any[]> {
    const where: any = { companyId, isDeleted: false };

    if (filters.accountId) {
      where.id = filters.accountId;
    }

    return this.prisma.chartOfAccount.findMany({
      where,
      select: {
        code: true,
        name: true,
        type: true,
        category: true,
        description: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { code: "asc" },
    });
  }

  private convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0]);
    const csvRows = [headers.join(",")];

    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  private async convertToExcel(data: any[], type: string): Promise<Buffer> {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(type);

    if (data.length === 0) {
      return workbook.xlsx.writeBuffer() as Promise<Buffer>;
    }

    // Add headers
    const headers = Object.keys(data[0]);
    worksheet.addRow(headers);

    // Style headers
    const headerRow = worksheet.getRow(1);
    headerRow.font = { bold: true };
    headerRow.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE0E0E0" },
    };

    // Add data rows
    for (const row of data) {
      const values = headers.map((header) => {
        const value = row[header];
        if (value === null || value === undefined) return "";
        if (typeof value === "object") return JSON.stringify(value);
        return value;
      });
      worksheet.addRow(values);
    }

    // Auto-fit columns
    worksheet.columns.forEach((column) => {
      column.width = Math.max(
        column.width || 0,
        Math.max(...(column.values?.map((v) => String(v).length) || [0]))
      );
    });

    return workbook.xlsx.writeBuffer() as Promise<Buffer>;
  }

  async generateTemplate(type: string, companyId: string): Promise<string> {
    let headers: string[] = [];
    let sampleData: any[] = [];

    switch (type) {
      case "customers":
        headers = [
          "code",
          "name",
          "email",
          "phone",
          "company",
          "street",
          "city",
          "state",
          "zipCode",
          "country",
          "status",
          "creditLimit",
          "paymentTerms",
          "notes",
        ];
        sampleData = [
          {
            code: "CUST-001",
            name: "Sample Customer",
            email: "customer@example.com",
            phone: "+1-555-0123",
            company: "Sample Company Inc",
            street: "123 Main St",
            city: "Sample City",
            state: "CA",
            zipCode: "12345",
            country: "USA",
            status: "ACTIVE",
            creditLimit: "10000.00",
            paymentTerms: "Net 30",
            notes: "Sample customer for import",
          },
        ];
        break;
      case "vendors":
        headers = [
          "code",
          "name",
          "email",
          "phone",
          "company",
          "street",
          "city",
          "state",
          "zipCode",
          "country",
          "status",
          "paymentTerms",
          "notes",
          "taxId",
          "website",
          "contactPerson",
        ];
        sampleData = [
          {
            code: "VEND-001",
            name: "Sample Vendor",
            email: "vendor@example.com",
            phone: "+1-555-0456",
            company: "Sample Vendor Corp",
            street: "456 Vendor Ave",
            city: "Vendor City",
            state: "NY",
            zipCode: "67890",
            country: "USA",
            status: "ACTIVE",
            paymentTerms: "Net 30",
            notes: "Sample vendor for import",
            taxId: "12-3456789",
            website: "https://samplevendor.com",
            contactPerson: "John Vendor",
          },
        ];
        break;
      case "chart-of-accounts":
        headers = [
          "code",
          "name",
          "type",
          "category",
          "description",
          "parentId",
          "isActive",
        ];
        sampleData = [
          {
            code: "1000",
            name: "Cash",
            type: "ASSET",
            category: "Current Assets",
            description: "Cash on hand and in bank",
            parentId: "",
            isActive: "true",
          },
        ];
        break;
      default:
        headers = ["id", "name", "description"];
        sampleData = [
          { id: "1", name: "Sample Item", description: "Sample description" },
        ];
    }

    const csvRows = [headers.join(",")];
    for (const row of sampleData) {
      const values = headers.map((header) => `"${row[header] || ""}"`);
      csvRows.push(values.join(","));
    }

    return csvRows.join("\n");
  }

  private async logImportHistory(
    type: string,
    count: number,
    companyId: string,
    userId: string
  ): Promise<void> {
    try {
      await this.prisma.importHistory.create({
        data: {
          type,
          importedCount: count,
          companyId,
          importedBy: userId,
        },
      });
    } catch (error) {
      console.error("Error logging import history:", error);
    }
  }

  async getImportHistory(
    companyId: string,
    limit: number,
    offset: number
  ): Promise<any[]> {
    return this.prisma.importHistory.findMany({
      where: { companyId },
      include: {
        importedByUser: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async getExportHistory(
    companyId: string,
    limit: number,
    offset: number
  ): Promise<any[]> {
    return this.prisma.exportHistory.findMany({
      where: { companyId },
      include: {
        exportedByUser: {
          select: { displayName: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    });
  }
}

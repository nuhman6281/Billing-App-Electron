import { z } from "zod";

// ============================================================================
// ENUMS
// ============================================================================

export enum AccountType {
  ASSET = "ASSET",
  LIABILITY = "LIABILITY",
  EQUITY = "EQUITY",
  REVENUE = "REVENUE",
  EXPENSE = "EXPENSE",
}

export enum AccountCategory {
  // Assets
  CURRENT_ASSET = "CURRENT_ASSET",
  FIXED_ASSET = "FIXED_ASSET",
  INTANGIBLE_ASSET = "INTANGIBLE_ASSET",
  INVESTMENT = "INVESTMENT",

  // Liabilities
  CURRENT_LIABILITY = "CURRENT_LIABILITY",
  LONG_TERM_LIABILITY = "LONG_TERM_LIABILITY",

  // Equity
  OWNER_EQUITY = "OWNER_EQUITY",
  RETAINED_EARNINGS = "RETAINED_EARNINGS",

  // Revenue
  OPERATING_REVENUE = "OPERATING_REVENUE",
  NON_OPERATING_REVENUE = "NON_OPERATING_REVENUE",

  // Expenses
  OPERATING_EXPENSE = "OPERATING_EXPENSE",
  NON_OPERATING_EXPENSE = "NON_OPERATING_EXPENSE",
  COST_OF_GOODS_SOLD = "COST_OF_GOODS_SOLD",
}

export enum TransactionType {
  DEBIT = "DEBIT",
  CREDIT = "CREDIT",
}

export enum JournalEntryStatus {
  DRAFT = "DRAFT",
  POSTED = "POSTED",
  APPROVED = "APPROVED",
  VOIDED = "VOIDED",
}

export enum InvoiceStatus {
  DRAFT = "DRAFT",
  SENT = "SENT",
  VIEWED = "VIEWED",
  PAID = "PAID",
  OVERDUE = "OVERDUE",
  CANCELLED = "CANCELLED",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  PARTIAL = "PARTIAL",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum TaxType {
  VAT = "VAT",
  SALES_TAX = "SALES_TAX",
  GST = "GST",
  HST = "HST",
}

// ============================================================================
// BASE INTERFACES
// ============================================================================

export interface BaseDocument {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  documentNumber: string;
  reference?: string;
  notes?: string;
  attachments: string[];
  tags: string[];
}

// ============================================================================
// CHART OF ACCOUNTS
// ============================================================================

export interface ChartOfAccount {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  accountCode: string;
  accountName: string;
  accountType: AccountType;
  accountCategory: AccountCategory;
  parentAccountId?: string;
  description?: string;
  isActive: boolean;
  isSystem: boolean;
  openingBalance: number;
  currentBalance: number;
  currency: string;
  taxCode?: string;
  allowManualEntries: boolean;
  requireApproval: boolean;
  sortOrder: number;
  level: number;
  path: string[];
  children: ChartOfAccount[];
}

// ============================================================================
// JOURNAL ENTRIES
// ============================================================================

export interface JournalEntry extends BaseDocument {
  entryDate: Date;
  postingDate: Date;
  status: JournalEntryStatus;
  entryType: string;
  isRecurring: boolean;
  recurringPattern?: RecurringPattern;
  isReversed: boolean;
  reversedEntryId?: string;
  approvalStatus: string;
  approvedBy?: string;
  approvedAt?: Date;
  totalDebit: number;
  totalCredit: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  lines: JournalEntryLine[];
  auditTrail: AuditTrailEntry[];
}

export interface JournalEntryLine {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  accountId: string;
  account: ChartOfAccount;
  description: string;
  debitAmount: number;
  creditAmount: number;
  taxAmount: number;
  taxCode?: string;
  projectId?: string;
  costCenterId?: string;
  reference?: string;
  sortOrder: number;
}

export interface RecurringPattern {
  frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "YEARLY";
  interval: number;
  startDate: Date;
  endDate?: Date;
  maxOccurrences?: number;
  dayOfMonth?: number;
  dayOfWeek?: number;
  monthOfYear?: number;
}

// ============================================================================
// INVOICES & BILLS
// ============================================================================

export interface Invoice extends BaseDocument {
  invoiceNumber: string;
  invoiceDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  customerId: string;
  customer: Customer;
  billingAddress: Address;
  shippingAddress?: Address;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentTerms: string;
  terms?: string;
  items: InvoiceItem[];
  payments: Payment[];
  taxDetails: TaxDetail[];
}

export interface InvoiceItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  accountId: string;
  projectId?: string;
  costCenterId?: string;
}

export interface Bill extends BaseDocument {
  billNumber: string;
  billDate: Date;
  dueDate: Date;
  status: InvoiceStatus;
  vendorId: string;
  vendor: Vendor;
  currency: string;
  exchangeRate: number;
  subtotal: number;
  taxAmount: number;
  discountAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentTerms: string;
  purchaseOrderId?: string;
  receiptId?: string;
  items: BillItem[];
  payments: Payment[];
  taxDetails: TaxDetail[];
}

export interface BillItem {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  itemId?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discountPercent: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  accountId: string;
  projectId?: string;
  costCenterId?: string;
}

// ============================================================================
// CUSTOMERS & VENDORS
// ============================================================================

export interface Customer {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  customerNumber: string;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  taxId?: string;
  creditLimit: number;
  paymentTerms: string;
  defaultCurrency: string;
  isActive: boolean;
  notes?: string;
  tags: string[];
  addresses: Address[];
  contacts: Contact[];
  invoices: Invoice[];
  payments: Payment[];
  projects: Project[];
}

export interface Vendor {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  vendorNumber: string;
  companyName: string;
  contactName?: string;
  email: string;
  phone?: string;
  website?: string;
  taxId?: string;
  creditLimit: number;
  paymentTerms: string;
  defaultCurrency: string;
  isActive: boolean;
  notes?: string;
  tags: string[];
  addresses: Address[];
  contacts: Contact[];
  bills: Bill[];
  payments: Payment[];
}

export interface Address {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  type: string;
  street1: string;
  street2?: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
}

export interface Contact {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  mobile?: string;
  title?: string;
  department?: string;
  isPrimary: boolean;
}

// ============================================================================
// PAYMENTS
// ============================================================================

export interface Payment {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  paymentNumber: string;
  paymentDate: Date;
  amount: number;
  currency: string;
  exchangeRate: number;
  baseCurrencyAmount: number;
  paymentMethod: string;
  status: PaymentStatus;
  reference?: string;
  notes?: string;
  invoiceIds: string[];
  billIds: string[];
  customerId?: string;
  vendorId?: string;
  bankAccountId?: string;
  transactionId?: string;
  attachments: string[];
  processedAt?: Date;
  failedAt?: Date;
  failureReason?: string;
}

// ============================================================================
// TAX & FINANCIAL
// ============================================================================

export interface TaxDetail {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  taxCode: string;
  taxRate: number;
  taxableAmount: number;
  taxAmount: number;
  isCompound: boolean;
}

export interface TaxCode {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  code: string;
  name: string;
  rate: number;
  taxType: TaxType;
  isCompound: boolean;
  isRecoverable: boolean;
  isActive: boolean;
  description?: string;
  effectiveFrom: Date;
  effectiveTo?: Date;
}

// ============================================================================
// PROJECTS & COST CENTERS
// ============================================================================

export interface Project {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  projectNumber: string;
  name: string;
  description?: string;
  startDate: Date;
  endDate?: Date;
  status: string;
  customerId?: string;
  customer?: Customer;
  budget: number;
  actualCost: number;
  estimatedRevenue: number;
  actualRevenue: number;
  managerId: string;
  teamMembers: string[];
  isActive: boolean;
  notes?: string;
  attachments: string[];
}

export interface CostCenter {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  code: string;
  name: string;
  description?: string;
  parentId?: string;
  parent?: CostCenter;
  managerId?: string;
  budget: number;
  actualCost: number;
  isActive: boolean;
  sortOrder: number;
  level: number;
  path: string[];
  children: CostCenter[];
}

// ============================================================================
// AUDIT & TRACKING
// ============================================================================

export interface AuditTrailEntry {
  id: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  isDeleted: boolean;
  version: number;
  entityType: string;
  entityId: string;
  action: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  sessionId?: string;
}

// ============================================================================
// ZOD SCHEMAS FOR VALIDATION
// ============================================================================

export const ChartOfAccountSchema: z.ZodType<any> = z.object({
  id: z.string().uuid(),
  accountCode: z.string().min(1),
  accountName: z.string().min(1),
  accountType: z.nativeEnum(AccountType),
  accountCategory: z.nativeEnum(AccountCategory),
  parentAccountId: z.string().uuid().optional(),
  description: z.string().optional(),
  isActive: z.boolean(),
  isSystem: z.boolean(),
  openingBalance: z.number(),
  currentBalance: z.number(),
  currency: z.string().length(3),
  taxCode: z.string().optional(),
  allowManualEntries: z.boolean(),
  requireApproval: z.boolean(),
  sortOrder: z.number(),
  level: z.number(),
  path: z.array(z.string()),
  children: z.array(z.lazy(() => ChartOfAccountSchema)),
});

export const JournalEntrySchema = z.object({
  id: z.string().uuid(),
  documentNumber: z.string().min(1),
  entryDate: z.date(),
  postingDate: z.date(),
  status: z.nativeEnum(JournalEntryStatus),
  entryType: z.string(),
  isRecurring: z.boolean(),
  isReversed: z.boolean(),
  totalDebit: z.number().positive(),
  totalCredit: z.number().positive(),
  currency: z.string().length(3),
  exchangeRate: z.number().positive(),
  baseCurrencyAmount: z.number(),
  lines: z.array(
    z.object({
      accountId: z.string().uuid(),
      description: z.string(),
      debitAmount: z.number().min(0),
      creditAmount: z.number().min(0),
      taxAmount: z.number().min(0),
      sortOrder: z.number(),
    })
  ),
});

export const InvoiceSchema = z.object({
  id: z.string().uuid(),
  invoiceNumber: z.string().min(1),
  invoiceDate: z.date(),
  dueDate: z.date(),
  status: z.nativeEnum(InvoiceStatus),
  customerId: z.string().uuid(),
  currency: z.string().length(3),
  exchangeRate: z.number().positive(),
  subtotal: z.number().min(0),
  taxAmount: z.number().min(0),
  discountAmount: z.number().min(0),
  totalAmount: z.number().positive(),
  items: z.array(
    z.object({
      description: z.string().min(1),
      quantity: z.number().positive(),
      unitPrice: z.number().positive(),
      lineTotal: z.number().positive(),
    })
  ),
});

// ============================================================================
// UTILITY TYPES
// ============================================================================

export type CreateChartOfAccountInput = Omit<
  ChartOfAccount,
  keyof BaseDocument | "children"
>;
export type UpdateChartOfAccountInput = Partial<CreateChartOfAccountInput>;

export type CreateJournalEntryInput = Omit<
  JournalEntry,
  keyof BaseDocument | "lines" | "attachments" | "auditTrail"
> & {
  lines: Omit<JournalEntryLine, keyof BaseDocument>[];
};

export type CreateInvoiceInput = Omit<
  Invoice,
  keyof BaseDocument | "items" | "payments" | "taxDetails" | "attachments"
> & {
  items: Omit<InvoiceItem, keyof BaseDocument>[];
};

export type CreateCustomerInput = Omit<
  Customer,
  keyof BaseDocument | "addresses" | "contacts" | "attachments"
> & {
  addresses: Omit<Address, keyof BaseDocument>[];
  contacts: Omit<Contact, keyof BaseDocument>[];
};

export type CreateVendorInput = Omit<
  Vendor,
  keyof BaseDocument | "addresses" | "contacts" | "attachments"
> & {
  addresses: Omit<Address, keyof BaseDocument>[];
  contacts: Omit<Contact, keyof BaseDocument>[];
};

export type CreatePaymentInput = Omit<
  Payment,
  keyof BaseDocument | "attachments"
>;

export type CreateProjectInput = Omit<
  Project,
  keyof BaseDocument | "attachments"
>;

export type CreateCostCenterInput = Omit<
  CostCenter,
  keyof BaseDocument | "children"
>;

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

export interface ErrorResponse {
  success: false;
  message: string;
  errors?: string[];
  code?: string;
}

// ============================================================================
// FILTER & QUERY TYPES
// ============================================================================

export interface BaseFilter {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
}

export interface ChartOfAccountFilter extends BaseFilter {
  accountType?: AccountType;
  accountCategory?: AccountCategory;
  isActive?: boolean;
  parentAccountId?: string;
}

export interface JournalEntryFilter extends BaseFilter {
  status?: JournalEntryStatus;
  entryType?: string;
  startDate?: Date;
  endDate?: Date;
  isRecurring?: boolean;
}

export interface InvoiceFilter extends BaseFilter {
  status?: InvoiceStatus;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  minAmount?: number;
  maxAmount?: number;
}

export interface CustomerFilter extends BaseFilter {
  isActive?: boolean;
  hasOutstandingBalance?: boolean;
  creditLimit?: number;
}

export interface VendorFilter extends BaseFilter {
  isActive?: boolean;
  hasOutstandingBalance?: boolean;
  creditLimit?: number;
}

// ============================================================================
// FINANCIAL CALCULATION TYPES
// ============================================================================

export interface FinancialSummary {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
}

export interface AgingReport {
  current: number;
  days30: number;
  days60: number;
  days90: number;
  over90: number;
  total: number;
}

export interface CashFlowSummary {
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  beginningCashBalance: number;
  endingCashBalance: number;
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export interface ExportOptions {
  format: "pdf" | "excel" | "csv";
  includeCharts?: boolean;
  dateRange?: {
    start: Date;
    end: Date;
  };
  filters?: Record<string, any>;
}

export interface ReportTemplate {
  id: string;
  name: string;
  description?: string;
  parameters: ReportParameter[];
  isActive: boolean;
}

export interface ReportParameter {
  name: string;
  type: "string" | "number" | "date" | "boolean" | "select";
  required: boolean;
  defaultValue?: any;
  options?: string[];
  validation?: string;
}

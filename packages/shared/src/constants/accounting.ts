// ============================================================================
// ACCOUNTING CONSTANTS
// ============================================================================

export interface AccountingPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  isClosed: boolean;
}

export interface TaxRate {
  id: string;
  name: string;
  rate: number;
  description: string;
  isActive: boolean;
}

export const DEFAULT_ACCOUNTING_PERIODS: AccountingPeriod[] = [
  {
    id: 'Q1',
    name: 'Q1 (Jan-Mar)',
    startDate: new Date(new Date().getFullYear(), 0, 1),
    endDate: new Date(new Date().getFullYear(), 2, 31),
    isActive: true,
    isClosed: false
  },
  {
    id: 'Q2',
    name: 'Q2 (Apr-Jun)',
    startDate: new Date(new Date().getFullYear(), 3, 1),
    endDate: new Date(new Date().getFullYear(), 5, 30),
    isActive: true,
    isClosed: false
  },
  {
    id: 'Q3',
    name: 'Q3 (Jul-Sep)',
    startDate: new Date(new Date().getFullYear(), 6, 1),
    endDate: new Date(new Date().getFullYear(), 8, 30),
    isActive: true,
    isClosed: false
  },
  {
    id: 'Q4',
    name: 'Q4 (Oct-Dec)',
    startDate: new Date(new Date().getFullYear(), 9, 1),
    endDate: new Date(new Date().getFullYear(), 11, 31),
    isActive: true,
    isClosed: false
  }
];

export const DEFAULT_TAX_RATES: TaxRate[] = [
  {
    id: 'VAT_20',
    name: 'VAT 20%',
    rate: 20.0,
    description: 'Standard VAT rate',
    isActive: true
  },
  {
    id: 'VAT_10',
    name: 'VAT 10%',
    rate: 10.0,
    description: 'Reduced VAT rate',
    isActive: true
  },
  {
    id: 'VAT_5',
    name: 'VAT 5%',
    rate: 5.0,
    description: 'Super reduced VAT rate',
    isActive: true
  },
  {
    id: 'SALES_TAX_8',
    name: 'Sales Tax 8%',
    rate: 8.0,
    description: 'Standard sales tax rate',
    isActive: true
  }
];

export const ACCOUNTING_CONSTANTS = {
  DEFAULT_CURRENCY: 'USD',
  DEFAULT_LANGUAGE: 'en-US',
  DEFAULT_TIMEZONE: 'UTC',
  FISCAL_YEAR_START_MONTH: 1, // January
  MAX_DECIMAL_PLACES: 2,
  ROUNDING_METHOD: 'HALF_UP' as const,
  DEFAULT_PAYMENT_TERMS: 'Net 30',
  DEFAULT_CREDIT_LIMIT: 0,
  MAX_INVOICE_AMOUNT: 999999999.99,
  MIN_INVOICE_AMOUNT: 0.01,
  MAX_QUANTITY: 999999.999,
  MIN_QUANTITY: 0.001
};

export const PAYMENT_TERMS = [
  'Net 0',
  'Net 7',
  'Net 15',
  'Net 30',
  'Net 45',
  'Net 60',
  'Net 90',
  'Due on Receipt',
  'Due on Invoice',
  'End of Month',
  'End of Next Month'
];

export const INVOICE_STATUSES = [
  'DRAFT',
  'SENT',
  'VIEWED',
  'PAID',
  'OVERDUE',
  'CANCELLED',
  'VOIDED'
] as const;

export const JOURNAL_ENTRY_STATUSES = [
  'DRAFT',
  'POSTED',
  'APPROVED',
  'VOIDED',
  'REVERSED'
] as const;

export const ACCOUNT_TYPES = [
  'ASSET',
  'LIABILITY',
  'EQUITY',
  'REVENUE',
  'EXPENSE'
] as const;

export const ACCOUNT_CATEGORIES = [
  'CURRENT_ASSET',
  'FIXED_ASSET',
  'INTANGIBLE_ASSET',
  'INVESTMENT',
  'CURRENT_LIABILITY',
  'LONG_TERM_LIABILITY',
  'OWNER_EQUITY',
  'RETAINED_EARNINGS',
  'OPERATING_REVENUE',
  'NON_OPERATING_REVENUE',
  'OPERATING_EXPENSE',
  'NON_OPERATING_EXPENSE',
  'COST_OF_GOODS_SOLD'
] as const;

export const getAccountingPeriodById = (id: string): AccountingPeriod | undefined => {
  return DEFAULT_ACCOUNTING_PERIODS.find(period => period.id === id);
};

export const getTaxRateById = (id: string): TaxRate | undefined => {
  return DEFAULT_TAX_RATES.find(tax => tax.id === id);
};

export const getActiveTaxRates = (): TaxRate[] => {
  return DEFAULT_TAX_RATES.filter(tax => tax.isActive);
};

export const getActiveAccountingPeriods = (): AccountingPeriod[] => {
  return DEFAULT_ACCOUNTING_PERIODS.filter(period => period.isActive);
};

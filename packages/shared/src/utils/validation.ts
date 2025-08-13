import { z } from "zod";

// ============================================================================
// COMMON VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates an email address format
 */
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validates a phone number format (basic international format)
 */
export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^\+?[\d\s\-\(\)]{7,20}$/;
  return phoneRegex.test(phone);
};

/**
 * Validates a URL format
 */
export const isValidUrl = (url: string): boolean => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

/**
 * Validates a currency code (3-letter ISO format)
 */
export const isValidCurrency = (currency: string): boolean => {
  const currencyRegex = /^[A-Z]{3}$/;
  return currencyRegex.test(currency);
};

/**
 * Validates a postal code format
 */
export const isValidPostalCode = (postalCode: string): boolean => {
  const postalCodeRegex = /^[\dA-Z\s\-]{3,10}$/i;
  return postalCodeRegex.test(postalCode);
};

/**
 * Validates a tax ID format
 */
export const isValidTaxId = (taxId: string): boolean => {
  const taxIdRegex = /^[\dA-Z\-\s]{8,20}$/i;
  return taxIdRegex.test(taxId);
};

/**
 * Validates a credit card number (Luhn algorithm)
 */
export const isValidCreditCard = (cardNumber: string): boolean => {
  const cleanNumber = cardNumber.replace(/\s/g, "");
  if (!/^\d{13,19}$/.test(cleanNumber)) return false;

  let sum = 0;
  let isEven = false;

  for (let i = cleanNumber.length - 1; i >= 0; i--) {
    let digit = parseInt(cleanNumber[i] || "0");

    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }

    sum += digit;
    isEven = !isEven;
  }

  return sum % 10 === 0;
};

/**
 * Validates a bank account number
 */
export const isValidBankAccount = (accountNumber: string): boolean => {
  const accountRegex = /^[\d\-\s]{8,20}$/;
  return accountRegex.test(accountNumber);
};

/**
 * Validates a routing number (US format)
 */
export const isValidRoutingNumber = (routingNumber: string): boolean => {
  const routingRegex = /^\d{9}$/;
  if (!routingRegex.test(routingNumber)) return false;

  // ABA routing number validation
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  let sum = 0;

  for (let i = 0; i < 9; i++) {
    const digit = routingNumber[i];
    const weight = weights[i];
    if (digit && weight !== undefined) {
      sum += parseInt(digit) * weight;
    }
  }

  return sum % 10 === 0;
};

/**
 * Validates a social security number (US format)
 */
export const isValidSSN = (ssn: string): boolean => {
  const ssnRegex = /^\d{3}-\d{2}-\d{4}$/;
  return ssnRegex.test(ssn);
};

/**
 * Validates a date is not in the future
 */
export const isNotFutureDate = (date: Date): boolean => {
  return date <= new Date();
};

/**
 * Validates a date is not in the past
 */
export const isNotPastDate = (date: Date): boolean => {
  return date >= new Date();
};

/**
 * Validates a date range (start date before end date)
 */
export const isValidDateRange = (startDate: Date, endDate: Date): boolean => {
  return startDate < endDate;
};

/**
 * Validates a percentage value (0-100)
 */
export const isValidPercentage = (percentage: number): boolean => {
  return percentage >= 0 && percentage <= 100;
};

/**
 * Validates a positive number
 */
export const isPositiveNumber = (value: number): boolean => {
  return value > 0;
};

/**
 * Validates a non-negative number
 */
export const isNonNegativeNumber = (value: number): boolean => {
  return value >= 0;
};

/**
 * Validates a decimal precision (e.g., currency amounts)
 */
export const isValidDecimalPrecision = (
  value: number,
  precision: number = 2
): boolean => {
  const decimalPlaces = value.toString().split(".")[1]?.length || 0;
  return decimalPlaces <= precision;
};

/**
 * Validates a string length within range
 */
export const isValidStringLength = (
  value: string,
  min: number,
  max: number
): boolean => {
  return value.length >= min && value.length <= max;
};

/**
 * Validates a string contains only alphanumeric characters
 */
export const isAlphanumeric = (value: string): boolean => {
  const alphanumericRegex = /^[a-zA-Z0-9]+$/;
  return alphanumericRegex.test(value);
};

/**
 * Validates a string contains only letters and spaces
 */
export const isLettersAndSpaces = (value: string): boolean => {
  const lettersRegex = /^[a-zA-Z\s]+$/;
  return lettersRegex.test(value);
};

/**
 * Validates a string contains only numbers
 */
export const isNumbersOnly = (value: string): boolean => {
  const numbersRegex = /^\d+$/;
  return numbersRegex.test(value);
};

// ============================================================================
// BUSINESS LOGIC VALIDATION
// ============================================================================

/**
 * Validates that debit and credit amounts balance
 */
export const validateBalancedEntry = (
  debitTotal: number,
  creditTotal: number
): boolean => {
  return Math.abs(debitTotal - creditTotal) < 0.01; // Allow for rounding differences
};

/**
 * Validates that an account code follows the chart of accounts format
 */
export const isValidAccountCode = (accountCode: string): boolean => {
  const accountCodeRegex = /^[1-9]\d{0,3}(\.\d{1,3})*$/;
  return accountCodeRegex.test(accountCode);
};

/**
 * Validates that an invoice number follows the format
 */
export const isValidInvoiceNumber = (invoiceNumber: string): boolean => {
  const invoiceRegex = /^INV-\d{4}-\d{6}$/;
  return invoiceRegex.test(invoiceNumber);
};

/**
 * Validates that a bill number follows the format
 */
export const isValidBillNumber = (billNumber: string): boolean => {
  const billRegex = /^BILL-\d{4}-\d{6}$/;
  return billRegex.test(billNumber);
};

/**
 * Validates that a journal entry number follows the format
 */
export const isValidJournalEntryNumber = (entryNumber: string): boolean => {
  const entryRegex = /^JE-\d{4}-\d{6}$/;
  return entryRegex.test(entryNumber);
};

/**
 * Validates that a customer number follows the format
 */
export const isValidCustomerNumber = (customerNumber: string): boolean => {
  const customerRegex = /^CUST-\d{6}$/;
  return customerRegex.test(customerNumber);
};

/**
 * Validates that a vendor number follows the format
 */
export const isValidVendorNumber = (vendorNumber: string): boolean => {
  const vendorRegex = /^VEND-\d{6}$/;
  return vendorRegex.test(vendorNumber);
};

/**
 * Validates that a project number follows the format
 */
export const isValidProjectNumber = (projectNumber: string): boolean => {
  const projectRegex = /^PROJ-\d{4}-\d{4}$/;
  return projectRegex.test(projectNumber);
};

// ============================================================================
// COMPOSITE VALIDATION FUNCTIONS
// ============================================================================

/**
 * Validates a complete address
 */
export const validateAddress = (address: {
  street1: string;
  city: string;
  postalCode: string;
  country: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!address.street1.trim()) {
    errors.push("Street address is required");
  }

  if (!address.city.trim()) {
    errors.push("City is required");
  }

  if (!address.postalCode.trim()) {
    errors.push("Postal code is required");
  } else if (!isValidPostalCode(address.postalCode)) {
    errors.push("Invalid postal code format");
  }

  if (!address.country.trim()) {
    errors.push("Country is required");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates a complete contact information
 */
export const validateContact = (contact: {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
}): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!contact.firstName.trim()) {
    errors.push("First name is required");
  }

  if (!contact.lastName.trim()) {
    errors.push("Last name is required");
  }

  if (!contact.email.trim()) {
    errors.push("Email is required");
  } else if (!isValidEmail(contact.email)) {
    errors.push("Invalid email format");
  }

  if (contact.phone && !isValidPhone(contact.phone)) {
    errors.push("Invalid phone number format");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Validates financial amounts
 */
export const validateFinancialAmount = (
  amount: number,
  currency: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (!isNonNegativeNumber(amount)) {
    errors.push("Amount must be non-negative");
  }

  if (!isValidDecimalPrecision(amount, 2)) {
    errors.push("Amount cannot have more than 2 decimal places");
  }

  if (!isValidCurrency(currency)) {
    errors.push("Invalid currency code");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

// ============================================================================
// CUSTOM ZOD VALIDATORS
// ============================================================================

/**
 * Custom Zod validator for email addresses
 */
export const emailValidator = z.string().email("Invalid email format");

/**
 * Custom Zod validator for phone numbers
 */
export const phoneValidator = z
  .string()
  .refine(isValidPhone, "Invalid phone number format");

/**
 * Custom Zod validator for URLs
 */
export const urlValidator = z.string().refine(isValidUrl, "Invalid URL format");

/**
 * Custom Zod validator for currency codes
 */
export const currencyValidator = z
  .string()
  .refine(isValidCurrency, "Invalid currency code");

/**
 * Custom Zod validator for postal codes
 */
export const postalCodeValidator = z
  .string()
  .refine(isValidPostalCode, "Invalid postal code format");

/**
 * Custom Zod validator for tax IDs
 */
export const taxIdValidator = z
  .string()
  .refine(isValidTaxId, "Invalid tax ID format");

/**
 * Custom Zod validator for credit card numbers
 */
export const creditCardValidator = z
  .string()
  .refine(isValidCreditCard, "Invalid credit card number");

/**
 * Custom Zod validator for bank account numbers
 */
export const bankAccountValidator = z
  .string()
  .refine(isValidBankAccount, "Invalid bank account number");

/**
 * Custom Zod validator for routing numbers
 */
export const routingNumberValidator = z
  .string()
  .refine(isValidRoutingNumber, "Invalid routing number");

/**
 * Custom Zod validator for SSN
 */
export const ssnValidator = z.string().refine(isValidSSN, "Invalid SSN format");

/**
 * Custom Zod validator for account codes
 */
export const accountCodeValidator = z
  .string()
  .refine(isValidAccountCode, "Invalid account code format");

/**
 * Custom Zod validator for invoice numbers
 */
export const invoiceNumberValidator = z
  .string()
  .refine(isValidInvoiceNumber, "Invalid invoice number format");

/**
 * Custom Zod validator for bill numbers
 */
export const billNumberValidator = z
  .string()
  .refine(isValidBillNumber, "Invalid bill number format");

/**
 * Custom Zod validator for journal entry numbers
 */
export const journalEntryNumberValidator = z
  .string()
  .refine(isValidJournalEntryNumber, "Invalid journal entry number format");

/**
 * Custom Zod validator for customer numbers
 */
export const customerNumberValidator = z
  .string()
  .refine(isValidCustomerNumber, "Invalid customer number format");

/**
 * Custom Zod validator for vendor numbers
 */
export const vendorNumberValidator = z
  .string()
  .refine(isValidVendorNumber, "Invalid vendor number format");

/**
 * Custom Zod validator for project numbers
 */
export const projectNumberValidator = z
  .string()
  .refine(isValidProjectNumber, "Invalid project number format");

// ============================================================================
// VALIDATION HELPERS
// ============================================================================

/**
 * Sanitizes input by removing extra whitespace and special characters
 */
export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/\s+/g, " ");
};

/**
 * Formats a validation error message
 */
export const formatValidationError = (
  field: string,
  message: string
): string => {
  return `${field}: ${message}`;
};

/**
 * Combines multiple validation results
 */
export const combineValidationResults = (
  results: Array<{ isValid: boolean; errors: string[] }>
): { isValid: boolean; errors: string[] } => {
  const allErrors = results.flatMap((result) => result.errors);
  const isValid = results.every((result) => result.isValid);

  return {
    isValid,
    errors: allErrors,
  };
};

// Enum mapping utilities for converting between frontend display values and database enum values

export const accountCategoryMapping = {
  // Frontend display -> Database enum
  "Current Assets": "CURRENT_ASSETS",
  "Fixed Assets": "FIXED_ASSETS",
  "Current Liabilities": "CURRENT_LIABILITIES",
  "Long Term Liabilities": "LONG_TERM_LIABILITIES",
  Equity: "EQUITY",
  "Operating Revenue": "OPERATING_REVENUE",
  "Operating Expense": "OPERATING_EXPENSE",
  "Non Operating Revenue": "NON_OPERATING_REVENUE",
  "Non Operating Expense": "NON_OPERATING_EXPENSE",

  // Database enum -> Frontend display
  CURRENT_ASSETS: "Current Assets",
  FIXED_ASSETS: "Fixed Assets",
  CURRENT_LIABILITIES: "Current Liabilities",
  LONG_TERM_LIABILITIES: "Long Term Liabilities",
  EQUITY: "Equity",
  OPERATING_REVENUE: "Operating Revenue",
  OPERATING_EXPENSE: "Operating Expense",
  NON_OPERATING_REVENUE: "Non Operating Revenue",
  NON_OPERATING_EXPENSE: "Non Operating Expense",
} as const;

export const projectStatusMapping = {
  // Frontend display -> Database enum
  Planning: "PLANNING",
  Active: "ACTIVE",
  "On Hold": "ON_HOLD",
  Completed: "COMPLETED",
  Cancelled: "CANCELLED",

  // Database enum -> Frontend display
  PLANNING: "Planning",
  ACTIVE: "Active",
  ON_HOLD: "On Hold",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
} as const;

export const accountTypeMapping = {
  // Frontend display -> Database enum
  Asset: "ASSET",
  Liability: "LIABILITY",
  Equity: "EQUITY",
  Revenue: "REVENUE",
  Expense: "EXPENSE",

  // Database enum -> Frontend display
  ASSET: "Asset",
  LIABILITY: "Liability",
  EQUITY: "Equity",
  REVENUE: "Revenue",
  EXPENSE: "Expense",
} as const;

// Helper functions
export function mapToDatabase<
  T extends
    | keyof typeof accountCategoryMapping
    | keyof typeof projectStatusMapping
    | keyof typeof accountTypeMapping,
>(displayValue: string, mapping: Record<string, T>): T | null {
  return mapping[displayValue] || null;
}

export function mapToFrontend<
  T extends
    | keyof typeof accountCategoryMapping
    | keyof typeof projectStatusMapping
    | keyof typeof accountTypeMapping,
>(dbValue: T, mapping: Record<string, string>): string | null {
  return mapping[dbValue] || null;
}

// Specific mapping functions
export function mapAccountCategoryToDatabase(
  displayValue: string
): string | null {
  // Handle both display values and direct enum values
  const normalizedValue = displayValue.replace(/\s+/g, " ").trim();

  // First try exact match
  if (
    accountCategoryMapping[
      normalizedValue as keyof typeof accountCategoryMapping
    ]
  ) {
    return accountCategoryMapping[
      normalizedValue as keyof typeof accountCategoryMapping
    ];
  }

  // Then try case-insensitive match for common patterns
  const upperValue = normalizedValue.toUpperCase();
  if (upperValue === "CURRENT ASSETS") return "CURRENT_ASSETS";
  if (upperValue === "FIXED ASSETS") return "FIXED_ASSETS";
  if (upperValue === "CURRENT LIABILITIES") return "CURRENT_LIABILITIES";
  if (upperValue === "LONG TERM LIABILITIES") return "LONG_TERM_LIABILITIES";
  if (upperValue === "EQUITY") return "EQUITY";
  if (upperValue === "OPERATING REVENUE") return "OPERATING_REVENUE";
  if (upperValue === "OPERATING EXPENSE") return "OPERATING_EXPENSE";
  if (upperValue === "NON OPERATING REVENUE") return "NON_OPERATING_REVENUE";
  if (upperValue === "NON OPERATING EXPENSE") return "NON_OPERATING_EXPENSE";

  return null;
}

export function mapAccountCategoryToFrontend(dbValue: string): string | null {
  return (
    accountCategoryMapping[dbValue as keyof typeof accountCategoryMapping] ||
    null
  );
}

export function mapProjectStatusToDatabase(
  displayValue: string
): string | null {
  // Handle both display values and direct enum values
  const normalizedValue = displayValue.replace(/\s+/g, " ").trim();

  // First try exact match
  if (
    projectStatusMapping[normalizedValue as keyof typeof projectStatusMapping]
  ) {
    return projectStatusMapping[
      normalizedValue as keyof typeof projectStatusMapping
    ];
  }

  // Then try case-insensitive match for common patterns
  const upperValue = normalizedValue.toUpperCase();
  if (upperValue === "PLANNING") return "PLANNING";
  if (upperValue === "ACTIVE") return "ACTIVE";
  if (upperValue === "ON HOLD") return "ON_HOLD";
  if (upperValue === "COMPLETED") return "COMPLETED";
  if (upperValue === "CANCELLED") return "CANCELLED";

  return null;
}

export function mapProjectStatusToFrontend(dbValue: string): string | null {
  return (
    projectStatusMapping[dbValue as keyof typeof projectStatusMapping] || null
  );
}

export function mapAccountTypeToDatabase(displayValue: string): string | null {
  // Handle both display values and direct enum values
  const normalizedValue = displayValue.replace(/\s+/g, " ").trim();

  // First try exact match
  if (accountTypeMapping[normalizedValue as keyof typeof accountTypeMapping]) {
    return accountTypeMapping[
      normalizedValue as keyof typeof accountTypeMapping
    ];
  }

  // Then try case-insensitive match
  const upperValue = normalizedValue.toUpperCase();
  if (upperValue === "ASSET") return "ASSET";
  if (upperValue === "LIABILITY") return "LIABILITY";
  if (upperValue === "EQUITY") return "EQUITY";
  if (upperValue === "REVENUE") return "REVENUE";
  if (upperValue === "EXPENSE") return "EXPENSE";

  return null;
}

export function mapAccountTypeToFrontend(dbValue: string): string | null {
  return accountTypeMapping[dbValue as keyof typeof accountTypeMapping] || null;
}

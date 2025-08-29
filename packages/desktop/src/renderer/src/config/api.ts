// API Configuration
export const API_CONFIG = {
  BASE_URL: "http://localhost:3001/api", // Fixed: Removed process.env reference
  TIMEOUT: 30000,
  RETRY_ATTEMPTS: 3,
};

// Error types for better error handling
export interface ApiError {
  message: string;
  code?: string;
  status?: number;
  details?: any;
}

// Error codes mapping for user-friendly messages
export const ERROR_MESSAGES: Record<string, string> = {
  // Authentication errors
  INVALID_TOKEN: "Your session has expired. Please log in again.",
  TOKEN_EXPIRED: "Your session has expired. Please log in again.",
  UNAUTHORIZED: "You don't have permission to perform this action.",

  // Validation errors
  VALIDATION_ERROR: "Please check your input and try again.",
  MISSING_REQUIRED_FIELDS: "Please fill in all required fields.",
  DUPLICATE_ENTRY: "This item already exists. Please use a different value.",

  // Business logic errors
  INSUFFICIENT_FUNDS: "Insufficient funds for this transaction.",
  ACCOUNT_LOCKED: "This account is locked and cannot be modified.",
  INVALID_STATUS: "This action cannot be performed in the current status.",

  // Network errors
  NETWORK_ERROR:
    "Network connection error. Please check your internet connection.",
  TIMEOUT_ERROR: "Request timed out. Please try again.",
  SERVER_ERROR: "Server error. Please try again later.",

  // Default
  DEFAULT: "An unexpected error occurred. Please try again.",
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    LOGOUT: "/auth/logout",
    REFRESH: "/auth/refresh",
    VERIFY: "/auth/verify",
    PROFILE: "/auth/profile", // Added missing endpoint
  },
  USERS: {
    LIST: "/users",
    ROLES: "/users/roles",
    CREATE: "/users",
    UPDATE: "/users/:id",
    DELETE: "/users/:id",
    STATUS: "/users/:id/status",
  },
  ROLES: "/roles",
  COMPANIES: {
    LIST: "/companies",
  },
  CUSTOMERS: {
    LIST: "/customers",
    STATS: "/customers/stats",
    NEXT_CODE: "/customers/next-code",
  },
  VENDORS: {
    LIST: "/vendors",
    STATS: "/vendors/stats",
    NEXT_CODE: "/vendors/next-code",
  },
  CHART_OF_ACCOUNTS: {
    LIST: "/chart-of-accounts",
    STATS: "/chart-of-accounts/stats",
  },
  JOURNAL_ENTRIES: {
    LIST: "/journal-entries",
    STATS: "/journal-entries/stats",
    CREATE: "/journal-entries", // Added missing endpoint
    UPDATE: "/journal-entries/:id", // Added missing endpoint
    POST: "/journal-entries/:id/post", // Added missing endpoint
    VOID: "/journal-entries/:id/void", // Added missing endpoint
    DELETE: "/journal-entries/:id", // Added missing endpoint
  },
  INVOICES: {
    LIST: "/invoices",
    STATS: "/invoices/stats",
    NEXT_NUMBER: "/invoices/next-number",
    CREATE: "/invoices",
    UPDATE: "/invoices/:id",
    DELETE: "/invoices/:id",
    STATUS: "/invoices/:id/status",
  },
  BILLS: {
    LIST: "/bills",
    STATS: "/bills/stats",
    NEXT_NUMBER: "/bills/next-number",
    CREATE: "/bills",
    UPDATE: "/bills/:id",
    DELETE: "/bills/:id",
    STATUS: "/bills/:id/status",
  },
  PAYMENTS: {
    LIST: "/payments",
    STATS: "/payments/stats",
    CREATE: "/payments",
    UPDATE: "/payments/:id",
    DELETE: "/payments/:id",
    STATUS: "/payments/:id/status",
    RECONCILE: "/payments/:id/reconcile",
  },
  PROJECTS: {
    LIST: "/projects",
    STATS: "/projects/stats",
    CREATE: "/projects", // Added missing endpoint
    UPDATE: "/projects/:id", // Added missing endpoint
    DELETE: "/projects/:id", // Added missing endpoint
    EXPENSES: "/projects/:id/expenses",
    TIME: "/projects/:id/time",
  },
  SETTINGS: {
    COMPANY: "/settings/company", // Added missing endpoint
    FINANCIAL: "/settings/financial", // Added missing endpoint
    INTEGRATIONS: "/settings/integrations", // Added missing endpoint
    NOTIFICATIONS: "/settings/notifications", // Added missing endpoint
    SECURITY: "/settings/security", // Added missing endpoint
    BACKUP: "/settings/backup", // Added missing endpoint
  },
  DATA: {
    IMPORT_VALIDATE: "/data/import/validate",
    IMPORT: "/data/import",
    EXPORT: "/data/export",
    TEMPLATE: "/data/template",
    IMPORT_HISTORY: "/data/import/history",
    EXPORT_HISTORY: "/data/export/history",
  },
  REPORTS: {
    METRICS: "/reports/metrics",
    CHARTS: "/reports/charts",
    CASH_FLOW: "/reports/cash-flow",
    EXPORT: "/reports/export",
  },
  ITEMS: {
    LIST: "/items",
    STATS: "/items/stats",
    NEXT_CODE: "/items/next-code",
    CREATE: "/items",
    UPDATE: "/items/:id",
    DELETE: "/items/:id",
    STATUS: "/items/:id/status",
    STOCK: "/items/:id/stock",
  },
  ITEM_CATEGORIES: {
    LIST: "/item-categories",
    ROOT: "/item-categories/root",
    STATS: "/item-categories/stats",
    NEXT_CODE: "/item-categories/next-code",
    CREATE: "/item-categories",
    UPDATE: "/item-categories/:id",
    DELETE: "/item-categories/:id",
    STATUS: "/item-categories/:id/status",
    MOVE: "/item-categories/:id/move",
  },
  TAX_CODES: {
    LIST: "/tax-codes",
    STATS: "/tax-codes/stats",
    NEXT_CODE: "/tax-codes/next-code",
    CREATE: "/tax-codes",
    UPDATE: "/tax-codes/:id",
    DELETE: "/tax-codes/:id",
    STATUS: "/tax-codes/:id/status",
    CALCULATE: "/tax-codes/:id/calculate",
    BY_TYPE: "/tax-codes/type/:taxType",
    GST: "/tax-codes/gst",
  },
  DASHBOARD: {
    METRICS: "/dashboard/metrics",
    ACTIVITY: "/dashboard/activity",
  },
};

// Utility function to replace URL parameters
export const replaceUrlParams = (
  url: string,
  params: Record<string, string>
): string => {
  let result = url;
  Object.entries(params).forEach(([key, value]) => {
    result = result.replace(`:${key}`, value);
  });
  return result;
};

// API Utility Functions
export class ApiService {
  private static async refreshTokenIfNeeded(): Promise<string | null> {
    try {
      // Get stored refresh token
      const storedTokens = localStorage.getItem("auth_tokens");
      if (!storedTokens) return null;

      const tokens = JSON.parse(storedTokens);
      if (!tokens.refreshToken) return null;

      // Call refresh endpoint
      const response = await fetch(
        `${API_CONFIG.BASE_URL}${API_ENDPOINTS.AUTH.REFRESH}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken: tokens.refreshToken }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          // Update stored tokens
          const newTokens = {
            accessToken: data.data.accessToken,
            refreshToken: data.data.refreshToken,
          };
          localStorage.setItem("auth_tokens", JSON.stringify(newTokens));
          localStorage.setItem("token", data.data.accessToken);
          return data.data.accessToken;
        }
      }
    } catch (error) {
      console.error("Token refresh failed:", error);
    }
    return null;
  }

  private static getAuthHeaders(
    token: string | null,
    isFormData: boolean = false
  ) {
    const headers: Record<string, string> = {};

    if (!isFormData) {
      headers["Content-Type"] = "application/json";
    }

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    return headers;
  }

  private static async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      const errorData = await response
        .json()
        .catch(() => ({ message: "Network error" }));

      // Create structured error object
      const apiError: ApiError = {
        message: errorData.message || `HTTP ${response.status}`,
        code: errorData.code,
        status: response.status,
        details: errorData,
      };

      throw apiError;
    }

    // Check if response is a blob (file download)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/octet-stream")) {
      const blob = await response.blob();
      return { blob } as T;
    }

    return response.json();
  }

  private static async makeRequest<T>(
    method: string,
    endpoint: string,
    data?: any,
    token?: string | null,
    retryCount: number = 0
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const isFormData = data instanceof FormData;
    const headers = this.getAuthHeaders(token || null, isFormData);

    const requestOptions: RequestInit = {
      method,
      headers,
    };

    if (data && !isFormData) {
      requestOptions.body = JSON.stringify(data);
    } else if (data && isFormData) {
      requestOptions.body = data;
    }

    try {
      const response = await fetch(url, requestOptions);

      if (response.ok) {
        return this.handleResponse<T>(response);
      }

      // Handle authentication errors with token refresh
      if (response.status === 401 && retryCount === 0) {
        const errorData = await response.json().catch(() => ({}));

        if (
          errorData.code === "TOKEN_EXPIRED" ||
          errorData.code === "INVALID_TOKEN"
        ) {
          const newToken = await this.refreshTokenIfNeeded();
          if (newToken) {
            // Retry the request with new token
            return this.makeRequest<T>(
              method,
              endpoint,
              data,
              newToken,
              retryCount + 1
            );
          }
        }
      }

      // If we get here, the request failed
      const errorData = await response
        .json()
        .catch(() => ({ message: "Network error" }));

      const apiError: ApiError = {
        message: errorData.message || `HTTP ${response.status}`,
        code: errorData.code,
        status: response.status,
        details: errorData,
      };

      throw apiError;
    } catch (error) {
      if (error instanceof Error) {
        // If it's already an ApiError, re-throw it
        if ("code" in error && "status" in error) {
          throw error;
        }
        // Convert generic errors to ApiError
        throw {
          message: error.message,
          code: "UNKNOWN_ERROR",
          status: 0,
          details: error,
        } as ApiError;
      }
      throw {
        message: "Network error",
        code: "NETWORK_ERROR",
        status: 0,
        details: error,
      } as ApiError;
    }
  }

  static async get<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.makeRequest<T>("GET", endpoint, undefined, token);
  }

  static async post<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    return this.makeRequest<T>("POST", endpoint, data, token);
  }

  static async put<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    return this.makeRequest<T>("PUT", endpoint, data, token);
  }

  static async patch<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    return this.makeRequest<T>("PATCH", endpoint, data, token);
  }

  static async delete<T>(endpoint: string, token?: string | null): Promise<T> {
    return this.makeRequest<T>("DELETE", endpoint, undefined, token);
  }
}

// Utility function to get user-friendly error messages
export const getErrorMessage = (error: ApiError | Error | any): string => {
  if (error && typeof error === "object") {
    // If it's an ApiError with a code
    if (error.code && ERROR_MESSAGES[error.code]) {
      return ERROR_MESSAGES[error.code];
    }

    // If it has a message property
    if (error.message) {
      return error.message;
    }
  }

  return ERROR_MESSAGES.DEFAULT;
};

// Utility function to get error type for toast
export const getErrorType = (
  error: ApiError | Error | any
): "error" | "warning" | "info" => {
  if (error && typeof error === "object") {
    // Authentication errors are warnings (user needs to log in)
    if (
      error.code &&
      ["INVALID_TOKEN", "TOKEN_EXPIRED", "UNAUTHORIZED"].includes(error.code)
    ) {
      return "warning";
    }

    // Validation errors are info (user needs to fix input)
    if (
      error.code &&
      [
        "VALIDATION_ERROR",
        "MISSING_REQUIRED_FIELDS",
        "DUPLICATE_ENTRY",
      ].includes(error.code)
    ) {
      return "info";
    }
  }

  return "error";
};

// Convenience functions for common operations
export const api = {
  get: <T>(endpoint: string, token?: string | null) =>
    ApiService.get<T>(endpoint, token),
  post: <T>(endpoint: string, data: any, token?: string | null) =>
    ApiService.post<T>(endpoint, data, token),
  put: <T>(endpoint: string, data: any, token?: string | null) =>
    ApiService.put<T>(endpoint, data, token),
  patch: <T>(endpoint: string, data: any, token?: string | null) =>
    ApiService.patch<T>(endpoint, data, token),
  delete: <T>(endpoint: string, token?: string | null) =>
    ApiService.delete<T>(endpoint, token),
};

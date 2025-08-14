// API Configuration
export const API_CONFIG = {
  BASE_URL:
    process.env.NODE_ENV === "production"
      ? "https://your-production-domain.com/api"
      : "http://localhost:3001/api",
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
};

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/auth/login",
    REGISTER: "/auth/register",
    REFRESH: "/auth/refresh",
    LOGOUT: "/auth/logout",
    PROFILE: "/auth/profile",
  },
  DASHBOARD: {
    METRICS: "/dashboard/metrics",
    ACTIVITY: "/dashboard/activity",
  },
  INVOICES: {
    LIST: "/invoices",
    STATS: "/invoices/stats",
    NEXT_NUMBER: "/invoices/next-number",
  },
  BILLS: {
    LIST: "/bills",
    STATS: "/bills/stats",
    NEXT_NUMBER: "/bills/next-number",
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
  },
  PAYMENTS: {
    LIST: "/payments",
    STATS: "/payments/stats",
  },
  USERS: {
    LIST: "/users",
    ROLES: "/roles",
  },
  COMPANIES: {
    LIST: "/companies",
  },
  DATA: {
    IMPORT_VALIDATE: "/data/import/validate",
    IMPORT: "/data/import",
    EXPORT: "/data/export",
    TEMPLATE: "/data/template",
  },
  REPORTS: {
    METRICS: "/reports/metrics",
    CHARTS: "/reports/charts",
    CASH_FLOW: "/reports/cash-flow",
    EXPORT: "/reports/export",
  },
};

// API Utility Functions
export class ApiService {
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
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    // Check if response is a blob (file download)
    const contentType = response.headers.get("content-type");
    if (contentType && contentType.includes("application/octet-stream")) {
      const blob = await response.blob();
      return { blob } as T;
    }

    return response.json();
  }

  static async get<T>(endpoint: string, token?: string | null): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "GET",
      headers: this.getAuthHeaders(token || null),
    });

    return this.handleResponse<T>(response);
  }

  static async post<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;

    // Check if data is FormData
    const isFormData = data instanceof FormData;
    const headers = this.getAuthHeaders(token || null, isFormData);

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: isFormData ? data : JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  static async put<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "PUT",
      headers: this.getAuthHeaders(token || null),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  static async patch<T>(
    endpoint: string,
    data: any,
    token?: string | null
  ): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "PATCH",
      headers: this.getAuthHeaders(token || null),
      body: JSON.stringify(data),
    });

    return this.handleResponse<T>(response);
  }

  static async delete<T>(endpoint: string, token?: string | null): Promise<T> {
    const url = `${API_CONFIG.BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: "DELETE",
      headers: this.getAuthHeaders(token || null),
    });

    return this.handleResponse<T>(response);
  }
}

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

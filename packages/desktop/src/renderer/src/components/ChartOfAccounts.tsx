import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface ChartOfAccount {
  id: string;
  code: string;
  name: string;
  type: string; // Changed from enum to string to match backend response
  category: string;
  parentId?: string;
  description?: string;
  isActive: boolean;
  balance: string;
  children?: ChartOfAccount[];
  level: number;
}

interface ChartOfAccountStats {
  totalAccounts: number;
  activeAccounts: number;
  inactiveAccounts: number;
  totalBalance: string;
  assetBalance: string;
  liabilityBalance: string;
  equityBalance: string;
  revenueBalance: string;
  expenseBalance: string;
}

const accountTypes = [
  { value: "ASSET", label: "Asset", color: "bg-green-100 text-green-800" },
  { value: "LIABILITY", label: "Liability", color: "bg-red-100 text-red-800" },
  { value: "EQUITY", label: "Equity", color: "bg-blue-100 text-blue-800" },
  {
    value: "REVENUE",
    label: "Revenue",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "EXPENSE",
    label: "Expense",
    color: "bg-orange-100 text-orange-800",
  },
];

const accountCategories = {
  ASSET: [
    "Current Assets",
    "Fixed Assets",
    "Intangible Assets",
    "Other Assets",
  ],
  LIABILITY: [
    "Current Liabilities",
    "Long-term Liabilities",
    "Other Liabilities",
  ],
  EQUITY: [
    "Owner's Equity",
    "Retained Earnings",
    "Common Stock",
    "Preferred Stock",
  ],
  REVENUE: ["Operating Revenue", "Non-operating Revenue", "Other Income"],
  EXPENSE: [
    "Operating Expenses",
    "Cost of Goods Sold",
    "Administrative Expenses",
    "Other Expenses",
  ],
};

// Reverse mapping to convert backend display values to accountCategories keys
const getCategoryKeyFromDisplayValue = (
  displayValue: string
): keyof typeof accountCategories | null => {
  const mapping: Record<string, keyof typeof accountCategories> = {
    Asset: "ASSET",
    Liability: "LIABILITY",
    Equity: "EQUITY",
    Revenue: "REVENUE",
    Expense: "EXPENSE",
  };
  return mapping[displayValue] || null;
};

export default function ChartOfAccounts() {
  const { getAccessToken } = useAuth();
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [stats, setStats] = useState<ChartOfAccountStats>({
    totalAccounts: 0,
    activeAccounts: 0,
    inactiveAccounts: 0,
    totalBalance: "0.00",
    assetBalance: "0.00",
    liabilityBalance: "0.00",
    equityBalance: "0.00",
    revenueBalance: "0.00",
    expenseBalance: "0.00",
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ChartOfAccount | null>(
    null
  );
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    type: "ASSET" as string, // Changed from enum to string
    category: "",
    parentId: "",
    description: "",
    isActive: true,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("");
  const [expandedAccounts, setExpandedAccounts] = useState<Set<string>>(
    new Set()
  );
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAccounts();
    fetchStats();
  }, []);

  // Clear category when type changes to ensure proper category dropdown loading
  useEffect(() => {
    if (formData.type) {
      setFormData((prev) => ({ ...prev, category: "" }));
    }
  }, [formData.type]);

  const fetchAccounts = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.get<any>(
        API_ENDPOINTS.CHART_OF_ACCOUNTS.LIST,
        token
      );
      if (data.success && data.data) {
        const hierarchicalAccounts = buildAccountHierarchy(data.data);
        setAccounts(hierarchicalAccounts);
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
      setError("Failed to load accounts");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(
        API_ENDPOINTS.CHART_OF_ACCOUNTS.STATS,
        token
      );
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const buildAccountHierarchy = (
    flatAccounts: ChartOfAccount[]
  ): ChartOfAccount[] => {
    const accountMap = new Map<string, ChartOfAccount>();
    const rootAccounts: ChartOfAccount[] = [];

    // Create a map of all accounts
    flatAccounts.forEach((account) => {
      accountMap.set(account.id, { ...account, children: [], level: 0 });
    });

    // Build hierarchy
    flatAccounts.forEach((account) => {
      if (account.parentId && accountMap.has(account.parentId)) {
        const parent = accountMap.get(account.parentId)!;
        const child = accountMap.get(account.id)!;
        child.level = parent.level + 1;
        parent.children!.push(child);
      } else {
        rootAccounts.push(accountMap.get(account.id)!);
      }
    });

    return rootAccounts;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      if (editingAccount) {
        await api.put<any>(
          `/chart-of-accounts/${editingAccount.id}`,
          formData,
          token
        );
      } else {
        await api.post<any>("/chart-of-accounts", formData, token);
      }

      setIsModalOpen(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
      fetchStats();
    } catch (error) {
      console.error("Error saving account:", error);
      setError("Failed to save account");
    }
  };

  const handleDelete = async (accountId: string) => {
    if (!confirm("Are you sure you want to delete this account?")) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      await api.delete<any>(`/chart-of-accounts/${accountId}`, token);
      fetchAccounts();
      fetchStats();
    } catch (error) {
      console.error("Error deleting account:", error);
      setError("Failed to delete account");
    }
  };

  const handleEdit = (account: ChartOfAccount) => {
    setEditingAccount(account);

    // Map the account data to form data, ensuring proper format for dropdowns
    const mappedFormData = {
      code: account.code,
      name: account.name,
      type: account.type as string,
      category: account.category || "",
      parentId: account.parentId || "",
      description: account.description || "",
      isActive: account.isActive,
    };

    setFormData(mappedFormData);
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      type: "ASSET",
      category: "",
      parentId: "",
      description: "",
      isActive: true,
    });
  };

  const toggleExpanded = (accountId: string) => {
    const newExpanded = new Set(expandedAccounts);
    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId);
    } else {
      newExpanded.add(accountId);
    }
    setExpandedAccounts(newExpanded);
  };

  const filteredAccounts = accounts.filter((account) => {
    const matchesSearch =
      account.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      account.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || account.type === filterType;
    return matchesSearch && matchesType;
  });

  const renderAccountTree = (accountList: ChartOfAccount[], level = 0) => {
    return accountList.map((account) => (
      <div key={account.id} className="space-y-2">
        <div
          className={`flex items-center justify-between p-3 bg-white border rounded-lg hover:bg-gray-50 ${
            level > 0 ? `ml-${level * 4}` : ""
          }`}
        >
          <div className="flex items-center space-x-3">
            {account.children && account.children.length > 0 && (
              <button
                onClick={() => toggleExpanded(account.id)}
                className="text-gray-500 hover:text-gray-700"
              >
                {expandedAccounts.has(account.id) ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            )}
            <div className="flex items-center space-x-3">
              <span className="font-mono text-sm text-gray-600">
                {account.code}
              </span>
              <span className="font-medium">{account.name}</span>
              <Badge variant={account.isActive ? "default" : "secondary"}>
                {account.isActive ? "Active" : "Inactive"}
              </Badge>
              <Badge
                className={
                  accountTypes.find((t) => t.value === account.type)?.color
                }
              >
                {accountTypes.find((t) => t.value === account.type)?.label}
              </Badge>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              ${parseFloat(account.balance).toFixed(2)}
            </span>
            {/* Balance represents the current financial balance of this account */}
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEdit(account)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDelete(account.id)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {expandedAccounts.has(account.id) &&
          account.children &&
          account.children.length > 0 && (
            <div className="ml-6">
              {renderAccountTree(account.children, level + 1)}
            </div>
          )}
      </div>
    ));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Chart of Accounts
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage your financial accounts and their hierarchy
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Account
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Accounts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalAccounts}
            </div>
            <p className="text-xs text-gray-500">
              {stats.activeAccounts} active, {stats.inactiveAccounts} inactive
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              ${parseFloat(stats.totalBalance).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Net position</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Assets
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${parseFloat(stats.assetBalance).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Total assets</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Liabilities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              ${parseFloat(stats.liabilityBalance).toFixed(2)}
            </div>
            <p className="text-xs text-gray-500">Total liabilities</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              {accountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Accounts List */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {filteredAccounts.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No accounts found.{" "}
              {searchTerm || filterType
                ? "Try adjusting your filters."
                : "Create your first account to get started."}
            </div>
          ) : (
            <div className="space-y-2">
              {renderAccountTree(filteredAccounts)}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingAccount ? "Edit Account" : "Add New Account"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Code
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account Type
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      type: e.target.value as string,
                      category: "", // Reset category when type changes
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  {accountTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      category: e.target.value,
                    })
                  }
                  className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Select Category</option>
                  {(() => {
                    // In create mode, formData.type is already the enum key (e.g., "ASSET")
                    // In edit mode, it's the display value (e.g., "Asset")
                    let categoryKey: keyof typeof accountCategories | null;

                    if (editingAccount) {
                      // Edit mode: convert display value to enum key
                      categoryKey = getCategoryKeyFromDisplayValue(
                        formData.type
                      );
                    } else {
                      // Create mode: use the enum key directly
                      categoryKey =
                        formData.type as keyof typeof accountCategories;
                    }

                    if (!categoryKey || !accountCategories[categoryKey])
                      return null;

                    return accountCategories[categoryKey].map(
                      (category: string) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      )
                    );
                  })()}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Parent Account (Optional)
                </label>
                <select
                  value={formData.parentId}
                  onChange={(e) =>
                    setFormData({ ...formData, parentId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">No Parent</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.code} - {account.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label
                  htmlFor="isActive"
                  className="ml-2 block text-sm text-gray-900"
                >
                  Account is active
                </label>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingAccount(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingAccount ? "Update" : "Create"} Account
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

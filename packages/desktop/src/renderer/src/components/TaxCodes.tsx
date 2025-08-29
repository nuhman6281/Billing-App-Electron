import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface TaxCode {
  id: string;
  name: string;
  code: string;
  description?: string;
  taxType: "GST" | "VAT" | "SALES_TAX" | "EXCISE" | "CUSTOMS" | "OTHER";
  rate: number;
  isCompound: boolean;
  isRecoverable: boolean;
  effectiveFrom: string;
  effectiveTo?: string;
  thresholdAmount: number;
  exemptionLimit: number;
  accountId?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count?: {
    invoices: number;
    bills: number;
    items: number;
  };
  account?: {
    id: string;
    name: string;
    code: string;
  };
}

interface ChartOfAccount {
  id: string;
  name: string;
  code: string;
  type: string;
}

const TaxCodes: React.FC = () => {
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [accounts, setAccounts] = useState<ChartOfAccount[]>([]);
  const [selectedTaxCode, setSelectedTaxCode] = useState<TaxCode | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    taxType: "GST" as const,
    rate: "18",
    isCompound: false,
    isRecoverable: true,
    effectiveFrom: new Date().toISOString().split("T")[0],
    effectiveTo: "",
    thresholdAmount: "0",
    exemptionLimit: "0",
    accountId: "",
  });

  useEffect(() => {
    fetchTaxCodes();
    fetchAccounts();
  }, [currentPage, filterType]);

  const fetchTaxCodes = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const response = await api.get(API_ENDPOINTS.TAX_CODES.LIST, token);
      if (response?.data) {
        setTaxCodes(response.data.taxCodes || response.data);
        setTotalPages(
          Math.ceil(
            (response.data.total || response.data.length) / itemsPerPage
          )
        );
      }
    } catch (error) {
      console.error("Error fetching tax codes:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchAccounts = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await api.get(
        API_ENDPOINTS.CHART_OF_ACCOUNTS.LIST,
        token
      );
      if (response?.data) {
        // Filter for tax-related accounts (typically liability accounts)
        const taxAccounts = response.data.filter(
          (account: ChartOfAccount) =>
            account.type === "LIABILITY" ||
            account.name.toLowerCase().includes("tax")
        );
        setAccounts(taxAccounts);
      }
    } catch (error) {
      console.error("Error fetching accounts:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const taxCodeData = {
        ...formData,
        rate: parseFloat(formData.rate),
        thresholdAmount: parseFloat(formData.thresholdAmount),
        exemptionLimit: parseFloat(formData.exemptionLimit),
        effectiveTo: formData.effectiveTo || undefined,
      };

      if (selectedTaxCode) {
        // Update existing tax code
        const response = await makeRequest(
          API_ENDPOINTS.TAX_CODES.UPDATE(selectedTaxCode.id),
          taxCodeData,
          "PUT"
        );
        if (response.success) {
          setTaxCodes(
            taxCodes.map((tax) =>
              tax.id === selectedTaxCode.id ? response.data : tax
            )
          );
          handleCloseForm();
        }
      } else {
        // Create new tax code
        const response = await makeRequest(
          API_ENDPOINTS.TAX_CODES.CREATE,
          taxCodeData
        );
        if (response.success) {
          setTaxCodes([response.data, ...taxCodes]);
          handleCloseForm();
        }
      }
    } catch (error) {
      console.error("Error saving tax code:", error);
    }
  };

  const handleEdit = (taxCode: TaxCode) => {
    setSelectedTaxCode(taxCode);
    setFormData({
      name: taxCode.name,
      code: taxCode.code,
      description: taxCode.description || "",
      taxType: taxCode.taxType,
      rate: taxCode.rate.toString(),
      isCompound: taxCode.isCompound,
      isRecoverable: taxCode.isRecoverable,
      effectiveFrom: new Date(taxCode.effectiveFrom)
        .toISOString()
        .split("T")[0],
      effectiveTo: taxCode.effectiveTo
        ? new Date(taxCode.effectiveTo).toISOString().split("T")[0]
        : "",
      thresholdAmount: taxCode.thresholdAmount.toString(),
      exemptionLimit: taxCode.exemptionLimit.toString(),
      accountId: taxCode.accountId || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (taxCodeId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this tax code? This will affect all items and invoices using this tax code."
      )
    ) {
      try {
        const response = await makeRequest(
          API_ENDPOINTS.TAX_CODES.DELETE(taxCodeId),
          {},
          "DELETE"
        );
        if (response.success) {
          setTaxCodes(taxCodes.filter((tax) => tax.id !== taxCodeId));
        }
      } catch (error) {
        console.error("Error deleting tax code:", error);
      }
    }
  };

  const handleToggleStatus = async (
    taxCodeId: string,
    currentStatus: boolean
  ) => {
    try {
      const response = await makeRequest(
        API_ENDPOINTS.TAX_CODES.TOGGLE_STATUS(taxCodeId),
        {},
        "PATCH"
      );
      if (response.success) {
        setTaxCodes(
          taxCodes.map((tax) =>
            tax.id === taxCodeId ? { ...tax, isActive: !currentStatus } : tax
          )
        );
      }
    } catch (error) {
      console.error("Error toggling tax code status:", error);
    }
  };

  const handleCalculateTax = async (taxCodeId: string, amount: number) => {
    try {
      const response = await makeRequest(
        API_ENDPOINTS.TAX_CODES.CALCULATE(taxCodeId),
        {
          amount: amount,
        }
      );
      if (response.success) {
        alert(
          `Tax calculation for ₹${amount}:\nTax Amount: ₹${response.data.taxAmount}\nTotal: ₹${response.data.total}`
        );
      }
    } catch (error) {
      console.error("Error calculating tax:", error);
    }
  };

  const handleCloseForm = () => {
    setSelectedTaxCode(null);
    setIsFormOpen(false);
    setFormData({
      name: "",
      code: "",
      description: "",
      taxType: "GST",
      rate: "18",
      isCompound: false,
      isRecoverable: true,
      effectiveFrom: new Date().toISOString().split("T")[0],
      effectiveTo: "",
      thresholdAmount: "0",
      exemptionLimit: "0",
      accountId: "",
    });
  };

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc) => acc.id === accountId);
    return account ? `${account.code} - ${account.name}` : "Not Assigned";
  };

  const getTaxTypeColor = (taxType: string) => {
    const colors: Record<string, string> = {
      GST: "bg-blue-100 text-blue-800",
      VAT: "bg-green-100 text-green-800",
      SALES_TAX: "bg-purple-100 text-purple-800",
      EXCISE: "bg-orange-100 text-orange-800",
      CUSTOMS: "bg-red-100 text-red-800",
      OTHER: "bg-gray-100 text-gray-800",
    };
    return colors[taxType] || colors["OTHER"];
  };

  const filteredTaxCodes = taxCodes.filter((taxCode) => {
    const matchesSearch =
      taxCode.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      taxCode.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = !filterType || taxCode.taxType === filterType;

    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Tax Codes Management
        </h1>
        <button
          onClick={() => setIsFormOpen(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New Tax Code
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search tax codes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Tax Types</option>
            <option value="GST">GST</option>
            <option value="VAT">VAT</option>
            <option value="SALES_TAX">Sales Tax</option>
            <option value="EXCISE">Excise</option>
            <option value="CUSTOMS">Customs</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            onClick={fetchTaxCodes}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tax Codes Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type & Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Configuration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usage Stats
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTaxCodes.map((taxCode) => (
                <tr key={taxCode.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {taxCode.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Code: {taxCode.code}
                      </div>
                      {taxCode.description && (
                        <div className="text-sm text-gray-500">
                          {taxCode.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-2">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getTaxTypeColor(taxCode.taxType)}`}
                      >
                        {taxCode.taxType}
                      </span>
                      <span className="text-sm font-medium text-gray-900">
                        {taxCode.rate}%
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Effective:{" "}
                      {new Date(taxCode.effectiveFrom).toLocaleDateString()}
                      {taxCode.effectiveTo &&
                        ` - ${new Date(taxCode.effectiveTo).toLocaleDateString()}`}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Compound: {taxCode.isCompound ? "Yes" : "No"}
                      </div>
                      <div className="text-gray-500">
                        Recoverable: {taxCode.isRecoverable ? "Yes" : "No"}
                      </div>
                      <div className="text-gray-500">
                        Threshold: ₹{taxCode.thresholdAmount}
                      </div>
                      <div className="text-gray-500">
                        Exemption: ₹{taxCode.exemptionLimit}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getAccountName(taxCode.accountId)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Invoices: {taxCode._count?.invoices || 0}
                      </div>
                      <div className="text-gray-500">
                        Bills: {taxCode._count?.bills || 0}
                      </div>
                      <div className="text-gray-500">
                        Items: {taxCode._count?.items || 0}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        taxCode.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {taxCode.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex flex-col space-y-1">
                      <button
                        onClick={() => handleEdit(taxCode)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleCalculateTax(taxCode.id, 1000)}
                        className="text-green-600 hover:text-green-900"
                      >
                        Test Calc
                      </button>
                      <button
                        onClick={() =>
                          handleToggleStatus(taxCode.id, taxCode.isActive)
                        }
                        className={
                          taxCode.isActive
                            ? "text-orange-600 hover:text-orange-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        {taxCode.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(taxCode.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center mt-6">
          <nav className="flex space-x-2">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => setCurrentPage(page)}
                className={`px-3 py-2 rounded-lg ${
                  currentPage === page
                    ? "bg-blue-600 text-white"
                    : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {page}
              </button>
            ))}
          </nav>
        </div>
      )}

      {/* Tax Code Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedTaxCode ? "Edit Tax Code" : "Add New Tax Code"}
              </h2>
              <button
                onClick={handleCloseForm}
                className="text-gray-500 hover:text-gray-700"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Code Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Code *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Type *
                  </label>
                  <select
                    required
                    value={formData.taxType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        taxType: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="GST">GST (Goods and Services Tax)</option>
                    <option value="VAT">VAT (Value Added Tax)</option>
                    <option value="SALES_TAX">Sales Tax</option>
                    <option value="EXCISE">Excise Duty</option>
                    <option value="CUSTOMS">Customs Duty</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tax Rate (%) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.rate}
                    onChange={(e) =>
                      setFormData({ ...formData, rate: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Chart of Account
                  </label>
                  <select
                    value={formData.accountId}
                    onChange={(e) =>
                      setFormData({ ...formData, accountId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.code} - {account.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* Tax Configuration */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Tax Configuration
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isCompound"
                      checked={formData.isCompound}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isCompound: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isCompound"
                      className="text-sm font-medium text-gray-700"
                    >
                      Compound Tax (tax on tax)
                    </label>
                  </div>
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      id="isRecoverable"
                      checked={formData.isRecoverable}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isRecoverable: e.target.checked,
                        })
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label
                      htmlFor="isRecoverable"
                      className="text-sm font-medium text-gray-700"
                    >
                      Recoverable Tax
                    </label>
                  </div>
                </div>
              </div>

              {/* Effective Dates */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Effective Dates
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective From *
                    </label>
                    <input
                      type="date"
                      required
                      value={formData.effectiveFrom}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          effectiveFrom: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Effective To (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          effectiveTo: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Thresholds and Limits */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Thresholds and Limits
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Threshold Amount (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.thresholdAmount}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          thresholdAmount: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Minimum amount for tax to apply
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Exemption Limit (₹)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.exemptionLimit}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          exemptionLimit: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Amount below which tax is exempt
                    </p>
                  </div>
                </div>
              </div>

              {/* Form Actions */}
              <div className="flex justify-end space-x-3 pt-6 border-t">
                <button
                  type="button"
                  onClick={handleCloseForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {loading
                    ? "Saving..."
                    : selectedTaxCode
                      ? "Update Tax Code"
                      : "Create Tax Code"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaxCodes;

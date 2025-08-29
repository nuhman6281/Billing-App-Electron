import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS, replaceUrlParams } from "../config/api";

interface ItemCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
  sortOrder: number;
  taxRate: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  color?: string;
  createdAt: string;
  updatedAt: string;
  _count?: {
    items: number;
    children: number;
  };
  children?: ItemCategory[];
}

const ItemCategories: React.FC = () => {
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<ItemCategory | null>(
    null
  );
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterParent, setFilterParent] = useState("");
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
    parentId: "",
    sortOrder: "0",
    taxRate: "0",
    gstRate: "0",
    cgstRate: "0",
    sgstRate: "0",
    igstRate: "0",
    color: "#3B82F6",
  });

  useEffect(() => {
    fetchCategories();
  }, [currentPage, filterParent]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const response = await api.get(API_ENDPOINTS.ITEM_CATEGORIES.LIST, token);
      if (response?.data) {
        setCategories(response.data.categories || response.data);
        setTotalPages(
          Math.ceil(
            (response.data.total || response.data.length) / itemsPerPage
          )
        );
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const categoryData = {
        ...formData,
        parentId:
          formData.parentId && formData.parentId.trim() !== ""
            ? formData.parentId
            : null,
        sortOrder: parseInt(formData.sortOrder),
        taxRate: parseFloat(formData.taxRate),
        gstRate: parseFloat(formData.gstRate),
        cgstRate: parseFloat(formData.cgstRate),
        sgstRate: parseFloat(formData.sgstRate),
        igstRate: parseFloat(formData.igstRate),
      };

      if (selectedCategory) {
        // Update existing category
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.put(
          replaceUrlParams(API_ENDPOINTS.ITEM_CATEGORIES.UPDATE, {
            id: selectedCategory.id,
          }),
          categoryData,
          token
        );
        if (response?.data) {
          setCategories(
            categories.map((cat) =>
              cat.id === selectedCategory.id ? response.data : cat
            )
          );
          handleCloseForm();
        }
      } else {
        // Create new category
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.post(
          API_ENDPOINTS.ITEM_CATEGORIES.CREATE,
          categoryData,
          token
        );
        if (response?.data) {
          setCategories([response.data, ...categories]);
          handleCloseForm();
        }
      }
    } catch (error) {
      console.error("Error saving category:", error);
    }
  };

  const handleEdit = (category: ItemCategory) => {
    setSelectedCategory(category);
    setFormData({
      name: category.name,
      code: category.code,
      description: category.description || "",
      parentId: category.parentId || "",
      sortOrder: category.sortOrder.toString(),
      taxRate: category.taxRate.toString(),
      gstRate: category.gstRate.toString(),
      cgstRate: category.cgstRate.toString(),
      sgstRate: category.sgstRate.toString(),
      igstRate: category.igstRate.toString(),
      color: category.color || "#3B82F6",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this category? This will also affect all items in this category."
      )
    ) {
      try {
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.delete(
          replaceUrlParams(API_ENDPOINTS.ITEM_CATEGORIES.DELETE, {
            id: categoryId,
          }),
          token
        );
        if (response?.data) {
          setCategories(categories.filter((cat) => cat.id !== categoryId));
        }
      } catch (error) {
        console.error("Error deleting category:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    }
  };

  const handleToggleStatus = async (
    categoryId: string,
    currentStatus: boolean
  ) => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const response = await api.patch(
        replaceUrlParams(API_ENDPOINTS.ITEM_CATEGORIES.TOGGLE_STATUS, {
          id: categoryId,
        }),
        {},
        token
      );
      if (response?.data) {
        setCategories(
          categories.map((cat) =>
            cat.id === categoryId ? { ...cat, isActive: !currentStatus } : cat
          )
        );
      }
    } catch (error) {
      console.error("Error toggling category status:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    }
  };

  const handleCloseForm = () => {
    setSelectedCategory(null);
    setIsFormOpen(false);
    setFormData({
      name: "",
      code: "",
      description: "",
      parentId: "",
      sortOrder: "0",
      taxRate: "0",
      gstRate: "0",
      cgstRate: "0",
      sgstRate: "0",
      igstRate: "0",
      color: "#3B82F6",
    });
  };

  const getParentName = (parentId: string) => {
    const parent = categories.find((cat) => cat.id === parentId);
    return parent ? parent.name : "Root Category";
  };

  const getRootCategories = () => {
    return categories.filter((cat) => !cat.parentId);
  };

  const getChildCategories = (parentId: string) => {
    return categories.filter((cat) => cat.parentId === parentId);
  };

  const renderCategoryTree = (
    parentCategories: ItemCategory[],
    level: number = 0
  ) => {
    return parentCategories.map((category) => {
      const children = getChildCategories(category.id);
      const hasChildren = children.length > 0;

      return (
        <div key={category.id} className="border-l-2 border-gray-200 ml-4">
          <div
            className={`flex items-center justify-between p-3 bg-white rounded-lg shadow-sm mb-2 ${
              level === 0 ? "border-l-4 border-blue-500" : ""
            }`}
          >
            <div className="flex items-center space-x-3">
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: category.color || "#3B82F6" }}
              ></div>
              <div>
                <div className="font-medium text-gray-900">{category.name}</div>
                <div className="text-sm text-gray-500">
                  Code: {category.code}
                </div>
                {category.description && (
                  <div className="text-sm text-gray-500">
                    {category.description}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-1">
                  Items: {category._count?.items || 0} • Children:{" "}
                  {category._count?.children || 0} • Sort: {category.sortOrder}
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <span
                className={`px-2 py-1 text-xs rounded-full ${
                  category.isActive
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {category.isActive ? "Active" : "Inactive"}
              </span>
              <button
                onClick={() => handleEdit(category)}
                className="text-blue-600 hover:text-blue-900 text-sm"
              >
                Edit
              </button>
              <button
                onClick={() =>
                  handleToggleStatus(category.id, category.isActive)
                }
                className={`text-sm ${
                  category.isActive
                    ? "text-orange-600 hover:text-orange-900"
                    : "text-green-600 hover:text-green-900"
                }`}
              >
                {category.isActive ? "Deactivate" : "Activate"}
              </button>
              <button
                onClick={() => handleDelete(category.id)}
                className="text-red-600 hover:text-red-900 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
          {hasChildren && (
            <div className="ml-4">
              {renderCategoryTree(children, level + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const filteredCategories = categories.filter((category) => {
    const matchesSearch =
      category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      category.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesParent = !filterParent || category.parentId === filterParent;

    return matchesSearch && matchesParent;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Item Categories</h1>
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
          Add New Category
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <input
            type="text"
            placeholder="Search categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterParent}
            onChange={(e) => setFilterParent(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="">Root Categories Only</option>
            {categories
              .filter((cat) => !cat.parentId)
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
          <button
            onClick={fetchCategories}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Categories Tree View */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Category Hierarchy
        </h2>
        {getRootCategories().length > 0 ? (
          renderCategoryTree(getRootCategories())
        ) : (
          <div className="text-center py-8 text-gray-500">
            No categories found. Create your first category to get started.
          </div>
        )}
      </div>

      {/* Categories Table View */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden mt-6">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            All Categories
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Parent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax Rates
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stats
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
              {filteredCategories.map((category) => (
                <tr key={category.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: category.color || "#3B82F6" }}
                      ></div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {category.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          Code: {category.code}
                        </div>
                        {category.description && (
                          <div className="text-sm text-gray-500">
                            {category.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {category.parentId
                      ? getParentName(category.parentId)
                      : "Root Category"}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Tax: {category.taxRate}%
                      </div>
                      <div className="text-gray-500">
                        GST: {category.gstRate}%
                      </div>
                      <div className="text-gray-500">
                        CGST: {category.cgstRate}%
                      </div>
                      <div className="text-gray-500">
                        SGST: {category.sgstRate}%
                      </div>
                      {category.igstRate > 0 && (
                        <div className="text-gray-500">
                          IGST: {category.igstRate}%
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Items: {category._count?.items || 0}
                      </div>
                      <div className="text-gray-500">
                        Children: {category._count?.children || 0}
                      </div>
                      <div className="text-gray-500">
                        Sort: {category.sortOrder}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        category.isActive
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }`}
                    >
                      {category.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(category)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() =>
                          handleToggleStatus(category.id, category.isActive)
                        }
                        className={
                          category.isActive
                            ? "text-orange-600 hover:text-orange-900"
                            : "text-green-600 hover:text-green-900"
                        }
                      >
                        {category.isActive ? "Deactivate" : "Activate"}
                      </button>
                      <button
                        onClick={() => handleDelete(category.id)}
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

      {/* Category Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedCategory ? "Edit Category" : "Add New Category"}
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
                    Category Name *
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
                    Category Code *
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
                    Parent Category
                  </label>
                  <select
                    value={formData.parentId}
                    onChange={(e) =>
                      setFormData({ ...formData, parentId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Root Category (No Parent)</option>
                    {categories
                      .filter((cat) => cat.id !== selectedCategory?.id)
                      .map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({ ...formData, sortOrder: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    className="w-full h-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
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

              {/* Tax Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Tax Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tax Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.taxRate}
                      onChange={(e) =>
                        setFormData({ ...formData, taxRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      GST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.gstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, gstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.cgstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, cgstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.sgstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, sgstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IGST Rate (%)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.igstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, igstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
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
                    : selectedCategory
                      ? "Update Category"
                      : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ItemCategories;

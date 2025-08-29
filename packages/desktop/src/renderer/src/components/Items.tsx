import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS, replaceUrlParams } from "../config/api";

interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  itemType:
    | "PRODUCT"
    | "SERVICE"
    | "MATERIAL"
    | "EQUIPMENT"
    | "SOFTWARE"
    | "OTHER";
  categoryId?: string;
  unitOfMeasure: string;
  costPrice: number;
  sellingPrice: number;
  wholesalePrice?: number;
  retailPrice?: number;
  currentStock: number;
  minStock?: number;
  maxStock?: number;
  reorderPoint: number;
  gstRate: number;
  cgstRate: number;
  sgstRate: number;
  igstRate: number;
  isActive: boolean;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
    weight?: number;
  };
  manufacturer?: string;
  model?: string;
  batchNumber?: string;
  expiryDate?: string;
  createdAt: string;
  updatedAt: string;
}

interface ItemCategory {
  id: string;
  name: string;
  code: string;
  description?: string;
  parentId?: string;
  isActive: boolean;
}

interface TaxCode {
  id: string;
  name: string;
  code: string;
  taxType: "GST" | "VAT" | "SALES_TAX" | "EXCISE" | "CUSTOMS" | "OTHER";
  rate: number;
  isCompound: boolean;
  isRecoverable: boolean;
}

const Items: React.FC = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<ItemCategory[]>([]);
  const [taxCodes, setTaxCodes] = useState<TaxCode[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [itemsPerPage] = useState(20);

  const { getAccessToken } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    sku: "",
    barcode: "",
    itemType: "PRODUCT" as const,
    categoryId: "",
    unitOfMeasure: "PCS",
    costPrice: "0",
    sellingPrice: "0",
    wholesalePrice: "",
    retailPrice: "",
    currentStock: "0",
    minStock: "0",
    maxStock: "",
    reorderPoint: "0",
    gstRate: "18",
    cgstRate: "9",
    sgstRate: "9",
    igstRate: "0",
    manufacturer: "",
    model: "",
    batchNumber: "",
    expiryDate: "",
    length: "",
    width: "",
    height: "",
    weight: "",
  });

  useEffect(() => {
    fetchItems();
    fetchCategories();
    fetchTaxCodes();
  }, [currentPage, filterCategory, filterType]);

  const fetchItems = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const response = await api.get(API_ENDPOINTS.ITEMS.LIST, token);
      if (response?.data) {
        setItems(response.data.items || response.data);
        setTotalPages(
          Math.ceil(
            (response.data.total || response.data.length) / itemsPerPage
          )
        );
      }
    } catch (error) {
      console.error("Error fetching items:", error);
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await api.get(API_ENDPOINTS.ITEM_CATEGORIES.LIST, token);
      if (response?.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const fetchTaxCodes = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const response = await api.get(API_ENDPOINTS.TAX_CODES.LIST, token);
      if (response?.data) {
        setTaxCodes(response.data);
      }
    } catch (error) {
      console.error("Error fetching tax codes:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const itemData = {
        ...formData,
        categoryId:
          formData.categoryId && formData.categoryId.trim() !== ""
            ? formData.categoryId
            : null,
        costPrice: parseFloat(formData.costPrice),
        sellingPrice: parseFloat(formData.sellingPrice),
        wholesalePrice: formData.wholesalePrice
          ? parseFloat(formData.wholesalePrice)
          : undefined,
        retailPrice: formData.retailPrice
          ? parseFloat(formData.retailPrice)
          : undefined,
        currentStock: parseFloat(formData.currentStock),
        minStock: parseFloat(formData.minStock),
        maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
        reorderPoint: parseFloat(formData.reorderPoint),
        gstRate: parseFloat(formData.gstRate),
        cgstRate: parseFloat(formData.cgstRate),
        sgstRate: parseFloat(formData.sgstRate),
        igstRate: parseFloat(formData.igstRate),
        dimensions: {
          length: formData.length ? parseFloat(formData.length) : undefined,
          width: formData.width ? parseFloat(formData.width) : undefined,
          height: formData.height ? parseFloat(formData.height) : undefined,
          weight: formData.weight ? parseFloat(formData.weight) : undefined,
        },
      };

      if (selectedItem) {
        // Update existing item
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.put(
          replaceUrlParams(API_ENDPOINTS.ITEMS.UPDATE, { id: selectedItem.id }),
          itemData,
          token
        );
        if (response?.data) {
          setItems(
            items.map((item) =>
              item.id === selectedItem.id ? response.data : item
            )
          );
          handleCloseForm();
        }
      } else {
        // Create new item
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.post(
          API_ENDPOINTS.ITEMS.CREATE,
          itemData,
          token
        );
        if (response?.data) {
          setItems([response.data, ...items]);
          handleCloseForm();
        }
      }
    } catch (error) {
      console.error("Error saving item:", error);
    }
  };

  const handleEdit = (item: Item) => {
    setSelectedItem(item);
    setFormData({
      code: item.code,
      name: item.name,
      description: item.description || "",
      sku: item.sku || "",
      barcode: item.barcode || "",
      itemType: item.itemType,
      categoryId: item.categoryId || "",
      unitOfMeasure: item.unitOfMeasure,
      costPrice: item.costPrice.toString(),
      sellingPrice: item.sellingPrice.toString(),
      wholesalePrice: item.wholesalePrice?.toString() || "",
      retailPrice: item.retailPrice?.toString() || "",
      currentStock: item.currentStock.toString(),
      minStock: item.minStock?.toString() || "",
      maxStock: item.maxStock?.toString() || "",
      reorderPoint: item.reorderPoint.toString(),
      gstRate: item.gstRate.toString(),
      cgstRate: item.cgstRate.toString(),
      sgstRate: item.sgstRate.toString(),
      igstRate: item.igstRate.toString(),
      manufacturer: item.manufacturer || "",
      model: item.model || "",
      batchNumber: item.batchNumber || "",
      expiryDate: item.expiryDate || "",
      length: item.dimensions?.length?.toString() || "",
      width: item.dimensions?.width?.toString() || "",
      height: item.dimensions?.height?.toString() || "",
      weight: item.dimensions?.weight?.toString() || "",
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (itemId: string) => {
    if (window.confirm("Are you sure you want to delete this item?")) {
      try {
        const token = getAccessToken();
        if (!token) {
          setError("No authentication token available");
          return;
        }
        const response = await api.delete(
          replaceUrlParams(API_ENDPOINTS.ITEMS.DELETE, { id: itemId }),
          token
        );
        if (response?.data) {
          setItems(items.filter((item) => item.id !== itemId));
        }
      } catch (error) {
        console.error("Error deleting item:", error);
        setError(error instanceof Error ? error.message : "An error occurred");
      }
    }
  };

  const handleCloseForm = () => {
    setSelectedItem(null);
    setIsFormOpen(false);
    setFormData({
      code: "",
      name: "",
      description: "",
      sku: "",
      barcode: "",
      itemType: "PRODUCT",
      categoryId: "",
      unitOfMeasure: "PCS",
      costPrice: "0",
      sellingPrice: "0",
      wholesalePrice: "",
      retailPrice: "",
      currentStock: "0",
      minStock: "0",
      maxStock: "",
      reorderPoint: "0",
      gstRate: "18",
      cgstRate: "9",
      sgstRate: "9",
      igstRate: "0",
      manufacturer: "",
      model: "",
      batchNumber: "",
      expiryDate: "",
      length: "",
      width: "",
      height: "",
      weight: "",
    });
  };

  const handleStockUpdate = async (itemId: string, newQuantity: number) => {
    try {
      const response = await makeRequest(
        API_ENDPOINTS.ITEMS.UPDATE_STOCK(itemId),
        {
          quantity: newQuantity,
        },
        "PATCH"
      );

      if (response.success) {
        setItems(
          items.map((item) =>
            item.id === itemId ? { ...item, currentStock: newQuantity } : item
          )
        );
      }
    } catch (error) {
      console.error("Error updating stock:", error);
    }
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find((cat) => cat.id === categoryId);
    return category ? category.name : "Uncategorized";
  };

  const getTaxCodeName = (taxCodeId: string) => {
    const taxCode = taxCodes.find((tax) => tax.id === taxCodeId);
    return taxCode ? taxCode.name : "N/A";
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (item.barcode &&
        item.barcode.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory =
      !filterCategory || item.categoryId === filterCategory;
    const matchesType = !filterType || item.itemType === filterType;

    return matchesSearch && matchesCategory && matchesType;
  });

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900">
          Items & Stock Management
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
          Add New Item
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input
            type="text"
            placeholder="Search items, codes, barcodes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            <option value="PRODUCT">Product</option>
            <option value="SERVICE">Service</option>
            <option value="MATERIAL">Material</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="SOFTWARE">Software</option>
            <option value="OTHER">Other</option>
          </select>
          <button
            onClick={fetchItems}
            className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Items Table */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Item Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Pricing
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tax (GST)
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {item.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        Code: {item.code}
                      </div>
                      {item.barcode && (
                        <div className="text-sm text-gray-500">
                          Barcode: {item.barcode}
                        </div>
                      )}
                      {item.sku && (
                        <div className="text-sm text-gray-500">
                          SKU: {item.sku}
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">
                        Type: {item.itemType} • UOM: {item.unitOfMeasure}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {getCategoryName(item.categoryId)}
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">
                        Selling: ₹{item.sellingPrice}
                      </div>
                      <div className="text-gray-500">
                        Cost: ₹{item.costPrice}
                      </div>
                      {item.wholesalePrice && (
                        <div className="text-gray-500">
                          Wholesale: ₹{item.wholesalePrice}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div
                        className={`font-medium ${
                          item.currentStock <= (item.minStock || 0)
                            ? "text-red-600"
                            : "text-gray-900"
                        }`}
                      >
                        Stock: {item.currentStock}
                      </div>
                      <div className="text-gray-500">
                        Min: {item.minStock || 0}
                      </div>
                      {item.maxStock && (
                        <div className="text-gray-500">
                          Max: {item.maxStock}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <div className="text-gray-900">GST: {item.gstRate}%</div>
                      <div className="text-gray-500">
                        CGST: {item.cgstRate}%
                      </div>
                      <div className="text-gray-500">
                        SGST: {item.sgstRate}%
                      </div>
                      {item.igstRate > 0 && (
                        <div className="text-gray-500">
                          IGST: {item.igstRate}%
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEdit(item)}
                        className="text-blue-600 hover:text-blue-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(item.id)}
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

      {/* Item Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {selectedItem ? "Edit Item" : "Add New Item"}
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
                    Item Code *
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
                    Item Name *
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
                    SKU
                  </label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) =>
                      setFormData({ ...formData, sku: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Barcode
                  </label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) =>
                      setFormData({ ...formData, barcode: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Item Type *
                  </label>
                  <select
                    required
                    value={formData.itemType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        itemType: e.target.value as any,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PRODUCT">Product</option>
                    <option value="SERVICE">Service</option>
                    <option value="MATERIAL">Material</option>
                    <option value="EQUIPMENT">Equipment</option>
                    <option value="SOFTWARE">Software</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({ ...formData, categoryId: e.target.value })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Unit of Measure *
                  </label>
                  <select
                    required
                    value={formData.unitOfMeasure}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        unitOfMeasure: e.target.value,
                      })
                    }
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="PCS">Pieces</option>
                    <option value="KG">Kilograms</option>
                    <option value="LTR">Liters</option>
                    <option value="MTR">Meters</option>
                    <option value="BOX">Boxes</option>
                    <option value="PACK">Packs</option>
                    <option value="HOUR">Hours</option>
                    <option value="DAY">Days</option>
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

              {/* Pricing Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Pricing Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Cost Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.costPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, costPrice: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sellingPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          sellingPrice: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Wholesale Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.wholesalePrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          wholesalePrice: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Retail Price
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.retailPrice}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          retailPrice: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Stock Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Stock Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Current Stock *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.currentStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          currentStock: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Minimum Stock Level *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.minStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          minStock: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Stock Level
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.maxStock}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          maxStock: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Reorder Point *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.reorderPoint}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          reorderPoint: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Tax Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Tax Information (GST)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Total GST Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.gstRate}
                      onChange={(e) => {
                        const gstRate = parseFloat(e.target.value);
                        const halfRate = gstRate / 2;
                        setFormData({
                          ...formData,
                          gstRate: e.target.value,
                          cgstRate: halfRate.toString(),
                          sgstRate: halfRate.toString(),
                          igstRate: "0",
                        });
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      CGST Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.cgstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, cgstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SGST Rate *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formData.sgstRate}
                      onChange={(e) =>
                        setFormData({ ...formData, sgstRate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IGST Rate
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

              {/* Additional Information */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Additional Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Manufacturer
                    </label>
                    <input
                      type="text"
                      value={formData.manufacturer}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          manufacturer: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Model
                    </label>
                    <input
                      type="text"
                      value={formData.model}
                      onChange={(e) =>
                        setFormData({ ...formData, model: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Batch Number
                    </label>
                    <input
                      type="text"
                      value={formData.batchNumber}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          batchNumber: e.target.value,
                        })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      value={formData.expiryDate}
                      onChange={(e) =>
                        setFormData({ ...formData, expiryDate: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Dimensions */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Dimensions & Weight
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Length (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.length}
                      onChange={(e) =>
                        setFormData({ ...formData, length: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Width (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.width}
                      onChange={(e) =>
                        setFormData({ ...formData, width: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Height (cm)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.height}
                      onChange={(e) =>
                        setFormData({ ...formData, height: e.target.value })
                      }
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Weight (kg)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.weight}
                      onChange={(e) =>
                        setFormData({ ...formData, weight: e.target.value })
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
                    : selectedItem
                      ? "Update Item"
                      : "Create Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Items;

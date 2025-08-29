import React, { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  Send,
  CheckCircle,
  Clock,
  XCircle,
  Receipt,
  User,
  DollarSign,
  Calendar,
  FileText,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface BillItem {
  id?: string;
  itemId?: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountRate: string;
  total: string;
  item?: {
    id: string;
    code: string;
    name: string;
    costPrice: string;
    gstRate: string;
    cgstRate: string;
    sgstRate: string;
    igstRate: string;
  };
}

interface Vendor {
  id: string;
  name: string;
  code: string;
  email?: string;
  phone?: string;
}

interface Item {
  id: string;
  code: string;
  name: string;
  description?: string;
  costPrice: string;
  gstRate: string;
  cgstRate: string;
  sgstRate: string;
  igstRate: string;
  barcode?: string;
  sku?: string;
}

interface Bill {
  id: string;
  number: string;
  vendorId: string;
  date: string;
  dueDate?: string;
  status: "DRAFT" | "RECEIVED" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  notes?: string;
  terms?: string;
  vendor: {
    id: string;
    name: string;
    code: string;
    email?: string;
  };
  items: BillItem[];
  totalOutstanding: string;
  totalPaid: string;
  daysOverdue: number;
}

interface BillStats {
  totalBills: number;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  overdueAmount: string;
  overdueCount: number;
}

const Bills: React.FC = () => {
  const { getAccessToken } = useAuth();
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Auto-complete state
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [vendorSearchTerm, setVendorSearchTerm] = useState("");
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [filteredItems, setFilteredItems] = useState<Item[]>([]);

  // Per-item search state
  const [itemSearchStates, setItemSearchStates] = useState<{
    [key: number]: { term: string; showDropdown: boolean };
  }>({});

  // Barcode scanning state
  const [barcodeInput, setBarcodeInput] = useState("");
  const [showBarcodeInput, setShowBarcodeInput] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    number: "",
    vendorId: "",
    date: "",
    dueDate: "",
    status: "DRAFT" as "DRAFT" | "RECEIVED" | "PAID" | "OVERDUE" | "VOIDED",
    subtotal: "0",
    taxAmount: "0",
    discountAmount: "0",
    total: "0",
    notes: "",
    terms: "",
    items: [
      {
        itemId: "",
        description: "",
        quantity: "1",
        unitPrice: "0",
        taxRate: "0",
        discountRate: "0",
        total: "0",
      },
    ],
  });

  useEffect(() => {
    fetchBills();
    fetchStats();
    fetchVendors();
    fetchItems();
  }, []);

  useEffect(() => {
    // Filter vendors based on search term
    if (vendorSearchTerm.trim() === "") {
      setFilteredVendors([]);
    } else {
      const filtered = vendors.filter(
        (vendor) =>
          vendor.name.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
          vendor.code.toLowerCase().includes(vendorSearchTerm.toLowerCase()) ||
          vendor.email?.toLowerCase().includes(vendorSearchTerm.toLowerCase())
      );
      setFilteredVendors(filtered);
    }
  }, [vendorSearchTerm, vendors]);

  useEffect(() => {
    // Filter items based on search term - now handled per item
    setFilteredItems(items);
  }, [items]);

  // Debug useEffect to monitor form data changes
  useEffect(() => {
    console.log("Form data items changed:", formData.items);
    console.log(
      "Form data items details:",
      formData.items.map((item, index) => ({
        index,
        itemId: item.itemId,
        description: item.description,
        unitPrice: item.unitPrice,
        taxRate: item.taxRate,
      }))
    );
  }, [formData.items]);

  // Ref to prevent duplicate item selection calls
  const isSelectingItem = useRef(false);

  // Ref to prevent duplicate calculateTotals calls
  const isCalculatingTotals = useRef(false);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const data = await api.get<any>(API_ENDPOINTS.BILLS.LIST, token);
      setBills(data?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await api.get<any>(API_ENDPOINTS.BILLS.STATS, token);
      if (data?.data) setStats(data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const fetchVendors = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await api.get<any>(API_ENDPOINTS.VENDORS.LIST, token);
      setVendors(data?.data ?? []);
    } catch (err) {
      console.error("Failed to fetch vendors:", err);
    }
  };

  const fetchItems = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await api.get<any>(API_ENDPOINTS.ITEMS.LIST, token);
      setItems(data?.data ?? []);
    } catch (err) {
      console.error("Failed to fetch items:", err);
    }
  };

  const generateNextNumber = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await api.get<any>(API_ENDPOINTS.BILLS.NEXT_NUMBER, token);
      if (data?.data?.nextNumber) {
        setFormData((prev) => ({ ...prev, number: data.data.nextNumber }));
      }
    } catch (err) {
      console.error("Failed to generate number:", err);
    }
  };

  const calculateLineItemTotal = (item: BillItem) => {
    const quantity = parseFloat(item.quantity) || 0;
    const unitPrice = parseFloat(item.unitPrice) || 0;
    const taxRate = parseFloat(item.taxRate) || 0;
    const discountRate = parseFloat(item.discountRate) || 0;

    const itemSubtotal = quantity * unitPrice;
    const itemDiscount = (itemSubtotal * discountRate) / 100;
    const itemTax = ((itemSubtotal - itemDiscount) * taxRate) / 100;
    const itemTotal = itemSubtotal + itemTax - itemDiscount;

    return {
      itemSubtotal: itemSubtotal.toFixed(2),
      itemDiscount: itemDiscount.toFixed(2),
      itemTax: itemTax.toFixed(2),
      itemTotal: itemTotal.toFixed(2),
    };
  };

  const calculateTotals = (currentFormData?: typeof formData) => {
    // Prevent duplicate calls
    if (isCalculatingTotals.current) {
      console.log("calculateTotals already running, skipping duplicate call");
      return;
    }

    // Use passed form data or current state
    const dataToUse = currentFormData || formData;

    console.log("calculateTotals called with formData.items:", dataToUse.items);
    console.log("calculateTotals call stack:", new Error().stack);

    // Set flag to prevent duplicate calls
    isCalculatingTotals.current = true;

    let subtotal = 0;
    let totalTax = 0;
    let totalDiscount = 0;

    // Update line item totals and calculate overall totals
    const updatedItems = dataToUse.items.map((item) => {
      const quantity = parseFloat(item.quantity) || 0;
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const taxRate = parseFloat(item.taxRate) || 0;
      const discountRate = parseFloat(item.discountRate) || 0;

      const itemSubtotal = quantity * unitPrice;
      const itemDiscount = (itemSubtotal * discountRate) / 100;
      const itemTax = ((itemSubtotal - itemDiscount) * taxRate) / 100;
      const itemTotal = itemSubtotal + itemTax - itemDiscount;

      subtotal += itemSubtotal;
      totalTax += itemTax;
      totalDiscount += itemDiscount;

      return {
        ...item,
        total: itemTotal.toFixed(2),
      };
    });

    const total = subtotal + totalTax - totalDiscount;

    console.log("calculateTotals updating form data with items:", updatedItems);

    // Update both items and totals in a single call to preserve item selection
    // Use a more direct approach to avoid callback execution issues
    const newFormData = {
      ...dataToUse,
      items: updatedItems,
      subtotal: subtotal.toFixed(2),
      taxAmount: totalTax.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      total: total.toFixed(2),
    };

    console.log(
      "calculateTotals updating form data with new data:",
      newFormData
    );
    setFormData(newFormData);

    // Reset flag after a short delay to allow future calls
    setTimeout(() => {
      isCalculatingTotals.current = false;
      console.log("calculateTotals flag reset");
    }, 100);
  };

  const handleVendorSelect = (vendor: Vendor) => {
    setFormData((prev) => ({ ...prev, vendorId: vendor.id }));
    setVendorSearchTerm(vendor.name);
    setShowVendorDropdown(false);
  };

  const handleItemSelect = (item: Item, itemIndex: number) => {
    const callId = Math.random().toString(36).substr(2, 9);
    console.log(`handleItemSelect called [${callId}]:`, { item, itemIndex });
    console.log(`handleItemSelect call stack [${callId}]:`, new Error().stack);

    // Prevent duplicate calls using ref
    if (isSelectingItem.current) {
      console.log(
        `Already processing item selection, skipping duplicate call [${callId}]`
      );
      return;
    }

    // Prevent duplicate calls by checking if item is already selected
    if (formData.items[itemIndex]?.itemId === item.id) {
      console.log(`Item already selected, skipping duplicate call [${callId}]`);
      return;
    }

    // Set flag to prevent duplicate calls
    isSelectingItem.current = true;

    // Update the item in the form data using direct state update to avoid React Strict Mode issues
    const newItems = [...formData.items];
    newItems[itemIndex] = {
      ...newItems[itemIndex],
      itemId: item.id,
      description: item.name,
      unitPrice: item.costPrice,
      taxRate: item.gstRate,
    };

    const newFormData = { ...formData, items: newItems };

    console.log(`Previous form data [${callId}]:`, formData.items[itemIndex]);
    console.log(`Updated item [${callId}]:`, newItems[itemIndex]);

    setFormData(newFormData);

    // Clear search state for this specific item and close dropdown
    setItemSearchStates((prev) => ({
      ...prev,
      [itemIndex]: { term: "", showDropdown: false },
    }));

    // Calculate totals after state update with a longer delay to ensure state is stable
    setTimeout(() => {
      console.log(
        `About to call calculateTotals [${callId}], current form data:`,
        formData.items
      );
      // Pass the updated form data to calculateTotals to avoid stale closure issues
      const updatedFormData = { ...formData, items: newItems };
      calculateTotals(updatedFormData);
      // Reset flag after a short delay
      setTimeout(() => {
        isSelectingItem.current = false;
        console.log(`Item selection flag reset [${callId}]`);
      }, 100);
    }, 50);
  };

  const handleBarcodeScan = (barcode: string) => {
    const item = items.find((i) => i.barcode === barcode);
    if (item) {
      // Add item to the first empty slot or create a new one
      let itemIndex = formData.items.findIndex((i) => !i.description);
      if (itemIndex === -1) {
        itemIndex = formData.items.length;
        setFormData((prev) => ({
          ...prev,
          items: [
            ...prev.items,
            {
              itemId: "",
              description: "",
              quantity: "1",
              unitPrice: "0",
              taxRate: "0",
              discountRate: "0",
              total: "0",
            },
          ],
        }));
      }

      // Update the item
      const newItems = [...formData.items];
      newItems[itemIndex] = {
        ...newItems[itemIndex],
        itemId: item.id,
        description: item.name,
        unitPrice: item.costPrice,
        taxRate: item.gstRate,
      };

      setFormData({ ...formData, items: newItems });
      setBarcodeInput("");
      setShowBarcodeInput(false);
      calculateTotals();
    } else {
      setError(`Item with barcode ${barcode} not found`);
    }
  };

  const createBill = async () => {
    try {
      // Validate required fields
      if (!formData.number || !formData.vendorId || !formData.date) {
        setError("Please fill in all required fields (Number, Vendor, Date)");
        return;
      }

      // Validate items
      if (!formData.items || formData.items.length === 0) {
        setError("Bill must have at least one item");
        return;
      }

      // Validate item details
      for (let i = 0; i < formData.items.length; i++) {
        const item = formData.items[i];
        if (!item.description || !item.quantity || !item.unitPrice) {
          setError(
            `Item ${i + 1} is missing required fields (Description, Quantity, Unit Price)`
          );
          return;
        }
      }

      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.post<any>(API_ENDPOINTS.BILLS.LIST, formData, token);
      setShowCreateForm(false);
      setFormData({
        number: "",
        vendorId: "",
        date: "",
        dueDate: "",
        status: "DRAFT",
        subtotal: "0",
        taxAmount: "0",
        discountAmount: "0",
        total: "0",
        notes: "",
        terms: "",
        items: [
          {
            itemId: "",
            description: "",
            quantity: "1",
            unitPrice: "0",
            taxRate: "0",
            discountRate: "0",
            total: "0",
          },
        ],
      });
      fetchBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const updateBillStatus = async (id: string, status: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;
      await api.patch<any>(
        `${API_ENDPOINTS.BILLS.UPDATE}/${id}/status`,
        { status },
        token
      );
      fetchBills();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(parseFloat(amount) || 0);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <FileText className="w-4 h-4 mr-1" />;
      case "RECEIVED":
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case "PAID":
        return <CheckCircle className="w-4 h-4 mr-1" />;
      case "OVERDUE":
        return <Clock className="w-4 h-4 mr-1" />;
      case "VOIDED":
        return <XCircle className="w-4 h-4 mr-1" />;
      default:
        return <FileText className="w-4 h-4 mr-1" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading bills...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bills</h1>
          <p className="text-gray-600">Manage your vendor bills and expenses</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Create Bill
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Receipt className="w-8 h-8 text-blue-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Bills</p>
                  <p className="text-2xl font-bold">{stats.totalBills}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Total Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.totalAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <CheckCircle className="w-8 h-8 text-green-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Paid Amount</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.paidAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Clock className="w-8 h-8 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Outstanding</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.outstandingAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <XCircle className="w-8 h-8 text-red-600 mr-3" />
                <div>
                  <p className="text-sm text-gray-600">Overdue</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(stats.overdueAmount)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search bills..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>
        <select
          className="px-4 py-2 border border-gray-300 rounded-md"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="RECEIVED">Received</option>
          <option value="PAID">Paid</option>
          <option value="OVERDUE">Overdue</option>
          <option value="VOIDED">Voided</option>
        </select>
      </div>

      {/* Bills List */}
      <div className="space-y-4">
        {bills
          .filter(
            (bill) =>
              searchTerm === "" ||
              bill.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
              bill.vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
          )
          .filter((bill) => statusFilter === "" || bill.status === statusFilter)
          .map((bill) => (
            <Card key={bill.id}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{bill.number}</h3>
                      <Badge className="flex items-center">
                        {getStatusIcon(bill.status)}
                        {bill.status}
                      </Badge>
                    </div>
                    <p className="text-gray-600">{bill.vendor.name}</p>
                    <div className="flex gap-4 text-sm text-gray-500">
                      <span>Date: {formatDate(bill.date)}</span>
                      {bill.dueDate && (
                        <span>Due: {formatDate(bill.dueDate)}</span>
                      )}
                      <span>Total: {formatCurrency(bill.total)}</span>
                    </div>
                    {bill.daysOverdue > 0 && (
                      <Badge className="bg-red-100 text-red-800">
                        {bill.daysOverdue} days overdue
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBillStatus(bill.id, "RECEIVED")}
                      disabled={bill.status !== "DRAFT"}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Received
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => updateBillStatus(bill.id, "PAID")}
                      disabled={
                        bill.status === "PAID" || bill.status === "VOIDED"
                      }
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Mark Paid
                    </Button>
                    <Button variant="outline" size="sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Create Bill Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Bill</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Bill Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.number}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        number: e.target.value,
                      }))
                    }
                  />
                  <Button onClick={generateNextNumber} size="sm">
                    Generate
                  </Button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, date: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      dueDate: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Status</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.status}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      status: e.target.value as
                        | "DRAFT"
                        | "RECEIVED"
                        | "PAID"
                        | "OVERDUE"
                        | "VOIDED",
                    }))
                  }
                >
                  <option value="DRAFT">Draft</option>
                  <option value="RECEIVED">Received</option>
                  <option value="PAID">Paid</option>
                  <option value="OVERDUE">Overdue</option>
                  <option value="VOIDED">Voided</option>
                </select>
              </div>
            </div>

            {/* Vendor Selection with Auto-complete */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Vendor</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Search vendor by name, code, or email..."
                  value={vendorSearchTerm}
                  onChange={(e) => {
                    setVendorSearchTerm(e.target.value);
                    setShowVendorDropdown(true);
                  }}
                  onFocus={() => setShowVendorDropdown(true)}
                  onBlur={() => {
                    // Delay hiding dropdown to allow click events
                    setTimeout(() => setShowVendorDropdown(false), 200);
                  }}
                />
                {showVendorDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                    {filteredVendors.length > 0 ? (
                      filteredVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                          onClick={() => handleVendorSelect(vendor)}
                        >
                          <div className="font-medium">{vendor.name}</div>
                          <div className="text-sm text-gray-600">
                            {vendor.code} • {vendor.email}
                          </div>
                        </div>
                      ))
                    ) : vendorSearchTerm.trim() !== "" ? (
                      <div className="px-3 py-2 text-gray-500">
                        No vendors found matching "{vendorSearchTerm}"
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-gray-500">
                        Start typing to search vendors...
                      </div>
                    )}
                  </div>
                )}
                {/* Debug info */}
                <div className="text-xs text-gray-500 mt-1">
                  {vendors.length} vendors loaded, {filteredVendors.length}{" "}
                  filtered
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium">Items</label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowBarcodeInput(true)}
                  >
                    <Search className="w-4 h-4 mr-1" />
                    Scan Barcode
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setFormData((prev) => ({
                        ...prev,
                        items: [
                          ...prev.items,
                          {
                            itemId: "",
                            description: "",
                            quantity: "1",
                            unitPrice: "0",
                            taxRate: "0",
                            discountRate: "0",
                            total: "0",
                          },
                        ],
                      }))
                    }
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Item
                  </Button>
                </div>
              </div>

              {/* Barcode Input Modal */}
              {showBarcodeInput && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
                  <div className="bg-white rounded-lg p-6 w-96">
                    <h3 className="text-lg font-semibold mb-4">Scan Barcode</h3>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md mb-4"
                      placeholder="Enter or scan barcode..."
                      value={barcodeInput}
                      onChange={(e) => setBarcodeInput(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          handleBarcodeScan(barcodeInput);
                        }
                      }}
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button onClick={() => handleBarcodeScan(barcodeInput)}>
                        Add Item
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setShowBarcodeInput(false);
                          setBarcodeInput("");
                        }}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {formData.items.map((item, index) => (
                <div
                  key={index}
                  className="grid grid-cols-7 gap-2 mb-2 items-end"
                >
                  {/* Item Search */}
                  <div className="col-span-2 relative">
                    <label className="block text-xs font-medium mb-1 text-gray-600">
                      Item
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={
                          item.itemId ? "Item selected" : "Search item..."
                        }
                        className={`w-full px-3 py-2 border rounded-md ${
                          item.itemId
                            ? "border-green-500 bg-green-50 cursor-not-allowed"
                            : "border-gray-300"
                        }`}
                        value={item.description}
                        readOnly={!!item.itemId}
                        onChange={(e) => {
                          // If an item is already selected, don't allow editing the description
                          if (item.itemId) {
                            return;
                          }

                          const newItems = [...formData.items];
                          newItems[index].description = e.target.value;
                          setFormData({ ...formData, items: newItems });
                          // Update search state for this specific item
                          setItemSearchStates((prev) => ({
                            ...prev,
                            [index]: {
                              term: e.target.value,
                              showDropdown: true,
                            },
                          }));
                        }}
                        onFocus={() => {
                          // Only show dropdown if no item is selected or if user is editing
                          if (!item.itemId) {
                            setItemSearchStates((prev) => ({
                              ...prev,
                              [index]: {
                                term: itemSearchStates[index]?.term || "",
                                showDropdown: true,
                              },
                            }));
                          }
                        }}
                        onDoubleClick={() => {
                          // Allow editing on double-click even if item is selected
                          if (item.itemId) {
                            setItemSearchStates((prev) => ({
                              ...prev,
                              [index]: {
                                term: item.description,
                                showDropdown: false,
                              },
                            }));
                          }
                        }}
                      />
                      {item.itemId && (
                        <button
                          type="button"
                          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-red-500 hover:text-red-700"
                          onClick={() => {
                            // Clear the selected item
                            const newItems = [...formData.items];
                            newItems[index] = {
                              ...newItems[index],
                              itemId: "",
                              description: "",
                              unitPrice: "0",
                              taxRate: "0",
                            };
                            setFormData({ ...formData, items: newItems });
                            // Clear search state
                            setItemSearchStates((prev) => ({
                              ...prev,
                              [index]: { term: "", showDropdown: false },
                            }));
                            calculateTotals();
                          }}
                          title="Clear selected item"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    {itemSearchStates[index]?.showDropdown && (
                      <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                        {(() => {
                          const searchTerm =
                            itemSearchStates[index]?.term || "";
                          const filtered = items.filter(
                            (item) =>
                              item.name
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              item.code
                                .toLowerCase()
                                .includes(searchTerm.toLowerCase()) ||
                              (item.description &&
                                item.description
                                  .toLowerCase()
                                  .includes(searchTerm.toLowerCase()))
                          );

                          return filtered.length > 0 ? (
                            filtered.map((itemOption) => (
                              <div
                                key={itemOption.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer border-b border-gray-100"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log(
                                    "Dropdown item clicked:",
                                    itemOption.name
                                  );
                                  handleItemSelect(itemOption, index);
                                }}
                              >
                                <div className="font-medium">
                                  {itemOption.name}
                                </div>
                                <div className="text-sm text-gray-600">
                                  {itemOption.code} • ₹{itemOption.costPrice}
                                </div>
                              </div>
                            ))
                          ) : searchTerm.trim() !== "" ? (
                            <div className="px-3 py-2 text-gray-500">
                              No items found matching "{searchTerm}"
                            </div>
                          ) : (
                            <div className="px-3 py-2 text-gray-500">
                              Start typing to search items...
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">
                      Qty
                    </label>
                    <input
                      type="number"
                      placeholder="Qty"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={item.quantity}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].quantity = e.target.value;
                        setFormData({ ...formData, items: newItems });
                        calculateTotals();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">
                      Unit Price
                    </label>
                    <input
                      type="number"
                      placeholder="Unit Price"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].unitPrice = e.target.value;
                        setFormData({ ...formData, items: newItems });
                        calculateTotals();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">
                      Tax %
                    </label>
                    <input
                      type="number"
                      placeholder="Tax %"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={item.taxRate}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].taxRate = e.target.value;
                        setFormData({ ...formData, items: newItems });
                        calculateTotals();
                      }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium mb-1 text-gray-600">
                      Discount %
                    </label>
                    <input
                      type="number"
                      placeholder="Discount %"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      value={item.discountRate}
                      onChange={(e) => {
                        const newItems = [...formData.items];
                        newItems[index].discountRate = e.target.value;
                        setFormData({ ...formData, items: newItems });
                        calculateTotals();
                      }}
                    />
                  </div>
                  <div className="flex gap-1">
                    <div className="flex-1">
                      <label className="block text-xs font-medium mb-1 text-gray-600">
                        Total
                      </label>
                      <input
                        type="number"
                        placeholder="Total"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md"
                        value={item.total}
                        readOnly
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="px-2"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals Section */}
            <div className="grid grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subtotal
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  value={formData.subtotal}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tax Amount
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  value={formData.taxAmount}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Discount Amount
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                  value={formData.discountAmount}
                  readOnly
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 font-bold"
                  value={formData.total}
                  readOnly
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Notes</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Terms</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                  value={formData.terms}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, terms: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createBill}>Create Bill</Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}
    </div>
  );
};

export default Bills;

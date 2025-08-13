import React, { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

interface InvoiceItem {
  id: string;
  description: string;
  quantity: string;
  unitPrice: string;
  taxRate: string;
  discountRate: string;
  total: string;
}

interface Invoice {
  id: string;
  number: string;
  customerId: string;
  date: string;
  dueDate?: string;
  type: "SALE" | "CREDIT_MEMO";
  status: "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "VOIDED";
  subtotal: string;
  taxAmount: string;
  discountAmount: string;
  total: string;
  notes?: string;
  terms?: string;
  customer: {
    id: string;
    name: string;
    code: string;
    email?: string;
  };
  items: InvoiceItem[];
  totalOutstanding: string;
  totalPaid: string;
  daysOverdue: number;
}

interface InvoiceStats {
  totalInvoices: number;
  totalAmount: string;
  paidAmount: string;
  outstandingAmount: string;
  overdueAmount: string;
  overdueCount: number;
}

const Invoices: React.FC = () => {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [stats, setStats] = useState<InvoiceStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    number: "",
    customerId: "",
    date: "",
    dueDate: "",
    type: "SALE" as const,
    status: "DRAFT" as const,
    subtotal: "",
    taxAmount: "",
    discountAmount: "",
    total: "",
    notes: "",
    terms: "",
    items: [
      {
        description: "",
        quantity: "",
        unitPrice: "",
        taxRate: "",
        discountRate: "",
        total: "",
      },
    ],
  });

  useEffect(() => {
    fetchInvoices();
    fetchStats();
  }, []);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      const response = await fetch("http://localhost:3001/api/invoices", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch invoices");
      }

      const data = await response.json();
      setInvoices(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("http://localhost:3001/api/invoices/stats", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const generateNextNumber = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        "http://localhost:3001/api/invoices/next-number",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setFormData((prev) => ({ ...prev, number: data.data.nextNumber }));
      }
    } catch (err) {
      console.error("Failed to generate number:", err);
    }
  };

  const createInvoice = async () => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch("http://localhost:3001/api/invoices", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create invoice");
      }

      setShowCreateForm(false);
      setFormData({
        number: "",
        customerId: "",
        date: "",
        dueDate: "",
        type: "SALE",
        status: "DRAFT",
        subtotal: "",
        taxAmount: "",
        discountAmount: "",
        total: "",
        notes: "",
        terms: "",
        items: [
          {
            description: "",
            quantity: "",
            unitPrice: "",
            taxRate: "",
            discountRate: "",
            total: "",
          },
        ],
      });
      fetchInvoices();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const updateInvoiceStatus = async (invoiceId: string, status: string) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await fetch(
        `http://localhost:3001/api/invoices/${invoiceId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update invoice status");
      }

      fetchInvoices();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "DRAFT":
        return "bg-gray-100 text-gray-800";
      case "SENT":
        return "bg-blue-100 text-blue-800";
      case "PAID":
        return "bg-green-100 text-green-800";
      case "OVERDUE":
        return "bg-red-100 text-red-800";
      case "VOIDED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Clock className="w-4 h-4" />;
      case "SENT":
        return <Send className="w-4 h-4" />;
      case "PAID":
        return <CheckCircle className="w-4 h-4" />;
      case "OVERDUE":
        return <Clock className="w-4 h-4" />;
      case "VOIDED":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatCurrency = (amount: string) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredInvoices = invoices.filter((invoice) => {
    const matchesSearch =
      invoice.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      invoice.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || invoice.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading invoices...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Invoices</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Invoice
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Invoices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalInvoices}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Amount
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(stats.outstandingAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(stats.overdueAmount)}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search invoices..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <select
              className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="SENT">Sent</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="VOIDED">Voided</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices List */}
      <div className="space-y-4">
        {filteredInvoices.map((invoice) => (
          <Card key={invoice.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{invoice.number}</h3>
                    <Badge className={getStatusColor(invoice.status)}>
                      <span className="flex items-center gap-1">
                        {getStatusIcon(invoice.status)}
                        {invoice.status}
                      </span>
                    </Badge>
                  </div>
                  <p className="text-gray-600">{invoice.customer.name}</p>
                  <div className="flex gap-4 text-sm text-gray-500">
                    <span>Date: {formatDate(invoice.date)}</span>
                    {invoice.dueDate && (
                      <span>Due: {formatDate(invoice.dueDate)}</span>
                    )}
                    <span>Total: {formatCurrency(invoice.total)}</span>
                  </div>
                  {invoice.daysOverdue > 0 && (
                    <Badge className="bg-red-100 text-red-800">
                      {invoice.daysOverdue} days overdue
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateInvoiceStatus(invoice.id, "SENT")}
                    disabled={invoice.status !== "DRAFT"}
                  >
                    <Send className="w-4 h-4 mr-1" />
                    Send
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => updateInvoiceStatus(invoice.id, "PAID")}
                    disabled={
                      invoice.status === "PAID" || invoice.status === "VOIDED"
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

      {/* Create Invoice Form Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">Create New Invoice</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Invoice Number
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
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.type}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      type: e.target.value as "SALE" | "CREDIT_MEMO",
                    }))
                  }
                >
                  <option value="SALE">Sale</option>
                  <option value="CREDIT_MEMO">Credit Memo</option>
                </select>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Customer ID
              </label>
              <input
                type="text"
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Enter customer ID"
                value={formData.customerId}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    customerId: e.target.value,
                  }))
                }
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Items</label>
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-6 gap-2 mb-2">
                  <input
                    type="text"
                    placeholder="Description"
                    className="col-span-2 px-3 py-2 border border-gray-300 rounded-md"
                    value={item.description}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].description = e.target.value;
                      setFormData((prev) => ({ ...prev, items: newItems }));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    value={item.quantity}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].quantity = e.target.value;
                      setFormData((prev) => ({ ...prev, items: newItems }));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].unitPrice = e.target.value;
                      setFormData((prev) => ({ ...prev, items: newItems }));
                    }}
                  />
                  <input
                    type="number"
                    placeholder="Total"
                    className="px-3 py-2 border border-gray-300 rounded-md"
                    value={item.total}
                    onChange={(e) => {
                      const newItems = [...formData.items];
                      newItems[index].total = e.target.value;
                      setFormData((prev) => ({ ...prev, items: newItems }));
                    }}
                  />
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setFormData((prev) => ({
                    ...prev,
                    items: [
                      ...prev.items,
                      {
                        description: "",
                        quantity: "",
                        unitPrice: "",
                        taxRate: "",
                        discountRate: "",
                        total: "",
                      },
                    ],
                  }))
                }
              >
                Add Item
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Subtotal
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.subtotal}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      subtotal: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Tax Amount
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.taxAmount}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      taxAmount: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Total</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.total}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, total: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={createInvoice}>Create Invoice</Button>
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

export default Invoices;

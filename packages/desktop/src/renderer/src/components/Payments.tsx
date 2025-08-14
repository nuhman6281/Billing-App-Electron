import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  X,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface Payment {
  id: string;
  paymentNumber: string;
  date: string;
  amount: string;
  method:
    | "CASH"
    | "CHECK"
    | "BANK_TRANSFER"
    | "CREDIT_CARD"
    | "DEBIT_CARD"
    | "OTHER";
  status: "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED";
  type: "RECEIVED" | "MADE";
  reference: string;
  description: string;
  relatedDocument?: {
    type: "INVOICE" | "BILL";
    id: string;
    number: string;
    amount: string;
  };
  accountId: string;
  accountName: string;
  reconciled: boolean;
  reconciledAt?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentStats {
  totalPayments: number;
  totalAmount: string;
  receivedPayments: number;
  receivedAmount: string;
  madePayments: number;
  madeAmount: string;
  pendingPayments: number;
  pendingAmount: string;
  reconciledPayments: number;
  unreconciledPayments: number;
}

const paymentMethods = [
  { value: "CASH", label: "Cash", color: "bg-green-100 text-green-800" },
  { value: "CHECK", label: "Check", color: "bg-blue-100 text-blue-800" },
  {
    value: "BANK_TRANSFER",
    label: "Bank Transfer",
    color: "bg-purple-100 text-purple-800",
  },
  {
    value: "CREDIT_CARD",
    label: "Credit Card",
    color: "bg-orange-100 text-orange-800",
  },
  {
    value: "DEBIT_CARD",
    label: "Debit Card",
    color: "bg-indigo-100 text-indigo-800",
  },
  { value: "OTHER", label: "Other", color: "bg-gray-100 text-gray-800" },
];

const paymentStatuses = [
  {
    value: "PENDING",
    label: "Pending",
    color: "bg-yellow-100 text-yellow-800",
    icon: Clock,
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "bg-green-100 text-green-800",
    icon: CheckCircle,
  },
  {
    value: "FAILED",
    label: "Failed",
    color: "bg-red-100 text-red-800",
    icon: AlertCircle,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-gray-100 text-gray-800",
    icon: X,
  },
];

export default function Payments() {
  const { getAccessToken } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalPayments: 0,
    totalAmount: "0.00",
    receivedPayments: 0,
    receivedAmount: "0.00",
    madePayments: 0,
    madeAmount: "0.00",
    pendingPayments: 0,
    pendingAmount: "0.00",
    reconciledPayments: 0,
    unreconciledPayments: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split("T")[0],
    amount: "",
    method: "BANK_TRANSFER" as
      | "CASH"
      | "CHECK"
      | "BANK_TRANSFER"
      | "CREDIT_CARD"
      | "DEBIT_CARD"
      | "OTHER",
    type: "RECEIVED" as "RECEIVED" | "MADE",
    reference: "",
    description: "",
    accountId: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterMethod, setFilterMethod] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.get<any>(API_ENDPOINTS.PAYMENTS.LIST, token);
      if (data.success && data.data) {
        setPayments(data.data);
      } else {
        setPayments([]);
      }
    } catch (error) {
      console.error("Error fetching payments:", error);
      setError("Failed to load payments");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(API_ENDPOINTS.PAYMENTS.STATS, token);
      if (data.success && data.data) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      if (editingPayment) {
        await api.put<any>(`/payments/${editingPayment.id}`, formData, token);
      } else {
        await api.post<any>("/payments", formData, token);
      }

      setIsModalOpen(false);
      setEditingPayment(null);
      resetForm();
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error("Error saving payment:", error);
      setError("Failed to save payment");
    }
  };

  const handleStatusChange = async (paymentId: string, newStatus: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      await api.patch<any>(
        `/payments/${paymentId}/status`,
        { status: newStatus },
        token
      );
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error("Error updating payment status:", error);
      setError("Failed to update payment status");
    }
  };

  const handleReconcile = async (paymentId: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      await api.post<any>(`/payments/${paymentId}/reconcile`, {}, token);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error("Error reconciling payment:", error);
      setError("Failed to reconcile payment");
    }
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm("Are you sure you want to delete this payment?")) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      await api.delete<any>(`/payments/${paymentId}`, token);
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error("Error deleting payment:", error);
      setError("Failed to delete payment");
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      date: payment.date,
      amount: payment.amount,
      method: payment.method,
      type: payment.type,
      reference: payment.reference,
      description: payment.description,
      accountId: payment.accountId,
      notes: payment.notes || "",
    });
    setIsModalOpen(true);
  };

  const resetForm = () => {
    setFormData({
      date: new Date().toISOString().split("T")[0],
      amount: "",
      method: "BANK_TRANSFER",
      type: "RECEIVED",
      reference: "",
      description: "",
      accountId: "",
      notes: "",
    });
  };

  const getMethodBadge = (method: string) => {
    const methodConfig = paymentMethods.find((m) => m.value === method);
    if (!methodConfig) return null;

    return <Badge className={methodConfig.color}>{methodConfig.label}</Badge>;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = paymentStatuses.find((s) => s.value === status);
    if (!statusConfig) return null;

    const Icon = statusConfig.icon;
    return (
      <Badge className={statusConfig.color}>
        <Icon className="h-3 w-3 mr-1" />
        {statusConfig.label}
      </Badge>
    );
  };

  const filteredPayments = payments.filter((payment) => {
    const matchesSearch =
      payment.paymentNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.reference.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !filterStatus || payment.status === filterStatus;
    const matchesType = !filterType || payment.type === filterType;
    const matchesMethod = !filterMethod || payment.method === filterMethod;
    return matchesSearch && matchesStatus && matchesType && matchesMethod;
  });

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
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Track and manage all incoming and outgoing payments
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Payment
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalPayments}
            </div>
            <p className="text-xs text-gray-500">
              ${parseFloat(stats.totalAmount).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Received
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.receivedPayments}
            </div>
            <p className="text-xs text-gray-500">
              ${parseFloat(stats.receivedAmount).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Made
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.madePayments}
            </div>
            <p className="text-xs text-gray-500">
              ${parseFloat(stats.madeAmount).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.pendingPayments}
            </div>
            <p className="text-xs text-gray-500">
              ${parseFloat(stats.pendingAmount).toFixed(2)} total
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Reconciliation Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Reconciled:</span>
                <span className="font-medium text-green-600">
                  {stats.reconciledPayments}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Unreconciled:</span>
                <span className="font-medium text-red-600">
                  {stats.unreconciledPayments}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" size="sm" className="w-full">
                <CheckCircle className="h-4 w-4 mr-2" />
                Reconcile All
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Eye className="h-4 w-4 mr-2" />
                View Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <input
                type="text"
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              {paymentStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Types</option>
              <option value="RECEIVED">Received</option>
              <option value="MADE">Made</option>
            </select>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Methods</option>
              {paymentMethods.map((method) => (
                <option key={method.value} value={method.value}>
                  {method.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No payments found.{" "}
              {searchTerm || filterStatus || filterType || filterMethod
                ? "Try adjusting your filters."
                : "Create your first payment to get started."}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((payment) => (
                <div
                  key={payment.id}
                  className="border rounded-lg p-4 hover:bg-gray-50"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <span className="font-mono text-sm text-gray-600">
                        {payment.paymentNumber}
                      </span>
                      <span className="font-medium">{payment.reference}</span>
                      {getStatusBadge(payment.status)}
                      {getMethodBadge(payment.method)}
                      <Badge
                        variant={
                          payment.type === "RECEIVED" ? "default" : "secondary"
                        }
                      >
                        {payment.type === "RECEIVED" ? "Received" : "Made"}
                      </Badge>
                      {payment.reconciled && (
                        <Badge
                          variant="outline"
                          className="text-green-600 border-green-600"
                        >
                          Reconciled
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-lg font-bold text-gray-900">
                        ${parseFloat(payment.amount).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {payment.date}
                      </span>
                    </div>
                  </div>

                  <p className="text-gray-700 mb-3">{payment.description}</p>

                  {payment.relatedDocument && (
                    <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                      <div className="text-sm">
                        <span className="font-medium">
                          Related {payment.relatedDocument.type}:{" "}
                        </span>
                        <span className="font-mono">
                          {payment.relatedDocument.number}
                        </span>
                        <span className="ml-2 text-gray-600">
                          ($
                          {parseFloat(payment.relatedDocument.amount).toFixed(
                            2
                          )}
                          )
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      Account: {payment.accountName}
                      {payment.notes && (
                        <span className="ml-4">Notes: {payment.notes}</span>
                      )}
                    </div>

                    <div className="flex space-x-1">
                      {payment.status === "PENDING" && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(payment.id, "COMPLETED")
                            }
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              handleStatusChange(payment.id, "CANCELLED")
                            }
                            className="text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}

                      {!payment.reconciled &&
                        payment.status === "COMPLETED" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReconcile(payment.id)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(payment)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(payment.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">
              {editingPayment ? "Edit Payment" : "New Payment"}
            </h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date
                  </label>
                  <input
                    type="date"
                    value={formData.date}
                    onChange={(e) =>
                      setFormData({ ...formData, date: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) =>
                      setFormData({ ...formData, type: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="RECEIVED">Received</option>
                    <option value="MADE">Made</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method
                  </label>
                  <select
                    value={formData.method}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        method: e.target.value as any,
                      })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {paymentMethods.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference
                </label>
                <input
                  type="text"
                  value={formData.reference}
                  onChange={(e) =>
                    setFormData({ ...formData, reference: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g., Check #1234, Invoice #INV-001"
                  required
                />
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
                  placeholder="Description of the payment"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account
                </label>
                <input
                  type="text"
                  value={formData.accountId}
                  onChange={(e) =>
                    setFormData({ ...formData, accountId: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Bank account or cash account"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={2}
                  placeholder="Additional notes (optional)"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingPayment(null);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingPayment ? "Update" : "Create"} Payment
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

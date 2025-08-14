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
  Building2,
  Mail,
  Phone,
  MapPin,
  DollarSign,
  Calendar,
  FileText,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface Vendor {
  id: string;
  code: string;
  name: string;
  email?: string;
  phone?: string;
  company?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
  status: "ACTIVE" | "INACTIVE" | "APPROVED" | "PENDING";
  paymentTerms: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  totalBills: number;
  totalAmount: string;
  lastBillDate?: string;
  taxId?: string;
  website?: string;
  contactPerson?: string;
}

interface VendorStats {
  totalVendors: number;
  activeVendors: number;
  totalSpent: string;
  averageBillAmount: string;
  newVendorsThisMonth: number;
}

const Vendors: React.FC = () => {
  const { getAccessToken } = useAuth();
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [stats, setStats] = useState<VendorStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingVendor, setEditingVendor] = useState<Vendor | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    company: "",
    street: "",
    city: "",
    state: "",
    zipCode: "",
    country: "",
    status: "ACTIVE" as "ACTIVE" | "INACTIVE" | "APPROVED" | "PENDING",
    paymentTerms: "",
    notes: "",
    taxId: "",
    website: "",
    contactPerson: "",
  });

  useEffect(() => {
    fetchVendors();
    fetchStats();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const data = await api.get<any>(API_ENDPOINTS.VENDORS.LIST, token);
      setVendors(data?.data ?? []);
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
      const data = await api.get<any>(API_ENDPOINTS.VENDORS.STATS, token);
      if (data?.data) setStats(data.data);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  const generateNextCode = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;
      const data = await api.get<any>(API_ENDPOINTS.VENDORS.NEXT_CODE, token);
      if (data?.data?.nextCode) {
        setFormData((prev) => ({ ...prev, code: data.data.nextCode }));
      }
    } catch (err) {
      console.error("Failed to generate code:", err);
    }
  };

  const createVendor = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const vendorData = {
        ...formData,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
      };

      await api.post<any>(API_ENDPOINTS.VENDORS.LIST, vendorData, token);

      setShowCreateForm(false);
      resetForm();
      fetchVendors();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const updateVendor = async () => {
    if (!editingVendor) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      const vendorData = {
        ...formData,
        address: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          country: formData.country,
        },
      };

      await api.put<any>(`/vendors/${editingVendor.id}`, vendorData, token);

      setEditingVendor(null);
      resetForm();
      fetchVendors();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const deleteVendor = async (vendorId: string) => {
    if (!confirm("Are you sure you want to delete this vendor?")) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.delete<any>(`/vendors/${vendorId}`, token);

      fetchVendors();
      fetchStats();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      email: "",
      phone: "",
      company: "",
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
      status: "ACTIVE",
      paymentTerms: "",
      notes: "",
      taxId: "",
      website: "",
      contactPerson: "",
    });
  };

  const editVendor = (vendor: Vendor) => {
    setEditingVendor(vendor);
    setFormData({
      code: vendor.code,
      name: vendor.name,
      email: vendor.email || "",
      phone: vendor.phone || "",
      company: vendor.company || "",
      street: vendor.address?.street || "",
      city: vendor.address?.city || "",
      state: vendor.address?.state || "",
      zipCode: vendor.address?.zipCode || "",
      country: vendor.address?.country || "",
      status: vendor.status,
      paymentTerms: vendor.paymentTerms,
      notes: vendor.notes || "",
      taxId: vendor.taxId || "",
      website: vendor.website || "",
      contactPerson: vendor.contactPerson || "",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-100 text-green-800";
      case "INACTIVE":
        return "bg-gray-100 text-gray-800";
      case "APPROVED":
        return "bg-blue-100 text-blue-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      default:
        return "bg-gray-100 text-gray-800";
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

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch =
      vendor.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.company?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || vendor.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading vendors...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Vendors</h1>
        <Button onClick={() => setShowCreateForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          New Vendor
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Vendors
              </CardTitle>
              <Building2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalVendors}</div>
              <p className="text-xs text-muted-foreground">
                {stats.activeVendors} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.totalSpent)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Average Bill
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(stats.averageBillAmount)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                New This Month
              </CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.newVendorsThisMonth}
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
                  placeholder="Search vendors..."
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
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="APPROVED">Approved</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Vendors List */}
      <div className="space-y-4">
        {filteredVendors.map((vendor) => (
          <Card key={vendor.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex justify-between items-start">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold">{vendor.name}</h3>
                    <Badge className={getStatusColor(vendor.status)}>
                      {vendor.status}
                    </Badge>
                    <span className="text-sm text-gray-500 font-mono">
                      {vendor.code}
                    </span>
                  </div>
                  <div className="flex gap-4 text-sm text-gray-600">
                    {vendor.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="w-4 h-4" />
                        {vendor.email}
                      </span>
                    )}
                    {vendor.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-4 h-4" />
                        {vendor.phone}
                      </span>
                    )}
                    {vendor.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-4 h-4" />
                        {vendor.company}
                      </span>
                    )}
                  </div>
                  {vendor.address && (
                    <div className="flex gap-4 text-sm text-gray-500">
                      {vendor.address.city && vendor.address.state && (
                        <span className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {vendor.address.city}, {vendor.address.state}
                        </span>
                      )}
                      <span>Payment Terms: {vendor.paymentTerms}</span>
                      {vendor.taxId && <span>Tax ID: {vendor.taxId}</span>}
                    </div>
                  )}
                  <div className="text-xs text-gray-400">
                    Created: {formatDate(vendor.createdAt)}
                    {vendor.lastBillDate && (
                      <span className="ml-4">
                        Last Bill: {formatDate(vendor.lastBillDate)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => editVendor(vendor)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteVendor(vendor.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create/Edit Vendor Form Modal */}
      {(showCreateForm || editingVendor) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-2xl font-bold mb-4">
              {editingVendor ? "Edit Vendor" : "Create New Vendor"}
            </h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Vendor Code
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, code: e.target.value }))
                    }
                  />
                  <Button onClick={generateNextCode} size="sm">
                    Generate
                  </Button>
                </div>
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
                        | "ACTIVE"
                        | "INACTIVE"
                        | "APPROVED"
                        | "PENDING",
                    }))
                  }
                >
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                  <option value="APPROVED">Approved</option>
                  <option value="PENDING">Pending</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Company
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.company}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      company: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <input
                  type="tel"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Contact Person
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.contactPerson}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      contactPerson: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Website
                </label>
                <input
                  type="url"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      website: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Address</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Street"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.street}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, street: e.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="City"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.city}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, city: e.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="State"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.state}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, state: e.target.value }))
                  }
                />
                <input
                  type="text"
                  placeholder="ZIP Code"
                  className="px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.zipCode}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      zipCode: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="e.g., Net 30"
                  value={formData.paymentTerms}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      paymentTerms: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Tax ID</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  value={formData.taxId}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, taxId: e.target.value }))
                  }
                />
              </div>
            </div>

            <div className="mb-4">
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

            <div className="flex gap-2">
              <Button onClick={editingVendor ? updateVendor : createVendor}>
                {editingVendor ? "Update Vendor" : "Create Vendor"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingVendor(null);
                  resetForm();
                }}
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

export default Vendors;

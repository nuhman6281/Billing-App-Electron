import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  Users,
  Shield,
  UserPlus,
  Edit,
  Trash2,
  Eye,
  Lock,
  Unlock,
  CheckCircle,
  X,
  AlertCircle,
  Settings,
  Key,
  Building2,
  UserCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  role: string;
  status: "ACTIVE" | "INACTIVE" | "SUSPENDED";
  lastLogin?: string;
  createdAt: string;
  companyId: string;
  permissions: string[];
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  isSystem: boolean;
  userCount: number;
  createdAt: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
  isGranted: boolean;
}

interface Company {
  id: string;
  name: string;
  code: string;
}

const systemRoles = [
  {
    name: "SUPER_ADMIN",
    description: "Full system access and control",
    permissions: ["*"],
  },
  {
    name: "ADMIN",
    description: "Company-level administration",
    permissions: [
      "users.manage",
      "roles.manage",
      "reports.view",
      "settings.manage",
    ],
  },
  {
    name: "MANAGER",
    description: "Department and team management",
    permissions: [
      "users.view",
      "reports.view",
      "invoices.manage",
      "bills.manage",
    ],
  },
  {
    name: "ACCOUNTANT",
    description: "Financial operations and reporting",
    permissions: [
      "invoices.manage",
      "bills.manage",
      "payments.manage",
      "reports.view",
      "chart-of-accounts.manage",
    ],
  },
  {
    name: "USER",
    description: "Basic user access",
    permissions: [
      "invoices.view",
      "bills.view",
      "customers.view",
      "vendors.view",
    ],
  },
];

const permissionCategories = [
  {
    name: "User Management",
    permissions: [
      {
        id: "users.view",
        name: "View Users",
        description: "View user list and details",
      },
      {
        id: "users.create",
        name: "Create Users",
        description: "Create new users",
      },
      {
        id: "users.edit",
        name: "Edit Users",
        description: "Modify user information",
      },
      {
        id: "users.delete",
        name: "Delete Users",
        description: "Remove users from system",
      },
      {
        id: "users.activate",
        name: "Activate Users",
        description: "Activate suspended users",
      },
    ],
  },
  {
    name: "Role Management",
    permissions: [
      {
        id: "roles.view",
        name: "View Roles",
        description: "View role definitions",
      },
      {
        id: "roles.create",
        name: "Create Roles",
        description: "Create new roles",
      },
      {
        id: "roles.edit",
        name: "Edit Roles",
        description: "Modify role permissions",
      },
      { id: "roles.delete", name: "Delete Roles", description: "Remove roles" },
    ],
  },
  {
    name: "Financial Operations",
    permissions: [
      {
        id: "invoices.view",
        name: "View Invoices",
        description: "View invoice list and details",
      },
      {
        id: "invoices.create",
        name: "Create Invoices",
        description: "Create new invoices",
      },
      {
        id: "invoices.edit",
        name: "Edit Invoices",
        description: "Modify invoice information",
      },
      {
        id: "invoices.delete",
        name: "Delete Invoices",
        description: "Remove invoices",
      },
      {
        id: "bills.view",
        name: "View Bills",
        description: "View bill list and details",
      },
      {
        id: "bills.create",
        name: "Create Bills",
        description: "Create new bills",
      },
      {
        id: "bills.edit",
        name: "Edit Bills",
        description: "Modify bill information",
      },
      { id: "bills.delete", name: "Delete Bills", description: "Remove bills" },
      {
        id: "payments.view",
        name: "View Payments",
        description: "View payment information",
      },
      {
        id: "payments.manage",
        name: "Manage Payments",
        description: "Create and manage payments",
      },
    ],
  },
  {
    name: "Reporting & Analytics",
    permissions: [
      {
        id: "reports.view",
        name: "View Reports",
        description: "Access to financial reports",
      },
      {
        id: "reports.export",
        name: "Export Reports",
        description: "Export reports to various formats",
      },
      {
        id: "analytics.view",
        name: "View Analytics",
        description: "Access to business analytics",
      },
    ],
  },
  {
    name: "System Settings",
    permissions: [
      {
        id: "settings.view",
        name: "View Settings",
        description: "View system configuration",
      },
      {
        id: "settings.manage",
        name: "Manage Settings",
        description: "Modify system settings",
      },
      {
        id: "companies.manage",
        name: "Manage Companies",
        description: "Manage company information",
      },
    ],
  },
];

export default function AdvancedUserManagement() {
  const { getAccessToken } = useAuth();
  const [activeTab, setActiveTab] = useState<
    "users" | "roles" | "permissions" | "companies"
  >("users");
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form states
  const [showUserModal, setShowUserModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [userForm, setUserForm] = useState({
    username: "",
    email: "",
    displayName: "",
    role: "",
    companyId: "",
    password: "",
    confirmPassword: "",
  });
  const [roleForm, setRoleForm] = useState({
    name: "",
    description: "",
    permissions: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      // Fetch users
      const usersResponse = await api.get<any>(API_ENDPOINTS.USERS.LIST, token);
      if (usersResponse?.data) {
        setUsers(usersResponse.data);
      }

      // Fetch roles
      const rolesResponse = await api.get<any>(
        API_ENDPOINTS.USERS.ROLES,
        token
      );
      if (rolesResponse?.data) {
        setRoles(rolesResponse.data);
      }

      // Fetch companies
      const companiesResponse = await api.get<any>(
        API_ENDPOINTS.COMPANIES.LIST,
        token
      );
      if (companiesResponse?.data) {
        setCompanies(companiesResponse.data);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      setError("Failed to load data");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      if (userForm.password !== userForm.confirmPassword) {
        setError("Passwords do not match");
        return;
      }

      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.post<any>(
        API_ENDPOINTS.USERS.LIST,
        {
          username: userForm.username,
          email: userForm.email,
          displayName: userForm.displayName,
          role: userForm.role,
          companyId: userForm.companyId,
          password: userForm.password,
        },
        token
      );

      setSuccess("User created successfully");
      setShowUserModal(false);
      resetUserForm();
      fetchData();
    } catch (error) {
      console.error("Error creating user:", error);
      setError("Failed to create user");
    }
  };

  const handleCreateRole = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.post<any>(
        API_ENDPOINTS.USERS.ROLES,
        {
          name: roleForm.name,
          description: roleForm.description,
          permissions: roleForm.permissions,
        },
        token
      );

      setSuccess("Role created successfully");
      setShowRoleModal(false);
      resetRoleForm();
      fetchData();
    } catch (error) {
      console.error("Error creating role:", error);
      setError("Failed to create role");
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.patch<any>(API_ENDPOINTS.USERS.STATUS.replace(":id", userId), { status }, token);
      setSuccess("User status updated successfully");
      fetchData();
    } catch (error) {
      console.error("Error updating user status:", error);
      setError("Failed to update user status");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }
      await api.delete<any>(API_ENDPOINTS.USERS.DELETE.replace(":id", userId), token);
      setSuccess("User deleted successfully");
      fetchData();
    } catch (error) {
      console.error("Error deleting user:", error);
      setError("Failed to delete user");
    }
  };

  const resetUserForm = () => {
    setUserForm({
      username: "",
      email: "",
      displayName: "",
      role: "",
      companyId: "",
      password: "",
      confirmPassword: "",
    });
  };

  const resetRoleForm = () => {
    setRoleForm({
      name: "",
      description: "",
      permissions: [],
    });
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      ACTIVE: "default",
      INACTIVE: "secondary",
      SUSPENDED: "destructive",
    };
    return <Badge variant={variants[status] || "secondary"}>{status}</Badge>;
  };

  const getRoleBadge = (role: string) => {
    const colors = {
      SUPER_ADMIN: "bg-red-100 text-red-800",
      ADMIN: "bg-purple-100 text-purple-800",
      MANAGER: "bg-blue-100 text-blue-800",
      ACCOUNTANT: "bg-green-100 text-green-800",
      USER: "bg-gray-100 text-gray-800",
    };
    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[role as keyof typeof colors] || colors.USER}`}
      >
        {role.replace("_", " ")}
      </span>
    );
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
            Advanced User Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage users, roles, permissions, and access control
          </p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowUserModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add User
          </Button>
          <Button variant="outline" onClick={() => setShowRoleModal(true)}>
            <Shield className="h-4 w-4 mr-2" />
            Add Role
          </Button>
        </div>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
            <p className="text-green-800">{success}</p>
            <button
              onClick={() => setSuccess(null)}
              className="ml-auto text-green-600 hover:text-green-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: "users", label: "Users", icon: Users },
            { id: "roles", label: "Roles", icon: Shield },
            { id: "permissions", label: "Permissions", icon: Key },
            { id: "companies", label: "Companies", icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center ${
                  activeTab === tab.id
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                <Icon className="h-4 w-4 mr-2" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Users Tab */}
      {activeTab === "users" && (
        <Card>
          <CardHeader>
            <CardTitle>User Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      User
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Role
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Company
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Login
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="h-10 w-10 rounded-full bg-blue-500 flex items-center justify-center">
                            <span className="text-white font-medium text-sm">
                              {user.displayName.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.displayName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {companies.find((c) => c.id === user.companyId)?.name ||
                          "N/A"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.lastLogin
                          ? new Date(user.lastLogin).toLocaleDateString()
                          : "Never"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedUser(user)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {user.status === "ACTIVE" ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateUserStatus(user.id, "SUSPENDED")
                              }
                            >
                              <Lock className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                handleUpdateUserStatus(user.id, "ACTIVE")
                              }
                            >
                              <Unlock className="h-4 w-4" />
                            </Button>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Roles Tab */}
      {activeTab === "roles" && (
        <Card>
          <CardHeader>
            <CardTitle>Role Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((role) => (
                <div key={role.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900">{role.name}</h3>
                    {role.isSystem && <Badge variant="secondary">System</Badge>}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">
                    {role.description}
                  </p>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>{role.userCount} users</span>
                    <span>{role.permissions.length} permissions</span>
                  </div>
                  <div className="mt-3 flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-red-600"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Permissions Tab */}
      {activeTab === "permissions" && (
        <Card>
          <CardHeader>
            <CardTitle>Permission Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {permissionCategories.map((category) => (
                <div key={category.name} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900 mb-3">
                    {category.name}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.permissions.map((permission) => (
                      <div
                        key={permission.id}
                        className="flex items-center space-x-3"
                      >
                        <input
                          type="checkbox"
                          id={permission.id}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <div>
                          <label
                            htmlFor={permission.id}
                            className="text-sm font-medium text-gray-900"
                          >
                            {permission.name}
                          </label>
                          <p className="text-xs text-gray-500">
                            {permission.description}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Companies Tab */}
      {activeTab === "companies" && (
        <Card>
          <CardHeader>
            <CardTitle>Company Management</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {companies.map((company) => (
                <div key={company.id} className="border rounded-lg p-4">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Building2 className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {company.name}
                      </h3>
                      <p className="text-sm text-gray-500">
                        Code: {company.code}
                      </p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-1" />
                      Settings
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add User Modal */}
      {showUserModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New User
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Username
                  </label>
                  <input
                    type="text"
                    value={userForm.username}
                    onChange={(e) =>
                      setUserForm({ ...userForm, username: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userForm.email}
                    onChange={(e) =>
                      setUserForm({ ...userForm, email: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={userForm.displayName}
                    onChange={(e) =>
                      setUserForm({ ...userForm, displayName: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role
                  </label>
                  <select
                    value={userForm.role}
                    onChange={(e) =>
                      setUserForm({ ...userForm, role: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.name}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Company
                  </label>
                  <select
                    value={userForm.companyId}
                    onChange={(e) =>
                      setUserForm({ ...userForm, companyId: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select Company</option>
                    {companies.map((company) => (
                      <option key={company.id} value={company.id}>
                        {company.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    type="password"
                    value={userForm.password}
                    onChange={(e) =>
                      setUserForm({ ...userForm, password: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    type="password"
                    value={userForm.confirmPassword}
                    onChange={(e) =>
                      setUserForm({
                        ...userForm,
                        confirmPassword: e.target.value,
                      })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowUserModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateUser}>Create User</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Role Modal */}
      {showRoleModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add New Role
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Role Name
                  </label>
                  <input
                    type="text"
                    value={roleForm.name}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, name: e.target.value })
                    }
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={roleForm.description}
                    onChange={(e) =>
                      setRoleForm({ ...roleForm, description: e.target.value })
                    }
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Permissions
                  </label>
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {permissionCategories.map((category) => (
                      <div key={category.name}>
                        <h4 className="text-sm font-medium text-gray-700 mb-1">
                          {category.name}
                        </h4>
                        {category.permissions.map((permission) => (
                          <div
                            key={permission.id}
                            className="flex items-center space-x-2 ml-2"
                          >
                            <input
                              type="checkbox"
                              id={permission.id}
                              checked={roleForm.permissions.includes(
                                permission.id
                              )}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRoleForm({
                                    ...roleForm,
                                    permissions: [
                                      ...roleForm.permissions,
                                      permission.id,
                                    ],
                                  });
                                } else {
                                  setRoleForm({
                                    ...roleForm,
                                    permissions: roleForm.permissions.filter(
                                      (p) => p !== permission.id
                                    ),
                                  });
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <label
                              htmlFor={permission.id}
                              className="text-sm text-gray-700"
                            >
                              {permission.name}
                            </label>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => setShowRoleModal(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleCreateRole}>Create Role</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

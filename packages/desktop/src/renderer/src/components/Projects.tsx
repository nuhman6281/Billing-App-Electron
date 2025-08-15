import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
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
  Calendar,
  DollarSign,
  Users,
  Clock,
  TrendingUp,
  TrendingDown,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Pause,
  Play,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface Project {
  id: string;
  name: string;
  description?: string;
  customerId: string;
  customer: {
    id: string;
    name: string;
    code: string;
  };
  startDate: string;
  endDate?: string;
  status: "PLANNING" | "ACTIVE" | "ON_HOLD" | "COMPLETED" | "CANCELLED";
  budget: string;
  hourlyRate?: string;
  managerId?: string;
  manager?: {
    id: string;
    displayName: string;
  };
  notes?: string;
  createdAt: string;
  updatedAt: string;
  _count: {
    expenses: number;
    timeEntries: number;
    invoices: number;
  };
}

interface ProjectStats {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  onHoldProjects: number;
  totalBudget: string;
  totalExpenses: string;
  totalRevenue: string;
  averageProjectDuration: number;
}

interface ProjectExpense {
  id: string;
  description: string;
  amount: string;
  date: string;
  category: string;
  billId?: string;
  invoiceId?: string;
}

interface ProjectTimeEntry {
  id: string;
  description: string;
  hours: number;
  rate: string;
  date: string;
  employeeId: string;
  employeeName: string;
  total: string;
}

const projectStatuses = [
  { value: "PLANNING", label: "Planning", color: "bg-blue-100 text-blue-800" },
  { value: "ACTIVE", label: "Active", color: "bg-green-100 text-green-800" },
  {
    value: "ON_HOLD",
    label: "On Hold",
    color: "bg-yellow-100 text-yellow-800",
  },
  {
    value: "COMPLETED",
    label: "Completed",
    color: "bg-gray-100 text-gray-800",
  },
  { value: "CANCELLED", label: "Cancelled", color: "bg-red-100 text-red-800" },
];

export default function Projects() {
  const { getAccessToken } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<ProjectStats>({
    totalProjects: 0,
    activeProjects: 0,
    completedProjects: 0,
    onHoldProjects: 0,
    totalBudget: "0.00",
    totalExpenses: "0.00",
    totalRevenue: "0.00",
    averageProjectDuration: 0,
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [showExpenses, setShowExpenses] = useState(false);
  const [showTimeTracking, setShowTimeTracking] = useState(false);
  const [expenses, setExpenses] = useState<ProjectExpense[]>([]);
  const [timeEntries, setTimeEntries] = useState<ProjectTimeEntry[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    customerId: "",
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    status: "PLANNING" as
      | "PLANNING"
      | "ACTIVE"
      | "ON_HOLD"
      | "COMPLETED"
      | "CANCELLED",
    budget: "",
    hourlyRate: "",
    managerId: "",
    notes: "",
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects();
    fetchStats();
    fetchCustomers();
    fetchUsers();
  }, []);

  const fetchProjects = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.get<any>(API_ENDPOINTS.PROJECTS.LIST, token);
      if (data.success) {
        setProjects(data.data);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
      setError("Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(API_ENDPOINTS.PROJECTS.STATS, token);
      if (data.success) {
        setStats(data.data);
      }
    } catch (error) {
      console.error("Error fetching project stats:", error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(API_ENDPOINTS.CUSTOMERS.LIST, token);
      if (data.success) {
        setCustomers(data.data);
      }
    } catch (error) {
      console.error("Error fetching customers:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(API_ENDPOINTS.USERS.LIST, token);
      if (data.success) {
        setUsers(data.data);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchProjectExpenses = async (projectId: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(
        `${API_ENDPOINTS.PROJECTS.EXPENSES.replace(":id", projectId)}`,
        token
      );
      if (data.success) {
        setExpenses(data.data);
      }
    } catch (error) {
      console.error("Error fetching project expenses:", error);
    }
  };

  const fetchProjectTime = async (projectId: string) => {
    try {
      const token = getAccessToken();
      if (!token) return;

      const data = await api.get<any>(
        `${API_ENDPOINTS.PROJECTS.TIME.replace(":id", projectId)}`,
        token
      );
      if (data.success) {
        setTimeEntries(data.data);
      }
    } catch (error) {
      console.error("Error fetching project time:", error);
    }
  };

  const handleCreateProject = async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.post<any>(
        API_ENDPOINTS.PROJECTS.CREATE,
        formData,
        token
      );
      if (data.success) {
        setIsModalOpen(false);
        setFormData({
          name: "",
          description: "",
          customerId: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          status: "PLANNING",
          budget: "",
          hourlyRate: "",
          managerId: "",
          notes: "",
        });
        fetchProjects();
        fetchStats();
      }
    } catch (error) {
      console.error("Error creating project:", error);
      setError("Failed to create project");
    }
  };

  const handleUpdateProject = async () => {
    if (!editingProject) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.put<any>(
        `${API_ENDPOINTS.PROJECTS.UPDATE.replace(":id", editingProject.id)}`,
        formData,
        token
      );
      if (data.success) {
        setIsModalOpen(false);
        setEditingProject(null);
        setFormData({
          name: "",
          description: "",
          customerId: "",
          startDate: new Date().toISOString().split("T")[0],
          endDate: "",
          status: "PLANNING",
          budget: "",
          hourlyRate: "",
          managerId: "",
          notes: "",
        });
        fetchProjects();
        fetchStats();
      }
    } catch (error) {
      console.error("Error updating project:", error);
      setError("Failed to update project");
    }
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm("Are you sure you want to delete this project?")) return;

    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      const data = await api.delete<any>(
        `${API_ENDPOINTS.PROJECTS.DELETE.replace(":id", projectId)}`,
        token
      );
      if (data.success) {
        fetchProjects();
        fetchStats();
      }
    } catch (error) {
      console.error("Error deleting project:", error);
      setError("Failed to delete project");
    }
  };

  const openProjectDetails = async (project: Project) => {
    setSelectedProject(project);
    await fetchProjectExpenses(project.id);
    await fetchProjectTime(project.id);
  };

  const getStatusColor = (status: string) => {
    const statusConfig = projectStatuses.find((s) => s.value === status);
    return statusConfig?.color || "bg-gray-100 text-gray-800";
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Play className="h-4 w-4" />;
      case "ON_HOLD":
        return <Pause className="h-4 w-4" />;
      case "COMPLETED":
        return <CheckCircle className="h-4 w-4" />;
      case "CANCELLED":
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <FolderOpen className="h-4 w-4" />;
    }
  };

  const formatCurrency = (amount: string) => {
    return `$${parseFloat(amount).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const filteredProjects = projects.filter((project) => {
    const matchesSearch =
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || project.status === statusFilter;
    return matchesSearch && matchesStatus;
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
          <h1 className="text-2xl font-bold text-gray-900">
            Project Management
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage projects, track time, and monitor job costs
          </p>
        </div>
        <Button onClick={() => setIsModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Project Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">
              {stats.totalProjects}
            </div>
            <div className="text-sm text-gray-500">All time</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Active Projects
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.activeProjects}
            </div>
            <div className="text-sm text-gray-500">Currently running</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Budget
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatCurrency(stats.totalBudget)}
            </div>
            <div className="text-sm text-gray-500">All projects</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <div className="text-sm text-gray-500">Generated</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                {projectStatuses.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Projects List */}
      <div className="space-y-4">
        {filteredProjects.map((project) => (
          <Card key={project.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {project.name}
                    </h3>
                    <Badge className={getStatusColor(project.status)}>
                      {getStatusIcon(project.status)}
                      <span className="ml-1">
                        {
                          projectStatuses.find(
                            (s) => s.value === project.status
                          )?.label
                        }
                      </span>
                    </Badge>
                  </div>

                  {project.description && (
                    <p className="text-gray-600 mb-3">{project.description}</p>
                  )}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <p className="font-medium">{project.customer.name}</p>
                    </div>
                    <div>
                      <span className="text-gray-500">Start Date:</span>
                      <p className="font-medium">
                        {formatDate(project.startDate)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium">
                        {formatCurrency(project.budget)}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Duration:</span>
                      <p className="font-medium">
                        {project.endDate
                          ? `${Math.ceil((new Date(project.endDate).getTime() - new Date(project.startDate).getTime()) / (1000 * 60 * 60 * 24))} days`
                          : "Ongoing"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                    <span className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      {project._count.timeEntries} time entries
                    </span>
                    <span className="flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      {project._count.expenses} expenses
                    </span>
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-1" />
                      {project._count.invoices} invoices
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openProjectDetails(project)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingProject(project);
                      setFormData({
                        name: project.name,
                        description: project.description || "",
                        customerId: project.customerId,
                        startDate: project.startDate,
                        endDate: project.endDate || "",
                        status: project.status,
                        budget: project.budget,
                        hourlyRate: project.hourlyRate || "",
                        managerId: project.managerId || "",
                        notes: project.notes || "",
                      });
                      setIsModalOpen(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteProject(project.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredProjects.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <FolderOpen className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No projects found
              </h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || statusFilter
                  ? "Try adjusting your search or filters."
                  : "Get started by creating your first project."}
              </p>
              {!searchTerm && !statusFilter && (
                <Button onClick={() => setIsModalOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Project
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Project Details Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedProject.name}
                  </h2>
                  <p className="text-gray-600">{selectedProject.description}</p>
                </div>
                <Button
                  variant="outline"
                  onClick={() => setSelectedProject(null)}
                >
                  Close
                </Button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Project Info */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <span className="text-gray-500">Customer:</span>
                      <p className="font-medium">
                        {selectedProject.customer.name}
                      </p>
                    </div>
                    <div>
                      <span className="text-gray-500">Status:</span>
                      <Badge className={getStatusColor(selectedProject.status)}>
                        {
                          projectStatuses.find(
                            (s) => s.value === selectedProject.status
                          )?.label
                        }
                      </Badge>
                    </div>
                    <div>
                      <span className="text-gray-500">Start Date:</span>
                      <p className="font-medium">
                        {formatDate(selectedProject.startDate)}
                      </p>
                    </div>
                    {selectedProject.endDate && (
                      <div>
                        <span className="text-gray-500">End Date:</span>
                        <p className="font-medium">
                          {formatDate(selectedProject.endDate)}
                        </p>
                      </div>
                    )}
                    <div>
                      <span className="text-gray-500">Budget:</span>
                      <p className="font-medium">
                        {formatCurrency(selectedProject.budget)}
                      </p>
                    </div>
                    {selectedProject.hourlyRate && (
                      <div>
                        <span className="text-gray-500">Hourly Rate:</span>
                        <p className="font-medium">
                          {formatCurrency(selectedProject.hourlyRate)}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Project Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle>Project Statistics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 bg-blue-50 rounded-lg">
                        <div className="text-2xl font-bold text-blue-600">
                          {selectedProject._count.timeEntries}
                        </div>
                        <div className="text-sm text-blue-600">
                          Time Entries
                        </div>
                      </div>
                      <div className="text-center p-3 bg-green-50 rounded-lg">
                        <div className="text-2xl font-bold text-green-600">
                          {selectedProject._count.expenses}
                        </div>
                        <div className="text-sm text-green-600">Expenses</div>
                      </div>
                    </div>
                    <div className="text-center p-3 bg-purple-50 rounded-lg">
                      <div className="text-2xl font-bold text-purple-600">
                        {selectedProject._count.invoices}
                      </div>
                      <div className="text-sm text-purple-600">Invoices</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabs for Expenses and Time */}
              <div className="mt-6">
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setShowExpenses(true)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        showExpenses
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Expenses
                    </button>
                    <button
                      onClick={() => setShowExpenses(false)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        !showExpenses
                          ? "border-blue-500 text-blue-600"
                          : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                      }`}
                    >
                      Time Tracking
                    </button>
                  </nav>
                </div>

                <div className="mt-4">
                  {showExpenses ? (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Project Expenses
                      </h3>
                      {expenses.length > 0 ? (
                        <div className="space-y-3">
                          {expenses.map((expense) => (
                            <div
                              key={expense.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">
                                  {expense.description}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {expense.category} •{" "}
                                  {formatDate(expense.date)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {formatCurrency(expense.amount)}
                                </p>
                                {expense.billId && (
                                  <p className="text-sm text-gray-500">
                                    Bill: {expense.billId}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No expenses recorded for this project.
                        </p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-lg font-medium text-gray-900 mb-4">
                        Time Tracking
                      </h3>
                      {timeEntries.length > 0 ? (
                        <div className="space-y-3">
                          {timeEntries.map((entry) => (
                            <div
                              key={entry.id}
                              className="flex justify-between items-center p-3 bg-gray-50 rounded-lg"
                            >
                              <div>
                                <p className="font-medium">
                                  {entry.description}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {entry.employeeName} •{" "}
                                  {formatDate(entry.date)}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-medium">
                                  {entry.hours}h @ {formatCurrency(entry.rate)}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {formatCurrency(entry.total)}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-center py-8">
                          No time entries recorded for this project.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create/Edit Project Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                {editingProject ? "Edit Project" : "Create New Project"}
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project name"
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
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Customer *
                    </label>
                    <select
                      value={formData.customerId}
                      onChange={(e) =>
                        setFormData({ ...formData, customerId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          status: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {projectStatuses.map((status) => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Start Date *
                    </label>
                    <input
                      type="date"
                      value={formData.startDate}
                      onChange={(e) =>
                        setFormData({ ...formData, startDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={formData.endDate}
                      onChange={(e) =>
                        setFormData({ ...formData, endDate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Budget *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.budget}
                      onChange={(e) =>
                        setFormData({ ...formData, budget: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hourly Rate
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.hourlyRate}
                      onChange={(e) =>
                        setFormData({ ...formData, hourlyRate: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project Manager
                  </label>
                  <select
                    value={formData.managerId}
                    onChange={(e) =>
                      setFormData({ ...formData, managerId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select manager</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.displayName}
                      </option>
                    ))}
                  </select>
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
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter project notes"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsModalOpen(false);
                    setEditingProject(null);
                    setFormData({
                      name: "",
                      description: "",
                      customerId: "",
                      startDate: new Date().toISOString().split("T")[0],
                      endDate: "",
                      status: "PLANNING",
                      budget: "",
                      hourlyRate: "",
                      managerId: "",
                      notes: "",
                    });
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={
                    editingProject ? handleUpdateProject : handleCreateProject
                  }
                >
                  {editingProject ? "Update Project" : "Create Project"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="fixed bottom-4 right-4 bg-red-50 border border-red-200 rounded-md p-4 max-w-sm">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <p className="text-red-800">{error}</p>
            <button
              onClick={() => setError(null)}
              className="ml-auto text-red-600 hover:text-red-800"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

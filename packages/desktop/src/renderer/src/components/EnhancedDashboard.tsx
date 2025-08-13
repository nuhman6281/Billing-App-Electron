import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  FileText, 
  Calendar,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  AlertCircle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Award,
  Globe,
  Building2
} from "lucide-react";

interface DashboardMetrics {
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  profitMargin: number;
  revenueGrowth: number;
  expenseGrowth: number;
  outstandingInvoices: string;
  overdueBills: string;
  cashFlow: string;
  totalCustomers: number;
  totalVendors: number;
  activeProjects: number;
  monthlyRecurringRevenue: string;
  customerSatisfaction: number;
  employeeProductivity: number;
}

interface RecentActivity {
  id: string;
  type: "INVOICE" | "BILL" | "PAYMENT" | "CUSTOMER" | "VENDOR";
  action: string;
  amount?: string;
  timestamp: string;
  status: "SUCCESS" | "PENDING" | "FAILED" | "WARNING";
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: any;
  href: string;
  color: string;
}

const quickActions: QuickAction[] = [
  {
    id: "create-invoice",
    title: "Create Invoice",
    description: "Generate a new invoice for customers",
    icon: FileText,
    href: "/invoices",
    color: "bg-green-500 hover:bg-green-600"
  },
  {
    id: "record-payment",
    title: "Record Payment",
    description: "Record customer or vendor payments",
    icon: DollarSign,
    href: "/payments",
    color: "bg-blue-500 hover:bg-blue-600"
  },
  {
    id: "add-customer",
    title: "Add Customer",
    description: "Create a new customer account",
    icon: Users,
    href: "/customers",
    color: "bg-purple-500 hover:bg-purple-600"
  },
  {
    id: "generate-report",
    title: "Generate Report",
    description: "Create financial reports and analytics",
    icon: BarChart3,
    href: "/reports",
    color: "bg-orange-500 hover:bg-orange-600"
  }
];

export default function EnhancedDashboard() {
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: "0.00",
    totalExpenses: "0.00",
    netProfit: "0.00",
    profitMargin: 0,
    revenueGrowth: 0,
    expenseGrowth: 0,
    outstandingInvoices: "0.00",
    overdueBills: "0.00",
    cashFlow: "0.00",
    totalCustomers: 0,
    totalVendors: 0,
    activeProjects: 0,
    monthlyRecurringRevenue: "0.00",
    customerSatisfaction: 0,
    employeeProductivity: 0
  });
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem("token");
      
      // Fetch dashboard metrics
      const metricsResponse = await fetch("http://localhost:3001/api/dashboard/metrics", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (metricsResponse.ok) {
        const metricsData = await metricsResponse.json();
        setMetrics(metricsData);
      }

      // Fetch recent activity
      const activityResponse = await fetch("http://localhost:3001/api/dashboard/activity", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (activityResponse.ok) {
        const activityData = await activityResponse.json();
        setRecentActivity(activityData);
      }

    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setError("Failed to load dashboard data");
    } finally {
      setIsLoading(false);
    }
  };

  const getGrowthIcon = (value: number) => {
    if (value > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (value < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Activity className="h-4 w-4 text-gray-600" />;
  };

  const getGrowthColor = (value: number) => {
    if (value > 0) return "text-green-600";
    if (value < 0) return "text-red-600";
    return "text-gray-600";
  };

  const formatCurrency = (value: string) => {
    return `$${parseFloat(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? '+' : ''}${value.toFixed(1)}%`;
  };

  const getActivityIcon = (type: string) => {
    const icons = {
      INVOICE: FileText,
      BILL: FileText,
      PAYMENT: DollarSign,
      CUSTOMER: Users,
      VENDOR: Building2
    };
    const Icon = icons[type as keyof typeof icons] || Activity;
    return <Icon className="h-4 w-4" />;
  };

  const getStatusColor = (status: string) => {
    const colors = {
      SUCCESS: "text-green-600",
      PENDING: "text-yellow-600",
      FAILED: "text-red-600",
      WARNING: "text-orange-600"
    };
    return colors[status as keyof typeof colors] || "text-gray-600";
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
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome back! 👋</h1>
            <p className="mt-2 text-blue-100">
              Here's what's happening with your business today
            </p>
          </div>
          <div className="text-right">
            <p className="text-blue-100">Today is</p>
            <p className="text-2xl font-bold">{new Date().toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}</p>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action) => {
          const Icon = action.icon;
          return (
            <Card key={action.id} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${action.color} text-white`}>
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">{action.title}</h3>
                    <p className="text-sm text-gray-500">{action.description}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(metrics.totalRevenue)}</div>
            <div className="flex items-center mt-1">
              {getGrowthIcon(metrics.revenueGrowth)}
              <span className={`ml-1 text-sm ${getGrowthColor(metrics.revenueGrowth)}`}>
                {formatPercentage(metrics.revenueGrowth)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(metrics.netProfit) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.netProfit)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.profitMargin.toFixed(1)}% margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Cash Flow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(metrics.cashFlow) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(metrics.cashFlow)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Net cash position
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">MRR</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(metrics.monthlyRecurringRevenue)}</div>
            <div className="text-sm text-gray-500 mt-1">
              Monthly recurring revenue
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Business Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial Health */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Target className="h-5 w-5 mr-2 text-green-600" />
              Financial Health
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Outstanding Invoices</span>
              <span className="font-medium text-orange-600">{formatCurrency(metrics.outstandingInvoices)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Overdue Bills</span>
              <span className="font-medium text-red-600">{formatCurrency(metrics.overdueBills)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Profit Margin</span>
              <span className={`font-medium ${metrics.profitMargin >= 15 ? 'text-green-600' : 'text-yellow-600'}`}>
                {metrics.profitMargin.toFixed(1)}%
              </span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status</span>
                <Badge variant={metrics.profitMargin >= 15 ? "default" : "destructive"}>
                  {metrics.profitMargin >= 15 ? "Healthy" : "Needs Attention"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Business Metrics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
              Business Metrics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Customers</span>
              <span className="font-medium text-blue-600">{metrics.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Total Vendors</span>
              <span className="font-medium text-purple-600">{metrics.totalVendors}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Active Projects</span>
              <span className="font-medium text-green-600">{metrics.activeProjects}</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Growth</span>
                <Badge variant="default">
                  {metrics.revenueGrowth > 0 ? "Growing" : "Declining"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Indicators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Award className="h-5 w-5 mr-2 text-purple-600" />
              Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Customer Satisfaction</span>
              <span className="font-medium text-green-600">{metrics.customerSatisfaction}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">Employee Productivity</span>
              <span className="font-medium text-blue-600">{metrics.employeeProductivity}%</span>
            </div>
            <div className="pt-2 border-t">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Overall Rating</span>
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`h-4 w-4 ${i < Math.floor(metrics.customerSatisfaction / 20) ? 'text-yellow-400' : 'text-gray-300'}`} />
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Activity className="h-5 w-5 mr-2 text-gray-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.length > 0 ? (
              recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50">
                  <div className="flex-shrink-0">
                    {getActivityIcon(activity.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {activity.action}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(activity.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {activity.amount && (
                      <span className="text-sm font-medium text-gray-900">
                        {formatCurrency(activity.amount)}
                      </span>
                    )}
                    <Badge variant={activity.status === "SUCCESS" ? "default" : "destructive"}>
                      {activity.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                <p>No recent activity</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Alerts and Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <AlertCircle className="h-5 w-5 mr-2 text-orange-600" />
            Alerts & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {parseFloat(metrics.overdueBills) > 0 && (
              <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-red-800">
                    Overdue Bills Alert
                  </p>
                  <p className="text-sm text-red-700">
                    You have {formatCurrency(metrics.overdueBills)} in overdue bills that require attention.
                  </p>
                </div>
              </div>
            )}

            {parseFloat(metrics.outstandingInvoices) > parseFloat(metrics.totalRevenue) * 0.3 && (
              <div className="flex items-center p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-yellow-800">
                    High Outstanding Invoices
                  </p>
                  <p className="text-sm text-yellow-700">
                    Outstanding invoices represent {((parseFloat(metrics.outstandingInvoices) / parseFloat(metrics.totalRevenue)) * 100).toFixed(1)}% of total revenue.
                  </p>
                </div>
              </div>
            )}

            {metrics.profitMargin < 15 && (
              <div className="flex items-center p-3 bg-orange-50 border border-orange-200 rounded-lg">
                <TrendingDown className="h-5 w-5 text-orange-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-orange-800">
                    Low Profit Margin Warning
                  </p>
                  <p className="text-sm text-orange-700">
                    Your current profit margin of {metrics.profitMargin.toFixed(1)}% is below the recommended 15%.
                  </p>
                </div>
              </div>
            )}

            {metrics.revenueGrowth > 10 && (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Strong Growth Performance
                  </p>
                  <p className="text-sm text-green-700">
                    Congratulations! Your revenue has grown by {metrics.revenueGrowth.toFixed(1)}% this period.
                  </p>
                </div>
              </div>
            )}

            {recentActivity.length === 0 && (
              <div className="text-center py-4 text-gray-500">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-400" />
                <p>All systems are running smoothly!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-md">
          <p className="text-red-800">{error}</p>
        </div>
      )}
    </div>
  );
}

// Simple Star component for ratings
function Star({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}

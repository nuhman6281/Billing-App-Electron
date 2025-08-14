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
  Download,
  Filter,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  AlertCircle,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface FinancialMetrics {
  totalRevenue: string;
  totalExpenses: string;
  netProfit: string;
  profitMargin: number;
  revenueGrowth: number;
  expenseGrowth: number;
  outstandingInvoices: string;
  overdueBills: string;
  cashFlow: string;
  accountsReceivable: string;
  accountsPayable: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    backgroundColor?: string[];
    borderColor?: string;
    fill?: boolean;
  }[];
}

interface TimeSeriesData {
  date: string;
  revenue: number;
  expenses: number;
  profit: number;
}

export default function Reports() {
  const { getAccessToken } = useAuth();
  const [selectedPeriod, setSelectedPeriod] = useState("30");
  const [selectedReport, setSelectedReport] = useState("overview");
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: "0.00",
    totalExpenses: "0.00",
    netProfit: "0.00",
    profitMargin: 0,
    revenueGrowth: 0,
    expenseGrowth: 0,
    outstandingInvoices: "0.00",
    overdueBills: "0.00",
    cashFlow: "0.00",
    accountsReceivable: "0.00",
    accountsPayable: "0.00",
  });
  const [revenueChartData, setRevenueChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });
  const [expenseChartData, setExpenseChartData] = useState<ChartData>({
    labels: [],
    datasets: [],
  });
  const [cashFlowData, setCashFlowData] = useState<TimeSeriesData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchReportData();
  }, [selectedPeriod, selectedReport]);

  const fetchReportData = async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      // Fetch financial metrics
      const metricsData = await api.get<any>(
        `${API_ENDPOINTS.REPORTS.METRICS}?period=${selectedPeriod}`,
        token
      );
      if (metricsData.success && metricsData.data) {
        setMetrics(metricsData.data);
      }

      // Fetch chart data
      const chartData = await api.get<any>(
        `${API_ENDPOINTS.REPORTS.CHARTS}?period=${selectedPeriod}`,
        token
      );
      if (chartData.success && chartData.data) {
        setRevenueChartData(chartData.data.revenue);
        setExpenseChartData(chartData.data.expenses);
      }

      // Fetch cash flow data
      const cashFlowData = await api.get<any>(
        `${API_ENDPOINTS.REPORTS.CASH_FLOW}?period=${selectedPeriod}`,
        token
      );
      if (cashFlowData.success && cashFlowData.data) {
        setCashFlowData(cashFlowData.data);
      }
    } catch (error) {
      console.error("Error fetching report data:", error);
      setError("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (format: "pdf" | "csv" | "excel") => {
    try {
      const token = getAccessToken();
      if (!token) {
        setError("No authentication token available");
        return;
      }

      // Use the centralized API service instead of hardcoded URL
      const response = await api.get<any>(
        `${API_ENDPOINTS.REPORTS.EXPORT}?format=${format}&period=${selectedPeriod}`,
        token
      );

      // Handle blob response for file download
      if (response && response.blob) {
        const url = window.URL.createObjectURL(response.blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `financial-report-${selectedPeriod}days.${format}`;
        a.click();
        window.URL.revokeObjectURL(url);
      } else {
        throw new Error("Invalid export response");
      }
    } catch (error) {
      console.error("Error exporting report:", error);
      setError("Failed to export report");
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
    return `$${parseFloat(value).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatPercentage = (value: number) => {
    return `${value > 0 ? "+" : ""}${value.toFixed(1)}%`;
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
            Financial Reports & Analytics
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Comprehensive financial insights and business intelligence
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => exportReport("pdf")}>
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </Button>
          <Button variant="outline" onClick={() => exportReport("excel")}>
            <Download className="h-4 w-4 mr-2" />
            Export Excel
          </Button>
        </div>
      </div>

      {/* Period and Report Type Selectors */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Time Period
              </label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7">Last 7 days</option>
                <option value="30">Last 30 days</option>
                <option value="90">Last 90 days</option>
                <option value="365">Last year</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Report Type
              </label>
              <select
                value={selectedReport}
                onChange={(e) => setSelectedReport(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="overview">Overview</option>
                <option value="revenue">Revenue Analysis</option>
                <option value="expenses">Expense Analysis</option>
                <option value="cashflow">Cash Flow</option>
                <option value="profitability">Profitability</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Key Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <div className="flex items-center mt-1">
              {getGrowthIcon(metrics.revenueGrowth)}
              <span
                className={`ml-1 text-sm ${getGrowthColor(metrics.revenueGrowth)}`}
              >
                {formatPercentage(metrics.revenueGrowth)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(metrics.totalExpenses)}
            </div>
            <div className="flex items-center mt-1">
              {getGrowthIcon(metrics.expenseGrowth)}
              <span
                className={`ml-1 text-sm ${getGrowthColor(metrics.expenseGrowth)}`}
              >
                {formatPercentage(metrics.expenseGrowth)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Net Profit
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${parseFloat(metrics.netProfit) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(metrics.netProfit)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              {metrics.profitMargin.toFixed(1)}% margin
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Cash Flow
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${parseFloat(metrics.cashFlow) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(metrics.cashFlow)}
            </div>
            <div className="text-sm text-gray-500 mt-1">Net cash position</div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Financial Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Accounts Receivable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-blue-600">
              {formatCurrency(metrics.accountsReceivable)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Outstanding: {formatCurrency(metrics.outstandingInvoices)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">
              Accounts Payable
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold text-orange-600">
              {formatCurrency(metrics.accountsPayable)}
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Overdue: {formatCurrency(metrics.overdueBills)}
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
                <BarChart3 className="h-4 w-4 mr-2" />
                Detailed Analysis
              </Button>
              <Button variant="outline" size="sm" className="w-full">
                <Filter className="h-4 w-4 mr-2" />
                Custom Reports
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              {revenueChartData.labels.length > 0 ? (
                <div className="text-center">
                  <BarChart3 className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">
                    Revenue chart would be rendered here
                  </p>
                  <p className="text-sm text-gray-400">
                    Using Chart.js or similar library
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <BarChart3 className="h-16 w-16 mx-auto mb-2" />
                  <p>No revenue data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Expense Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingDown className="h-5 w-5 mr-2 text-red-600" />
              Expense Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              {expenseChartData.labels.length > 0 ? (
                <div className="text-center">
                  <PieChart className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                  <p className="text-gray-500">
                    Expense chart would be rendered here
                  </p>
                  <p className="text-sm text-gray-400">
                    Using Chart.js or similar library
                  </p>
                </div>
              ) : (
                <div className="text-center text-gray-500">
                  <PieChart className="h-16 w-16 mx-auto mb-2" />
                  <p>No expense data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <LineChart className="h-5 w-5 mr-2 text-blue-600" />
            Cash Flow Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-80 flex items-center justify-center bg-gray-50 rounded-lg">
            {cashFlowData.length > 0 ? (
              <div className="text-center">
                <LineChart className="h-16 w-16 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-500">
                  Cash flow chart would be rendered here
                </p>
                <p className="text-sm text-gray-400">
                  Showing revenue, expenses, and profit over time
                </p>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                <LineChart className="h-16 w-16 mx-auto mb-2" />
                <p>No cash flow data available</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Financial Insights */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Insights & Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {parseFloat(metrics.profitMargin.toString()) < 15 && (
              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-yellow-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-yellow-800">
                      Low Profit Margin
                    </h4>
                    <p className="text-yellow-700 text-sm mt-1">
                      Your current profit margin of{" "}
                      {metrics.profitMargin.toFixed(1)}% is below the
                      recommended 15%. Consider reviewing pricing strategies and
                      cost controls.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {parseFloat(metrics.overdueBills) > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-red-800">Overdue Bills</h4>
                    <p className="text-red-700 text-sm mt-1">
                      You have {formatCurrency(metrics.overdueBills)} in overdue
                      bills. Review payment terms and consider early payment
                      discounts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {parseFloat(metrics.outstandingInvoices) >
              parseFloat(metrics.accountsPayable) * 1.5 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <AlertCircle className="h-5 w-5 text-blue-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-blue-800">
                      High Accounts Receivable
                    </h4>
                    <p className="text-blue-700 text-sm mt-1">
                      Your accounts receivable is significantly higher than
                      accounts payable. Consider implementing stricter payment
                      terms or early payment incentives.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {metrics.revenueGrowth > 10 && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <TrendingUp className="h-5 w-5 text-green-600 mr-2" />
                  <div>
                    <h4 className="font-medium text-green-800">
                      Strong Revenue Growth
                    </h4>
                    <p className="text-green-700 text-sm mt-1">
                      Congratulations! Your revenue has grown by{" "}
                      {metrics.revenueGrowth.toFixed(1)}% in the selected
                      period. This indicates strong business performance.
                    </p>
                  </div>
                </div>
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

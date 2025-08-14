import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Receipt,
  Building2,
  BarChart3,
  Plus,
  Eye,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { api, API_ENDPOINTS } from "../config/api";

interface FinancialMetrics {
  totalAssets: number;
  totalLiabilities: number;
  totalEquity: number;
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  cashBalance: number;
  accountsReceivable: number;
  accountsPayable: number;
}

interface RecentTransaction {
  id: string;
  type: "journal_entry" | "invoice" | "bill" | "payment";
  reference: string;
  description: string;
  amount: number;
  date: string;
  status: string;
}

const Dashboard: React.FC = () => {
  const { user, getAccessToken } = useAuth();
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<
    RecentTransaction[]
  >([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const token = getAccessToken();
      if (!token) {
        console.error("No authentication token available");
        return;
      }

      // Fetch financial metrics from Chart of Accounts
      const accountsData = await api.get<any>(
        API_ENDPOINTS.CHART_OF_ACCOUNTS.LIST,
        token
      );
      const accounts = accountsData?.data || [];

      // Calculate financial metrics
      const calculatedMetrics: FinancialMetrics = {
        totalAssets: 0,
        totalLiabilities: 0,
        totalEquity: 0,
        totalRevenue: 0,
        totalExpenses: 0,
        netIncome: 0,
        cashBalance: 0,
        accountsReceivable: 0,
        accountsPayable: 0,
      };

      accounts.forEach((account: any) => {
        const balance = parseFloat(account.balance);

        switch (account.type) {
          case "ASSET":
            calculatedMetrics.totalAssets += balance;
            if (account.code === "1100")
              calculatedMetrics.cashBalance = balance;
            if (account.code === "1200")
              calculatedMetrics.accountsReceivable = balance;
            break;
          case "LIABILITY":
            calculatedMetrics.totalLiabilities += balance;
            if (account.code === "3100")
              calculatedMetrics.accountsPayable = balance;
            break;
          case "EQUITY":
            calculatedMetrics.totalEquity += balance;
            break;
          case "REVENUE":
            calculatedMetrics.totalRevenue += balance;
            break;
          case "EXPENSE":
            calculatedMetrics.totalExpenses += balance;
            break;
        }
      });

      calculatedMetrics.netIncome =
        calculatedMetrics.totalRevenue - calculatedMetrics.totalExpenses;
      setMetrics(calculatedMetrics);

      // Fetch recent journal entries
      const journalData = await api.get<any>(
        `${API_ENDPOINTS.JOURNAL_ENTRIES.LIST}?limit=5`,
        token
      );
      const transactions: RecentTransaction[] = (
        journalData?.data?.entries || []
      ).map((entry: any) => ({
        id: entry.id,
        type: "journal_entry" as const,
        reference: entry.number,
        description: entry.description,
        amount:
          entry.lines.reduce(
            (sum: number, line: any) =>
              sum + parseFloat(line.debit) + parseFloat(line.credit),
            0
          ) / 2,
        date: entry.date,
        status: entry.status,
      }));
      setRecentTransactions(transactions);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "posted":
        return "bg-green-100 text-green-800";
      case "draft":
        return "bg-yellow-100 text-yellow-800";
      case "voided":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">
            Welcome back, {user?.displayName || user?.username}
          </p>
        </div>
        <div className="flex space-x-3">
          <Button variant="outline" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            New Journal Entry
          </Button>
          <Button variant="outline" size="sm">
            <Receipt className="w-4 h-4 mr-2" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assets</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalAssets || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Cash: {formatCurrency(metrics?.cashBalance || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Liabilities
            </CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalLiabilities || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              A/P: {formatCurrency(metrics?.accountsPayable || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Equity</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(metrics?.totalEquity || 0)}
            </div>
            <p className="text-xs text-muted-foreground">Net Worth</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Net Income</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${(metrics?.netIncome || 0) >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {formatCurrency(metrics?.netIncome || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Revenue: {formatCurrency(metrics?.totalRevenue || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Balance Sheet Summary</CardTitle>
            <CardDescription>Key financial position indicators</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Working Capital</span>
              <span className="text-sm font-semibold">
                {formatCurrency(
                  (metrics?.totalAssets || 0) - (metrics?.totalLiabilities || 0)
                )}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Debt-to-Equity Ratio</span>
              <span className="text-sm font-semibold">
                {metrics?.totalEquity
                  ? (
                      (metrics.totalLiabilities / metrics.totalEquity) *
                      100
                    ).toFixed(1) + "%"
                  : "N/A"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Ratio</span>
              <span className="text-sm font-semibold">
                {metrics?.totalLiabilities
                  ? (metrics.totalAssets / metrics.totalLiabilities).toFixed(2)
                  : "N/A"}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cash Flow Summary</CardTitle>
            <CardDescription>Cash position and receivables</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Cash Balance</span>
              <span className="text-sm font-semibold text-green-600">
                {formatCurrency(metrics?.cashBalance || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Accounts Receivable</span>
              <span className="text-sm font-semibold text-blue-600">
                {formatCurrency(metrics?.accountsReceivable || 0)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Accounts Payable</span>
              <span className="text-sm font-semibold text-red-600">
                {formatCurrency(metrics?.accountsPayable || 0)}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
          <CardDescription>
            Latest journal entries and financial activities
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recentTransactions.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No recent transactions found</p>
              <p className="text-sm">
                Create your first journal entry to get started
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((transaction) => (
                <div
                  key={transaction.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">
                        {transaction.reference}
                      </p>
                      <p className="text-sm text-gray-600">
                        {transaction.description}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="font-semibold text-sm">
                      {formatCurrency(transaction.amount)}
                    </span>
                    <Badge className={getStatusColor(transaction.status)}>
                      {transaction.status}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {new Date(transaction.date).toLocaleDateString()}
                    </span>
                    <Button variant="ghost" size="sm">
                      <Eye className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Common tasks and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <FileText className="w-6 h-6 mb-2" />
              <span className="text-sm">Journal Entry</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Receipt className="w-6 h-6 mb-2" />
              <span className="text-sm">Create Invoice</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Building2 className="w-6 h-6 mb-2" />
              <span className="text-sm">Record Bill</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <BarChart3 className="w-6 h-6 mb-2" />
              <span className="text-sm">View Reports</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;

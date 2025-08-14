import express from "express";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../database";

const router = express.Router();

// Get financial metrics
router.get(
  "/metrics",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { period = "30" } = req.query;

      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get revenue (invoices)
      const revenueData = await prisma.invoice.aggregate({
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: "PAID",
        },
        _sum: { total: true },
      });

      // Get expenses (bills)
      const expenseData = await prisma.bill.aggregate({
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: "PAID",
        },
        _sum: { total: true },
      });

      // Get outstanding invoices
      const outstandingInvoices = await prisma.invoice.aggregate({
        where: {
          companyId,
          status: { in: ["SENT", "OVERDUE"] },
        },
        _sum: { total: true },
      });

      // Get overdue bills
      const overdueBills = await prisma.bill.aggregate({
        where: {
          companyId,
          status: "OVERDUE",
        },
        _sum: { total: true },
      });

      const totalRevenue = revenueData._sum.total || 0;
      const totalExpenses = expenseData._sum.total || 0;
      const netProfit = totalRevenue - totalExpenses;
      const profitMargin =
        totalRevenue !== 0 ? (netProfit / totalRevenue) * 100 : 0;

      res.json({
        success: true,
        data: {
          totalRevenue: totalRevenue.toString(),
          totalExpenses: totalExpenses.toString(),
          netProfit: netProfit.toString(),
          profitMargin,
          revenueGrowth: 0, // Placeholder - would need historical data
          expenseGrowth: 0, // Placeholder - would need historical data
          outstandingInvoices: outstandingInvoices._sum.total || 0,
          overdueBills: overdueBills._sum.total || 0,
          cashFlow: netProfit.toString(),
          accountsReceivable: outstandingInvoices._sum.total || 0,
          accountsPayable: overdueBills._sum.total || 0,
        },
      });
    } catch (error) {
      console.error("Error fetching financial metrics:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch financial metrics",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Get chart data
router.get(
  "/charts",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { period = "30" } = req.query;

      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get revenue by day
      const revenueByDay = await prisma.invoice.groupBy({
        by: ["createdAt"],
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: "PAID",
        },
        _sum: { total: true },
        orderBy: { createdAt: "asc" },
      });

      // Get expenses by day
      const expensesByDay = await prisma.bill.groupBy({
        by: ["createdAt"],
        where: {
          companyId,
          createdAt: { gte: startDate },
          status: "PAID",
        },
        _sum: { total: true },
        orderBy: { createdAt: "asc" },
      });

      // Format data for charts
      const revenueChart = {
        labels: revenueByDay.map(
          (item) => item.createdAt.toISOString().split("T")[0]
        ),
        datasets: [
          {
            label: "Revenue",
            data: revenueByDay.map((item) =>
              parseFloat((item._sum.total || 0).toString())
            ),
            backgroundColor: "rgba(34, 197, 94, 0.2)",
            borderColor: "rgb(34, 197, 94)",
            fill: false,
          },
        ],
      };

      const expenseChart = {
        labels: expensesByDay.map(
          (item) => item.createdAt.toISOString().split("T")[0]
        ),
        datasets: [
          {
            label: "Expenses",
            data: expensesByDay.map((item) =>
              parseFloat((item._sum.total || 0).toString())
            ),
            backgroundColor: "rgba(239, 68, 68, 0.2)",
            borderColor: "rgb(239, 68, 68)",
            fill: false,
          },
        ],
      };

      res.json({
        success: true,
        data: {
          revenue: revenueChart,
          expenses: expenseChart,
        },
      });
    } catch (error) {
      console.error("Error fetching chart data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch chart data",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Get cash flow data
router.get(
  "/cash-flow",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { period = "30" } = req.query;

      const days = parseInt(period as string);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get cash flow data by day using Prisma queries
      const payments = await prisma.payment.findMany({
        where: {
          companyId,
          createdAt: { gte: startDate },
        },
        select: {
          createdAt: true,
          type: true,
          amount: true,
        },
        orderBy: { createdAt: "asc" },
      });

      // Group payments by date and calculate totals
      const cashFlowByDate = new Map();

      payments.forEach((payment) => {
        const date = payment.createdAt.toISOString().split("T")[0];
        const amount = parseFloat(payment.amount.toString());

        if (!cashFlowByDate.has(date)) {
          cashFlowByDate.set(date, {
            date,
            revenue: 0,
            expenses: 0,
            profit: 0,
          });
        }

        const dayData = cashFlowByDate.get(date);

        if (payment.type === "RECEIVED") {
          dayData.revenue += amount;
          dayData.profit += amount;
        } else if (payment.type === "SENT") {
          dayData.expenses += amount;
          dayData.profit -= amount;
        }
      });

      const cashFlowData = Array.from(cashFlowByDate.values());

      res.json({
        success: true,
        data: cashFlowData,
      });
    } catch (error) {
      console.error("Error fetching cash flow data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch cash flow data",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Export report
router.get(
  "/export",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const { companyId } = req.user!;
      const { format = "pdf", period = "30" } = req.query;

      // This would typically generate and return a file
      // For now, just return success
      res.json({
        success: true,
        message: `Report exported in ${format} format for ${period} days`,
        data: {
          downloadUrl: `/api/reports/download/report-${period}days.${format}`,
        },
      });
    } catch (error) {
      console.error("Error exporting report:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export report",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;

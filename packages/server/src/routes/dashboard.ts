import express from "express";
import { authenticateToken, AuthenticatedRequest } from "../middleware/auth";
import { ChartOfAccountService } from "../models/ChartOfAccount";
import { InvoiceService } from "../models/Invoice";
import { BillService } from "../models/Bill";
import { CustomerService } from "../models/Customer";
import { VendorService } from "../models/Vendor";
import { JournalEntryService } from "../models/JournalEntry";
import prisma from "../database";

const router = express.Router();

// Initialize services
const chartOfAccountService = new ChartOfAccountService(prisma);
const invoiceService = new InvoiceService(prisma);
const billService = new BillService(prisma);
const customerService = new CustomerService(prisma);
const vendorService = new VendorService(prisma);
const journalEntryService = new JournalEntryService(prisma);

// Get dashboard metrics
router.get(
  "/metrics",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const companyId = req.user?.companyId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, message: "Company ID is required" });
      }

      // Get counts for different entities
      const [
        totalCustomers,
        totalVendors,
        totalInvoices,
        totalBills,
        totalAccounts,
        totalJournalEntries,
      ] = await Promise.all([
        customerService.getCount(companyId),
        vendorService.getCount(companyId),
        invoiceService.getCount(companyId),
        billService.getCount(companyId),
        chartOfAccountService.getCount(companyId),
        journalEntryService.getCount(companyId),
      ]);

      // Calculate basic metrics
      const metrics = {
        totalCustomers,
        totalVendors,
        totalInvoices,
        totalBills,
        totalAccounts,
        totalJournalEntries,
        totalRevenue: 0, // Will be calculated from invoices
        totalExpenses: 0, // Will be calculated from bills
        netIncome: 0,
      };

      res.json({
        success: true,
        data: metrics,
      });
    } catch (error) {
      console.error("Dashboard metrics error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

// Get recent activity
router.get(
  "/activity",
  authenticateToken,
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.userId;
      const companyId = req.user?.companyId;

      if (!userId) {
        return res
          .status(401)
          .json({ success: false, message: "Unauthorized" });
      }

      if (!companyId) {
        return res
          .status(400)
          .json({ success: false, message: "Company ID is required" });
      }

      // Get recent activities from different entities
      const recentActivities: Array<{
        id: string;
        type: string;
        action: string;
        description: string;
        amount: any;
        date: Date;
        status: any;
      }> = [];

      // Get recent invoices
      const recentInvoices = await invoiceService.getRecent(5, companyId);
      recentInvoices.forEach((invoice) => {
        recentActivities.push({
          id: invoice.id,
          type: "invoice",
          action: "created",
          description: `Invoice ${invoice.number} created for ${invoice.customer?.name || "Customer"}`,
          amount: invoice.total,
          date: invoice.createdAt,
          status: invoice.status,
        });
      });

      // Get recent bills
      const recentBills = await billService.getRecent(5, companyId);
      recentBills.forEach((bill) => {
        recentActivities.push({
          id: bill.id,
          type: "bill",
          action: "created",
          description: `Bill ${bill.number} received from ${bill.vendor?.name || "Vendor"}`,
          amount: bill.total,
          date: bill.createdAt,
          status: bill.status,
        });
      });

      // Get recent journal entries
      const recentEntries = await journalEntryService.getRecent(5, companyId);
      recentEntries.forEach((entry) => {
        recentActivities.push({
          id: entry.id,
          type: "journal_entry",
          action: "created",
          description: `Journal entry ${entry.number} posted`,
          amount: 0, // Journal entries don't have a single amount
          date: entry.createdAt,
          status: entry.status,
        });
      });

      // Sort by date (most recent first)
      recentActivities.sort(
        (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
      );

      res.json({
        success: true,
        data: recentActivities.slice(0, 10), // Return top 10 most recent
      });
    } catch (error) {
      console.error("Dashboard activity error:", error);
      res.status(500).json({
        success: false,
        message: "Internal Server Error",
        code: "INTERNAL_ERROR",
      });
    }
  }
);

export default router;

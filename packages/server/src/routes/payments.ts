import express from "express";
import { authenticateToken } from "../middleware/auth";
import { AuthenticatedRequest } from "../middleware/auth";
import prisma from "../database";

const router = express.Router();

// Get all payments
router.get("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const payments = await prisma.payment.findMany({
      where: { companyId },
      include: {
        invoice: true,
        bill: true,
        vendor: true,
        customer: true,
      },
      orderBy: { createdAt: "desc" },
    });

    res.json({
      success: true,
      data: payments,
    });
  } catch (error) {
    console.error("Error fetching payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payments",
      code: "INTERNAL_ERROR",
    });
  }
});

// Get payment stats
router.get("/stats", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    
    const totalPayments = await prisma.payment.count({
      where: { companyId },
    });

    const totalAmount = await prisma.payment.aggregate({
      where: { companyId },
      _sum: { amount: true },
    });

    const thisMonthPayments = await prisma.payment.count({
      where: {
        companyId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const thisMonthAmount = await prisma.payment.aggregate({
      where: {
        companyId,
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
      _sum: { amount: true },
    });

    res.json({
      success: true,
      data: {
        totalPayments,
        totalAmount: totalAmount._sum.amount || "0",
        thisMonthPayments,
        thisMonthAmount: thisMonthAmount._sum.amount || "0",
      },
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment stats",
      code: "INTERNAL_ERROR",
    });
  }
});

// Create new payment
router.post("/", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const paymentData = req.body;

    const payment = await prisma.payment.create({
      data: {
        ...paymentData,
        companyId,
      },
      include: {
        invoice: true,
        bill: true,
        vendor: true,
        customer: true,
      },
    });

    res.status(201).json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error creating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment",
      code: "INTERNAL_ERROR",
    });
  }
});

// Update payment
router.put("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;
    const updateData = req.body;

    const payment = await prisma.payment.update({
      where: { id, companyId },
      data: updateData,
      include: {
        invoice: true,
        bill: true,
        vendor: true,
        customer: true,
      },
    });

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error updating payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment",
      code: "INTERNAL_ERROR",
    });
  }
});

// Delete payment
router.delete("/:id", authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { companyId } = req.user!;
    const { id } = req.params;

    await prisma.payment.delete({
      where: { id, companyId },
    });

    res.json({
      success: true,
      message: "Payment deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting payment:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete payment",
      code: "INTERNAL_ERROR",
    });
  }
});

export default router;

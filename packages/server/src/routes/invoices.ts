import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Invoices service is running",
    timestamp: new Date().toISOString(),
  });
});

export const invoiceRoutes = router;

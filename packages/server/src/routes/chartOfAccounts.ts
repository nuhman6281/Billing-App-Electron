import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Chart of Accounts service is running",
    timestamp: new Date().toISOString(),
  });
});

export const chartOfAccountsRoutes = router;

import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Cost Centers service is running",
    timestamp: new Date().toISOString(),
  });
});

export const costCenterRoutes = router;

import { Router } from "express";

const router = Router();

router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Journal Entries service is running",
    timestamp: new Date().toISOString(),
  });
});

export const journalEntriesRoutes = router;

import { Router } from "express";
import { authRateLimiter } from "../middleware/rateLimiter";

const router = Router();

// Apply rate limiting to auth routes
router.use(authRateLimiter);

// Health check endpoint
router.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Auth service is running",
    timestamp: new Date().toISOString(),
  });
});

// Placeholder endpoints - will be implemented later
router.post("/login", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Login endpoint not yet implemented",
    code: "NOT_IMPLEMENTED",
  });
});

router.post("/register", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Register endpoint not yet implemented",
    code: "NOT_IMPLEMENTED",
  });
});

router.post("/refresh", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Refresh token endpoint not yet implemented",
    code: "NOT_IMPLEMENTED",
  });
});

router.post("/logout", (req, res) => {
  res.status(501).json({
    success: false,
    message: "Logout endpoint not yet implemented",
    code: "NOT_IMPLEMENTED",
  });
});

export const authRoutes = router;

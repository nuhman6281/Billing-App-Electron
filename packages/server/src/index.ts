import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import morgan from "morgan";
import { config } from "./config";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import { logger } from "./utils/logger";

// Import routes
import { authRoutes } from "./routes/auth";
import chartOfAccountsRoutes from "./routes/chartOfAccounts";
import companyRoutes from "./routes/companies";
import journalEntriesRoutes from "./routes/journalEntries";
import customerRoutes from "./routes/customers";
import vendorRoutes from "./routes/vendors";
import invoiceRoutes from "./routes/invoices";
import billRoutes from "./routes/bills";

const app = express();

// Security middleware
app.use(helmet());
app.use(
  cors({
    origin: config.cors.origin,
    credentials: true,
  })
);

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    code: "RATE_LIMIT_EXCEEDED",
  },
});
app.use("/api/", limiter);

// Logging middleware
app.use(
  morgan("combined", {
    stream: {
      write: (message: string) => logger.info(message.trim()),
    },
  })
);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({
    success: true,
    message: "Billing App Server is running",
    timestamp: new Date().toISOString(),
    version: config.version,
    environment: config.env,
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/chart-of-accounts", chartOfAccountsRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/journal-entries", journalEntriesRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/bills", billRoutes);

// 404 handler
app.use(notFoundHandler);

// Error handler
app.use(errorHandler);

// Start server
const PORT = config.port || 3001;

app.listen(PORT, () => {
  logger.info("Application initialized successfully", {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });

  logger.info(`Server is running on port ${PORT}`, {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });

  logger.info(`Environment: ${config.env}`, {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });

  logger.info(`Version: ${config.version}`, {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM received, shutting down gracefully", {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });

  process.exit(0);
});

process.on("SIGINT", () => {
  logger.info("SIGINT received, shutting down gracefully", {
    service: "billing-app-server",
    version: config.version,
    environment: config.env,
  });

  process.exit(0);
});

export default app;

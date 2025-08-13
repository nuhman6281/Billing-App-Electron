import express from "express";
import { createServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { config } from "./config";
import { logger } from "./utils/logger";
import { errorHandler } from "./middleware/errorHandler";
import { notFoundHandler } from "./middleware/errorHandler";
import { rateLimiter } from "./middleware/rateLimiter";
import { requestLogger } from "./middleware/requestLogger";

// Import routes
import { authRoutes } from "./routes/auth";
import { userRoutes } from "./routes/users";
import { chartOfAccountsRoutes } from "./routes/chartOfAccounts";
import { journalEntriesRoutes } from "./routes/journalEntries";
import { invoiceRoutes } from "./routes/invoices";
import { billRoutes } from "./routes/bills";
import { customerRoutes } from "./routes/customers";
import { vendorRoutes } from "./routes/vendors";
import { paymentRoutes } from "./routes/payments";
import { projectRoutes } from "./routes/projects";
import { costCenterRoutes } from "./routes/costCenters";
import { reportRoutes } from "./routes/reports";

// Import setup functions
// import { setupSocketIO } from './socket';
// import { setupDatabase } from './database';
// import { setupRedis } from './database/redis';
// import { setupQueue } from './queue';

class App {
  public app: express.Application;
  public server: any;
  public io: SocketIOServer;

  constructor() {
    this.app = express();
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: config.websocket.cors.origin,
        methods: ["GET", "POST"],
        credentials: true,
      },
      pingTimeout: config.websocket.pingTimeout,
      pingInterval: config.websocket.pingInterval,
    });

    this.initializeMiddlewares();
    this.initializeRoutes();
    this.initializeErrorHandling();
  }

  private initializeMiddlewares(): void {
    // Security middleware
    this.app.use(helmet());
    this.app.use(
      cors({
        origin: config.cors.origin,
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      })
    );
    this.app.use(compression());

    // Body parsing
    this.app.use(express.json({ limit: "10mb" }));
    this.app.use(express.urlencoded({ extended: true, limit: "10mb" }));

    // Logging
    this.app.use(
      morgan("combined", {
        stream: { write: (message: string) => logger.info(message.trim()) },
      })
    );
    this.app.use(requestLogger);

    // Rate limiting
    this.app.use(rateLimiter);

    // Health check
    this.app.get("/health", (req, res) => {
      res.json({
        success: true,
        message: "Server is running",
        timestamp: new Date().toISOString(),
        version: config.version,
        environment: config.env,
      });
    });
  }

  private initializeRoutes(): void {
    // API routes
    this.app.use("/api/auth", authRoutes);
    this.app.use("/api/users", userRoutes);
    this.app.use("/api/chart-of-accounts", chartOfAccountsRoutes);
    this.app.use("/api/journal-entries", journalEntriesRoutes);
    this.app.use("/api/invoices", invoiceRoutes);
    this.app.use("/api/bills", billRoutes);
    this.app.use("/api/customers", customerRoutes);
    this.app.use("/api/vendors", vendorRoutes);
    this.app.use("/api/payments", paymentRoutes);
    this.app.use("/api/projects", projectRoutes);
    this.app.use("/api/cost-centers", costCenterRoutes);
    this.app.use("/api/reports", reportRoutes);

    // 404 handler
    this.app.use(notFoundHandler);
  }

  private initializeErrorHandling(): void {
    this.app.use(errorHandler);
  }

  public async initialize(): Promise<void> {
    try {
      // Initialize services
      // await setupDatabase();
      // await setupRedis();
      // await setupQueue();

      // Setup Socket.IO
      // setupSocketIO(this.io);

      logger.info("Application initialized successfully");
    } catch (error) {
      logger.error("Failed to initialize application", {
        error: (error as Error).message,
      });
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      // Close services
      // await closeDatabase();
      // await closeRedis();
      // await closeQueue();

      this.server.close();
      logger.info("Application closed successfully");
    } catch (error) {
      logger.error("Failed to close application", {
        error: (error as Error).message,
      });
    }
  }

  public listen(): void {
    this.server.listen(config.port, () => {
      logger.info(`Server is running on port ${config.port}`);
      logger.info(`Environment: ${config.env}`);
      logger.info(`Version: ${config.version}`);
    });
  }
}

// Create and start the application
const app = new App();

// Handle graceful shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down gracefully");
  await app.close();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down gracefully");
  await app.close();
  process.exit(0);
});

// Initialize and start the server
app
  .initialize()
  .then(() => {
    app.listen();
  })
  .catch((error) => {
    logger.error("Failed to start application", {
      error: (error as Error).message,
    });
    process.exit(1);
  });

export default app;

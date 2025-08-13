import { PrismaClient } from "@prisma/client";
import logger from "../utils/logger";

const prisma = new PrismaClient({
  log: [
    {
      emit: "event",
      level: "query",
    },
    {
      emit: "event",
      level: "error",
    },
    {
      emit: "event",
      level: "info",
    },
    {
      emit: "event",
      level: "warn",
    },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === "development") {
  prisma.$on("query", (e) => {
    logger.debug("Database query", {
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    });
  });
}

prisma.$on("error", (e) => {
  logger.error("Database error", {
    error: e.message,
    target: e.target,
  });
});

export const setupDatabase = async (): Promise<void> => {
  try {
    await prisma.$connect();
    logger.info("Database connected successfully");
  } catch (error) {
    logger.error("Failed to connect to database", {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const closeDatabase = async (): Promise<void> => {
  try {
    await prisma.$disconnect();
    logger.info("Database disconnected successfully");
  } catch (error) {
    logger.error("Failed to disconnect from database", {
      error: (error as Error).message,
    });
  }
};

export default prisma;

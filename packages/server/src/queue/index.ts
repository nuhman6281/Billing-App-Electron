import Bull from "bull";
import { config } from "../config";
import logger from "../utils/logger";

let emailQueue: Bull.Queue;
let reportQueue: Bull.Queue;
let backupQueue: Bull.Queue;

export const setupQueue = async (): Promise<void> => {
  try {
    // Email queue for sending emails
    emailQueue = new Bull("email", {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        password: config.queue.redis.password,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: config.queue.defaultJobOptions.removeOnComplete,
        removeOnFail: config.queue.defaultJobOptions.removeOnFail,
        attempts: config.queue.defaultJobOptions.attempts,
        backoff: {
          type: "exponential",
          delay: config.queue.defaultJobOptions.backoff.delay,
        },
      },
    });

    // Report generation queue
    reportQueue = new Bull("reports", {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        password: config.queue.redis.password,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: config.queue.defaultJobOptions.removeOnComplete,
        removeOnFail: config.queue.defaultJobOptions.removeOnFail,
        attempts: config.queue.defaultJobOptions.attempts,
        backoff: {
          type: "exponential",
          delay: config.queue.defaultJobOptions.backoff.delay,
        },
      },
    });

    // Backup queue
    backupQueue = new Bull("backup", {
      redis: {
        host: config.queue.redis.host,
        port: config.queue.redis.port,
        password: config.queue.redis.password,
        db: config.queue.redis.db,
      },
      defaultJobOptions: {
        removeOnComplete: config.queue.defaultJobOptions.removeOnComplete,
        removeOnFail: config.queue.defaultJobOptions.removeOnFail,
        attempts: config.queue.defaultJobOptions.attempts,
        backoff: {
          type: "exponential",
          delay: config.queue.defaultJobOptions.backoff.delay,
        },
      },
    });

    // Queue event handlers
    [emailQueue, reportQueue, backupQueue].forEach((queue) => {
      queue.on("completed", (job) => {
        logger.info("Job completed", { queue: queue.name, jobId: job.id });
      });

      queue.on("failed", (job, err) => {
        logger.error("Job failed", {
          queue: queue.name,
          jobId: job.id,
          error: err.message,
        });
      });

      queue.on("error", (error) => {
        logger.error("Queue error", {
          queue: queue.name,
          error: error.message,
        });
      });
    });

    logger.info("Queue system initialized successfully");
  } catch (error) {
    logger.error("Failed to initialize queue system", {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const closeQueue = async (): Promise<void> => {
  try {
    await Promise.all([
      emailQueue?.close(),
      reportQueue?.close(),
      backupQueue?.close(),
    ]);
    logger.info("Queue system closed successfully");
  } catch (error) {
    logger.error("Failed to close queue system", {
      error: (error as Error).message,
    });
  }
};

export const getEmailQueue = (): Bull.Queue => emailQueue;
export const getReportQueue = (): Bull.Queue => reportQueue;
export const getBackupQueue = (): Bull.Queue => backupQueue;

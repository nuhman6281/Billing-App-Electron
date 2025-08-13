import Redis from "ioredis";
import { config } from "../config";
import logger from "../utils/logger";

let redis: Redis;

export const setupRedis = async (): Promise<void> => {
  try {
    redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      keyPrefix: config.redis.keyPrefix,
      lazyConnect: true,
    });

    redis.on("connect", () => {
      logger.info("Redis connected successfully");
    });

    redis.on("error", (error) => {
      logger.error("Redis error", { error: error.message });
    });

    redis.on("close", () => {
      logger.warn("Redis connection closed");
    });

    redis.on("reconnecting", () => {
      logger.info("Redis reconnecting...");
    });

    await redis.connect();
  } catch (error) {
    logger.error("Failed to connect to Redis", {
      error: (error as Error).message,
    });
    throw error;
  }
};

export const closeRedis = async (): Promise<void> => {
  try {
    if (redis) {
      await redis.quit();
      logger.info("Redis disconnected successfully");
    }
  } catch (error) {
    logger.error("Failed to disconnect from Redis", {
      error: (error as Error).message,
    });
  }
};

export const getRedis = (): Redis => {
  if (!redis) {
    throw new Error("Redis not initialized. Call setupRedis() first.");
  }
  return redis;
};

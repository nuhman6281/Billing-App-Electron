import { Request, Response, NextFunction } from "express";
import morgan from "morgan";
import logger from "../utils/logger";

// Custom morgan token for request body size
morgan.token("body-size", (req: Request) => {
  const body = req.body;
  if (!body) return "0";
  return JSON.stringify(body).length.toString();
});

// Custom morgan token for response time in milliseconds
morgan.token("response-time-ms", (req: Request, res: Response) => {
  const responseTime = res.getHeader("X-Response-Time");
  return responseTime ? `${responseTime}ms` : "0ms";
});

// Custom morgan token for user agent
morgan.token("user-agent", (req: Request) => {
  return req.get("User-Agent") || "Unknown";
});

// Custom morgan token for IP address
morgan.token("ip-address", (req: Request) => {
  return req.ip || req.connection.remoteAddress || "Unknown";
});

// Custom morgan token for request ID
morgan.token("request-id", (req: Request) => {
  const requestId = req.headers["x-request-id"];
  return Array.isArray(requestId)
    ? requestId[0] || "Unknown"
    : requestId || "Unknown";
});

// Custom morgan format
const morganFormat =
  ":method :url :status :response-time-ms :body-size :ip-address :user-agent :request-id";

export const requestLogger = morgan(morganFormat, {
  stream: {
    write: (message: string) => {
      logger.info(message.trim());
    },
  },
  skip: (req: Request, res: Response) => {
    // Skip logging for health checks and static assets
    return req.url === "/health" || req.url.startsWith("/static/");
  },
});

export const requestLoggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const start = Date.now();

  // Add response time header
  res.on("finish", () => {
    const duration = Date.now() - start;
    res.setHeader("X-Response-Time", duration);

    // Log request details
    logger.info("Request completed", {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get("User-Agent"),
      requestId: req.headers["x-request-id"],
      contentLength: res.get("Content-Length") || "0",
    });
  });

  next();
};

export const logRequest = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  logger.info("Incoming request", {
    method: req.method,
    url: req.url,
    query: req.query,
    body: req.body,
    headers: {
      "user-agent": req.get("User-Agent"),
      "content-type": req.get("Content-Type"),
      authorization: req.get("Authorization") ? "[REDACTED]" : undefined,
    },
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date().toISOString(),
  });

  next();
};

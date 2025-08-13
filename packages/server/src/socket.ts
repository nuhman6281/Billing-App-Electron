import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import { config } from "./config";
import logger from "./utils/logger";

export const setupSocketIO = (httpServer: HTTPServer): SocketIOServer => {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: config.websocket.cors.origin,
      methods: ["GET", "POST"],
      credentials: true,
    },
    pingTimeout: config.websocket.pingTimeout,
    pingInterval: config.websocket.pingInterval,
  });

  io.on("connection", (socket) => {
    logger.info("Client connected", { socketId: socket.id });

    socket.on("disconnect", () => {
      logger.info("Client disconnected", { socketId: socket.id });
    });

    socket.on("error", (error) => {
      logger.error("Socket error", {
        socketId: socket.id,
        error: error.message,
      });
    });
  });

  logger.info("Socket.IO server initialized");
  return io;
};

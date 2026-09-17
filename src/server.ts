import { Server } from "http";
import app from "./app";
import config from "./config";
import { connectedDB } from "./app/db/connected.db";
import { prisma } from "./app/lib/prisma";

let server: Server;
const port = config.port;

const bootstrap = async () => {
  try {
    // 1. Connect to Database first
    await connectedDB();

    // 2. Start HTTP server
    server = app.listen(port, () => {
      console.log(`🚀 [Server]: Running in ${config.NODE_ENV} mode on http://localhost:${port}`);
    });
  } catch (error) {
    console.error("❌ [Server]: Failed to start server:", error);
    process.exit(1);
  }

  const exitHandler = async () => {
    try {
      if (server) {
        server.close(async () => {
          console.log("🛑 [Server]: Closed");
          await prisma.$disconnect();
          console.log("🛑 [Database]: Prisma disconnected");
          process.exit(0);
        });
      } else {
        await prisma.$disconnect();
        process.exit(0);
      }
    } catch (err) {
      console.error("❌ [Server]: Error during shutdown:", err);
      process.exit(1);
    }
  };

  process.on("uncaughtException", (error) => {
    console.error("❌ Uncaught Exception:", error);
    exitHandler();
  });

  process.on("unhandledRejection", (error) => {
    console.error("❌ Unhandled Rejection:", error);
    exitHandler();
  });

  process.on("SIGTERM", () => {
    console.log("⚠️ SIGTERM received. Shutting down gracefully...");
    exitHandler();
  });

  process.on("SIGINT", () => {
    console.log("⚠️ SIGINT received. Shutting down gracefully...");
    exitHandler();
  });
};

bootstrap();


import { prisma } from "../lib/prisma";

export const connectedDB = async (): Promise<void> => {
  try {
    await prisma.$connect();
    console.log("✅ [Database]: MongoDB connected successfully via Prisma");
  } catch (error) {
    console.error("❌ [Database]: Connection failed:", error);
    process.exit(1);
  }
};


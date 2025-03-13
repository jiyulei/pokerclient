// server/src/game/prisma.js
import { PrismaClient } from "@prisma/client";

// 创建一个完全重置 Prisma 客户端的函数
const createPrismaClient = () => {
  // 先尝试断开任何现有连接
  if (global.prisma) {
    try {
      global.prisma.$disconnect();
    } catch (e) {
      console.error("Error disconnecting existing Prisma client:", e);
    }
  }

  // 创建新的客户端实例
  return new PrismaClient({
    log: ["error", "warn"],
    errorFormat: "pretty",
  });
};

// 全局单例
const globalForPrisma = global;

// 使用函数创建客户端
const prisma = globalForPrisma.prisma || createPrismaClient();

// 只在非生产环境缓存实例
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

import { PrismaClient } from "@prisma/client";

// 添加这些选项可以帮助调试
const prismaClientSingleton = () => {
  return new PrismaClient({
    log: ["error", "warn"],
    errorFormat: "pretty",
  });
};

// 确保使用正确的全局对象
const globalForPrisma = global;

// 使用类型检查和明确的赋值
const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

// 只在非生产环境缓存实例
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export default prisma;

//   const resolvers = {
//      Mutation: {
//        playerAction: async (_, { gameId, playerId, action, amount }) => {
//          try {
//            return await GameManager.handlePlayerAction(gameId, playerId, action, amount);
//          } catch (error) {
//            // 处理数据库连接错误
//            if (error.message.includes("prepared statement")) {
//              console.error("数据库连接错误，尝试重新连接");
//              // 可以在这里添加重试逻辑
//            }
//            throw error;
//          }
//        }
//      }
//    };

// 在项目根目录创建 prisma.js
import { PrismaClient } from "@prisma/client";

const prisma = global.prisma || new PrismaClient();
if (process.env.NODE_ENV !== "production") global.prisma = prisma;

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
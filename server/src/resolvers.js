// Todo: romove console.log and error handling
import { PubSub } from "graphql-subscriptions";
import prisma from "./game/prisma.js";
import GameManager from "./game/GameManager.js";

const pubsub = new PubSub();
// 增加最大监听器数量，避免警告
if (
  pubsub.eventEmitter &&
  typeof pubsub.eventEmitter.setMaxListeners === "function"
) {
  pubsub.eventEmitter.setMaxListeners(100);
}

// 跟踪活跃连接
const activeConnections = new Map();

// 定期清理不活跃连接（每5分钟）
setInterval(async () => {
  console.log(`清理不活跃连接，当前连接数: ${activeConnections.size}`);
  const now = Date.now();
  const inactiveThreshold = 10 * 60 * 1000; // 10分钟不活跃视为断开

  for (const [connectionId, connection] of activeConnections.entries()) {
    if (now - connection.lastActive > inactiveThreshold) {
      console.log(`移除不活跃连接: ${connectionId}`);
      activeConnections.delete(connectionId);
    }
  }
}, 5 * 60 * 1000);

const resolvers = {
  Query: {
    books: async () => {
      try {
        const books = await prisma.book.findMany();
        console.log("🟢 查询到的 books:", books);
        return books;
      } catch (error) {
        console.error("❌ Prisma 查询失败:", error);
        throw new Error("数据库查询失败");
      }
    },
    game: async (_, { id, playerId }) => {
      const game = await prisma.game.findUnique({
        where: { id },
        include: { players: true },
      });
      if (!game) throw new Error("Game not found");

      const gameInstance = GameManager.games.get(id);
      if (!gameInstance) throw new Error("Game instance not found in memory");

      let gameState = gameInstance.getGameState(playerId);

      return {
        ...game,
        availableActions: playerId ? gameState.availableActions : [],
        messages: gameState.messages.broadcast.concat(
          gameState.messages.private
        ),
        isYourTurn: gameState.isYourTurn,
      };
    },
    games: async () => {
      const games = await prisma.game.findMany({
        include: { players: true },
      });
      return games;
    },
    player: async (_, { id }) => {
      const player = await prisma.player.findUnique({ where: { id } });
      return player;
    },
    players: async (_, { gameId }) => {
      const players = await prisma.player.findMany({ where: { gameId } });
      return players;
    },
  },
  Mutation: {
    addBook: async (_, { title, author }) => {
      try {
        const book = await prisma.book.create({
          data: { title, author },
        });
        pubsub.publish("BOOK_ADDED", { bookAdded: book });
        console.log("🟢 新增书籍:", book);
        return book;
      } catch (error) {
        console.error("❌ Prisma 插入失败:", error);
        throw new Error("插入失败");
      }
    },
    createGame: async (_, args) => {
      const game = await GameManager.createGame(args);
      // 使用游戏ID作为事件名的一部分
      pubsub.publish(`GAME_${game.id}_STATE_CHANGED`, {
        gameStateChanged: game,
      });
      return game;
    },
    joinGame: async (_, { gameId, name, userId }) => {
      const player = await GameManager.joinGame(gameId, { name, userId });

      // 获取更新后的游戏状态
      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      // 发布玩家状态变更事件
      pubsub.publish(`PLAYER_${gameId}_STATE_CHANGED`, {
        playerStateChanged: player,
      });

      // 同时发布游戏状态变更事件，这样所有订阅者都能收到新玩家加入的通知
      pubsub.publish(`GAME_${gameId}_STATE_CHANGED`, {
        gameStateChanged: {
          ...updatedGame,
          // 添加游戏实例中的状态信息
          availableActions: [],
          isYourTurn: false,
          messages: [
            {
              id: `join_${Date.now()}`,
              content: `${player.name} has joined the game`,
              timestamp: Date.now(),
              type: "broadcast",
            },
          ],
        },
      });

      return player;
    },
    startGame: async (_, { gameId }) => {
      const game = GameManager.games.get(gameId);
      if (!game) throw new Error("Game not found");
      game.startGame();
      await GameManager.syncGameState(gameId);

      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish(`GAME_${gameId}_STATE_CHANGED`, {
        gameStateChanged: updatedGame,
      });
      return updatedGame;
    },
    playerAction: async (_, { gameId, playerId, action, amount }) => {
      await GameManager.handlePlayerAction(gameId, playerId, action, amount);
      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish(`GAME_${gameId}_STATE_CHANGED`, {
        gameStateChanged: updatedGame,
      });
      return updatedGame;
    },
    endGame: async (_, { gameId }) => {
      await GameManager.endGame(gameId);
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish(`GAME_${gameId}_STATE_CHANGED`, {
        gameStateChanged: game,
      });
      return game;
    },
    leaveGame: async (_, { gameId, playerId }) => {
      const updatedGame = await GameManager.leaveGame(gameId, playerId);

      if (updatedGame && updatedGame.players) {
        // 过滤掉已标记为移除的玩家
        updatedGame.players = updatedGame.players.filter(
          (p) => !p.markedForRemoval
        );
      }

      // 发布游戏状态变更事件
      pubsub.publish(`GAME_${gameId}_STATE_CHANGED`, {
        gameStateChanged: {
          ...updatedGame,
          availableActions: null,
          isYourTurn: null,
          messages: [], // 只包含广播消息
        },
      });

      return updatedGame;
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(["BOOK_ADDED"]),
    },
    gameStateChanged: {
      subscribe: (_, { gameId, playerId }, context) => {
        // 生成唯一的连接ID
        const connectionId = `${gameId}:${
          playerId || "anonymous"
        }:${Date.now()}`;

        // 记录连接信息
        activeConnections.set(connectionId, {
          gameId,
          playerId,
          lastActive: Date.now(),
          context,
        });

        // 使用游戏特定的事件通道
        const asyncIterator = pubsub.asyncIterableIterator([
          `GAME_${gameId}_STATE_CHANGED`,
        ]);

        // 当连接关闭时清理 - 安全检查
        if (
          context &&
          context.connection &&
          typeof context.connection.onClose === "function"
        ) {
          context.connection.onClose(() => {
            console.log(`连接关闭，清理: ${connectionId}`);
            activeConnections.delete(connectionId);
          });
        } else {
          // 对于没有 connection 对象的情况，可以设置一个备用的清理机制
          console.log(
            `警告: 连接 ${connectionId} 没有 context.connection 对象`
          );
          // 可以在这里设置一个定时器来检查这个连接是否还活跃
        }

        // 创建一个包装的迭代器
        return {
          [Symbol.asyncIterator]: async function* () {
            try {
              for await (const value of asyncIterator) {
                // 更新最后活跃时间
                if (activeConnections.has(connectionId)) {
                  activeConnections.get(connectionId).lastActive = Date.now();
                }

                // 如果提供了playerId，则获取针对该玩家的游戏状态
                if (playerId && value.gameStateChanged) {
                  const gameInstance = GameManager.games.get(gameId);
                  if (gameInstance) {
                    try {
                      const playerSpecificState =
                        gameInstance.getGameState(playerId);
                      // 合并通用游戏状态和玩家特定状态
                      value.gameStateChanged = {
                        ...value.gameStateChanged,
                        availableActions:
                          playerSpecificState.availableActions || [],
                        isYourTurn: playerSpecificState.isYourTurn || false,
                        messages: [
                          ...(playerSpecificState.messages.broadcast || []),
                          ...(playerSpecificState.messages.private || []),
                        ],
                      };
                    } catch (error) {
                      console.error(`获取玩家 ${playerId} 状态时出错:`, error);
                    }
                  }
                }

                yield value;
              }
            } catch (error) {
              console.error(`订阅迭代器错误 (${connectionId}):`, error);
              // 确保清理连接
              activeConnections.delete(connectionId);
              throw error; // 重新抛出错误以便客户端知道出了问题
            } finally {
              // 确保在迭代器结束时清理
              console.log(`订阅迭代器结束，清理: ${connectionId}`);
              activeConnections.delete(connectionId);
            }
          },
        };
      },
    },
    playerStateChanged: {
      subscribe: (_, { gameId, playerId }) => {
        // 使用游戏特定的玩家状态事件通道
        return pubsub.asyncIterableIterator([`PLAYER_${gameId}_STATE_CHANGED`]);
      },
    },
  },
  Game: {
    players: async (parent) => {
      if (parent.players) return parent.players;
      return prisma.player.findMany({ where: { gameId: parent.id } });
    },
  },
};

export default resolvers;

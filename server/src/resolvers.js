// Todo: romove console.log and error handling
import { PubSub } from "graphql-subscriptions";
import prisma from "./game/prisma.js";
import GameManager from "./game/GameManager.js";

const pubsub = new PubSub();

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
      pubsub.publish("GAME_STATE_CHANGED", { gameStateChanged: game });
      return game;
    },
    joinGame: async (_, { gameId, name, userId }) => {
      const player = await GameManager.joinGame(gameId, { name, userId });
      pubsub.publish("PLAYER_STATE_CHANGED", { playerStateChanged: player });
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

      pubsub.publish("GAME_STATE_CHANGED", { gameStateChanged: updatedGame });
      return updatedGame;
    },
    playerAction: async (_, { gameId, playerId, action, amount }) => {
      await GameManager.handlePlayerAction(gameId, playerId, action, amount);
      const updatedGame = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish("GAME_STATE_CHANGED", { gameStateChanged: updatedGame });
      return updatedGame;
    },
    endGame: async (_, { gameId }) => {
      await GameManager.endGame(gameId);
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish("GAME_STATE_CHANGED", { gameStateChanged: game });
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
      pubsub.publish("GAME_STATE_CHANGED", {
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
      subscribe: (_, { gameId, playerId }) => {
        const game = GameManager.games.get(gameId);
        if (!game) throw new Error("游戏不存在");

        return {
          [Symbol.asyncIterator]: () => {
            const asyncIterator =
              pubsub.asyncIterableIterator("GAME_STATE_CHANGED");
            const filteredAsyncIterator = (async function* () {
              for await (const value of asyncIterator) {
                if (value.gameStateChanged.id === gameId) {
                  // 如果提供了 playerId，则获取针对该玩家的游戏状态
                  if (playerId) {
                    const gameInstance = GameManager.games.get(gameId);
                    if (gameInstance) {
                      const playerSpecificState =
                        gameInstance.getGameState(playerId);
                      // 合并通用游戏状态和玩家特定状态
                      value.gameStateChanged = {
                        ...value.gameStateChanged,
                        availableActions: playerSpecificState.availableActions,
                        isYourTurn: playerSpecificState.isYourTurn,
                        messages: [
                          ...playerSpecificState.messages.broadcast,
                          ...playerSpecificState.messages.private,
                        ],
                      };
                    }
                  }
                  yield value;
                }
              }
            })();
            return filteredAsyncIterator;
          },
        };
      },
    },
    playerStateChanged: {
      subscribe: () => pubsub.asyncIterableIterator(["PLAYER_STATE_CHANGED"]),
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

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
    endGame: async (_, { gameId }) => {
      await GameManager.endGame(gameId);
      const game = await prisma.game.findUnique({
        where: { id: gameId },
        include: { players: true },
      });

      pubsub.publish("GAME_STATE_CHANGED", { gameStateChanged: game });
      return game;
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(["BOOK_ADDED"]),
    },
    gameStateChanged: {
      subscribe: () => pubsub.asyncIterableIterator(["GAME_STATE_CHANGED"]),
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

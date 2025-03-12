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
    game: async (_, { id }) => {
      const game = await prisma.game.findUnique({
        where: { id },
        include: { players: true },
      });
      return game;
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
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(["BOOK_ADDED"]),
    },
    gameStateChanged: {
      subscribe: () => pubsub.asyncIterableIterator(["GAME_STATE_CHANGED"]),
    },
  },
};

export default resolvers;

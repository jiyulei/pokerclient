import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import http from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { PubSub } from "graphql-subscriptions";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const pubsub = new PubSub();

const typeDefs = `#graphql
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
  }

  type Mutation {
    addBook(title: String!, author: String!): Book
  }

  type Subscription {
    bookAdded: Book
  }
`;

// Todo: romove console.log
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
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator(["BOOK_ADDED"]),
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
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();
app.use(cors());
app.use(express.json());

const httpServer = http.createServer(app);

const wsServer = new WebSocketServer({
  server: httpServer,
  path: "/graphql",
});

const serverCleanup = useServer({ schema }, wsServer);

// Todo: add context for prisma/用户认证    
const server = new ApolloServer({
  schema,
  plugins: [
    ApolloServerPluginDrainHttpServer({ httpServer }),
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

server.start().then(() => {
  app.use("/graphql", expressMiddleware(server));

  httpServer.listen(4000, () => {
    console.log("🚀 Server ready at: http://localhost:4000");
    console.log("🚀 Subscriptions ready at ws://localhost:4000/graphql");
  });
});

import express from "express";
import cors from "cors";
import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import { WebSocketServer } from "ws";
import { useServer } from "graphql-ws/use/ws";
import http from "http";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";
import typeDefs from "./schema.js";
import resolvers from "./resolvers.js";
import GameManager from "./game/GameManager.js";

// 在这里添加进程退出处理代码
process.on("SIGINT", async () => {
  console.log("正在关闭服务器...");
  await GameManager.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("正在关闭服务器...");
  await GameManager.disconnect();
  process.exit(0);
});

const schema = makeExecutableSchema({ typeDefs, resolvers });

const app = express();

// 添加CORS配置
app.use(
  cors({
    origin: ["http://localhost:3000", "https://pokerclient.vercel.app"],
    credentials: true,
  })
);

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

// 先初始化 GameManager，然后再启动 Apollo Server
GameManager.init()
  .then(async () => {
    await server.start();

    app.use("/graphql", expressMiddleware(server));
    const PORT = process.env.PORT || 4000;

    httpServer.listen(PORT, () => {
      console.log(`🚀 Server ready at: http://localhost:${PORT}`);
      console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
    });
  })
  .catch((err) => {
    console.error("❌ Failed to initialize GameManager:", err);
  });

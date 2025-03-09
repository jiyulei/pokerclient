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
  const PORT = process.env.PORT || 4000;

  httpServer.listen(PORT, () => {
    console.log(`🚀 Server ready at: http://localhost:${PORT}`);
    console.log(`🚀 Subscriptions ready at ws://localhost:${PORT}/graphql`);
  });
});

import { ApolloClient, InMemoryCache, split, HttpLink } from "@apollo/client";
import { GraphQLWsLink } from "@apollo/client/link/subscriptions";
import { createClient } from "graphql-ws";
import { getMainDefinition } from "@apollo/client/utilities";

// // GraphQL HTTP API 端点 (Fly.io 部署)
// const httpLink = new HttpLink({
//   uri:
//     process.env.NEXT_PUBLIC_GRAPHQL_HTTP_URL || "http://localhost:4000/graphql",
// });

// // WebSocket API 端点 (Fly.io 部署)
// const wsLink = new GraphQLWsLink(
//   createClient({
//     url:
//       process.env.NEXT_PUBLIC_GRAPHQL_WS_URL || "ws://localhost:4000/graphql",
//   })
// );

const httpLink = new HttpLink({
  uri: "https://pokerclient-production.up.railway.app/graphql",
});

const wsLink = new GraphQLWsLink(
  createClient({
    url: "wss://pokerclient-production.up.railway.app/graphql",
  })
);

// 自动切换 HTTP 和 WebSocket
const splitLink = split(
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link: splitLink,
  cache: new InMemoryCache(),
});

export default client;

import { gql } from "graphql-tag";

// type Book and addBook mutation & bookAdded subscription are for testing
const typeDefs = gql`
  type Book {
    title: String
    author: String
  }

  type Query {
    books: [Book]
    getGameState(tableId: ID!, playerId: ID): GameState
    getAvailableTables: [ID!]!
  }

  type Mutation {
    addBook(title: String!, author: String!): Book
    joinTable(tableId: ID!, playerName: String!, playerId: ID): Player!
    leaveTable(tableId: ID!, playerId: ID!): Boolean!
    startGame(tableId: ID!): Boolean!
    playerAction(
      tableId: ID!
      playerId: ID!
      action: String!
      amount: Int
    ): Boolean!
    spectateTable(tableId: ID!, spectatorName: String!): Boolean!
    stopSpectating(tableId: ID!, spectatorName: String!): Boolean!
  }

  type Subscription {
    bookAdded: Book
    gameStateUpdated(tableId: ID!, playerId: ID): GameState
    playerJoined(tableId: ID!): Player
    playerLeft(tableId: ID!): ID
    gameStarted(tableId: ID!): Boolean
    playerTurn(tableId: ID!, playerId: ID!): Boolean
  }

  type Player {
    id: ID!
    name: String!
    chips: Int!
    position: Int!
    cards: [Card]
    bet: Int!
    folded: Boolean!
    allIn: Boolean!
    isDealer: Boolean!
    isSmallBlind: Boolean!
    isBigBlind: Boolean!
    isCurrentPlayer: Boolean!
  }

  type Card {
    suit: String!
    rank: String!
    code: String!
  }

  type GameState {
    tableId: ID!
    players: [Player!]!
    communityCards: [Card!]!
    pot: Int!
    currentRound: String!
    currentPlayer: Player
    dealerPosition: Int!
    smallBlindPosition: Int!
    bigBlindPosition: Int!
    smallBlindAmount: Int!
    bigBlindAmount: Int!
    isGameInProgress: Boolean!
    isWaiting: Boolean!
    messages: [Message!]!
    availableActions: [String!]
    minimumBet: Int
  }

  type Message {
    id: ID!
    text: String!
    timestamp: String!
    playerId: ID
  }
`;

export default typeDefs;

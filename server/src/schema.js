import { gql } from "graphql-tag";

// type Book and addBook mutation & bookAdded subscription are for testing
const typeDefs = gql`
  type Book {
    title: String
    author: String
  }

  type Game {
    id: ID!
    status: String!
    round: Int!
    currentRound: String
    pot: Int!
    communityCards: [String!]!
    currentPlayerPos: Int
    dealerPos: Int
    smallBlindPos: Int
    bigBlindPos: Int
    currentRoundMaxBet: Int
    mainPot: Int
    sidePots: [Int!]
    initialChips: Int!
    smallBlind: Int!
    bigBlind: Int!
    timeLimit: Int!
    maxPlayers: Int!
    players: [Player!]!
    createdAt: String!
    updatedAt: String!
    availableActions: [String!]
    messages: [Message!]
    isYourTurn: Boolean
  }

  type Player {
    id: ID!
    name: String
    chips: Int!
    currentBet: Int!
    totalBet: Int!
    isFolded: Boolean!
    isAllIn: Boolean!
    hand: [String!]!
    position: Int!
    isActive: Boolean!
    hasChecked: Boolean!
    totalRounds: Int!
  }

  type Message {
    id: ID!
    content: String!
    timestamp: String!
    type: String!
    playerId: ID
  }

  type Query {
    books: [Book]
    game(id: ID!, playerId: ID): Game
    games: [Game!]!
    player(id: ID!): Player
    players(gameId: ID!): [Player!]!
  }

  type Mutation {
    addBook(title: String!, author: String!): Book
    createGame(
      initialChips: Int
      smallBlind: Int
      bigBlind: Int
      maxPlayers: Int
      timeLimit: Int
    ): Game!
    joinGame(gameId: ID!, name: String, userId: String): Player!
    startGame(gameId: ID!): Game!
    playerAction(
      gameId: ID!
      playerId: ID!
      action: String!
      amount: Int
    ): Game!
    endGame(gameId: ID!): Game!
  }

  type Subscription {
    bookAdded: Book
    gameStateChanged(gameId: ID!): Game!
    playerStateChanged(gameId: ID!, playerId: ID!): Player!
  }
`;

export default typeDefs;

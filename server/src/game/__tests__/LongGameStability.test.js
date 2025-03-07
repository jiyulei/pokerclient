const Game = require("../Game").default;
const Player = require("../Player").default;

describe("Long Game Stability Tests", () => {
  let game;

  beforeEach(() => {
    game = new Game({ timeLimit: 10 });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Positions should move correctly over 15 rounds", () => {
    // Add four players
    game.addPlayer("Player1", "p1");
    game.addPlayer("Player2", "p2");
    game.addPlayer("Player3", "p3");
    game.addPlayer("Player4", "p4");

    // Start the game
    game.startGame();

    // Record initial positions
    const initialDealer = game.dealer;

    // Play 15 rounds by directly calling moveButton
    for (let round = 0; round < 15; round++) {
      // Move button manually
      game.moveButton();

      // Calculate expected positions
      const expectedDealer = (initialDealer + round + 1) % 4;
      const expectedSmallBlind = (expectedDealer + 1) % 4;
      const expectedBigBlind = (expectedDealer + 2) % 4;

      // Verify positions for this round
      expect(game.dealer).toBe(expectedDealer);
      expect(game.smallBlindPos).toBe(expectedSmallBlind);
      expect(game.bigBlindPos).toBe(expectedBigBlind);
    }
  });

  test("Positions should remain stable with players joining and leaving", () => {
    // Start with 3 players
    game.addPlayer("Player1", "p1");
    game.addPlayer("Player2", "p2");
    game.addPlayer("Player3", "p3");

    // Start the game
    game.startGame();

    // Record initial dealer position
    const initialDealer = game.dealer;

    // Play 5 rounds by directly calling moveButton
    for (let round = 0; round < 5; round++) {
      // Move button manually
      game.moveButton();

      // Verify dealer position
      expect(game.dealer).toBe((initialDealer + round + 1) % 3);
    }

    // Add a new player
    game.addPlayer("Player4", "p4");

    // Record dealer position before adding player
    const dealerBeforeAddingPlayer = game.dealer;

    // Play 5 more rounds with 4 players
    for (let round = 0; round < 5; round++) {
      // Move button manually
      game.moveButton();

      // Verify dealer position with 4 players
      expect(game.dealer).toBe((dealerBeforeAddingPlayer + round + 1) % 4);
    }

    // Remove a player (the dealer)
    const dealerToRemove = game.dealer;
    const dealerIdToRemove = game.players[dealerToRemove].id;
    game.removePlayer(dealerIdToRemove);

    // Record dealer position after removing player
    const dealerAfterRemovingPlayer = game.dealer;

    // Play 5 more rounds with 3 players again
    for (let round = 0; round < 5; round++) {
      // Move button manually
      game.moveButton();

      // Verify dealer position with 3 players again
      expect(game.dealer).toBe((dealerAfterRemovingPlayer + round + 1) % 3);
    }
  });
});

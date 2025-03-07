const Game = require("../Game").default;
const Player = require("../Player").default;

describe("Special Rules Tests", () => {
  let game;

  beforeEach(() => {
    game = new Game({ timeLimit: 10 });
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("Game should enter waiting state when only one player remains", () => {
    // Add two players
    game.addPlayer("Player1", "p1");
    game.addPlayer("Player2", "p2");

    // Start the game
    game.startGame();

    // Remove one player
    const playerToRemove = game.players[0].id;
    game.removePlayer(playerToRemove);

    // Verify only one player remains
    expect(game.players.length).toBe(1);

    // Start a new hand directly
    game.startNewHand();

    // Verify game has entered waiting state
    expect(game.isWaiting).toBe(true);
    expect(game.currentRound).toBe("waiting");

    // Add a new player
    game.addPlayer("Player3", "p3");

    // Verify game has resumed
    expect(game.isWaiting).toBe(false);
    expect(game.currentRound).toBe("preflop");
  });

  test("First player to act in preflop should be after big blind", () => {
    // Add four players
    game.addPlayer("Player1", "p1");
    game.addPlayer("Player2", "p2");
    game.addPlayer("Player3", "p3");
    game.addPlayer("Player4", "p4");

    // Start the game
    game.startGame();

    // Verify we're in preflop round
    expect(game.currentRound).toBe("preflop");

    // Get big blind position
    const bigBlindPos = game.bigBlindPos;

    // Verify first player to act is after big blind
    expect(game.currentPlayer).toBe((bigBlindPos + 1) % 4);
  });

  test("Small blind should act first in post-flop rounds", () => {
    // Add four players
    game.addPlayer("Player1", "p1");
    game.addPlayer("Player2", "p2");
    game.addPlayer("Player3", "p3");
    game.addPlayer("Player4", "p4");

    // Start the game
    game.startGame();

    // Get small blind position
    const smallBlindPos = game.smallBlindPos;

    // Manually set the game state to flop
    game.currentRound = "flop";
    game.startBettingRound();

    // Verify small blind acts first in flop
    expect(game.currentPlayer).toBe(smallBlindPos);

    // Manually set the game state to turn
    game.currentRound = "turn";
    game.startBettingRound();

    // Verify small blind acts first in turn
    expect(game.currentPlayer).toBe(smallBlindPos);

    // Manually set the game state to river
    game.currentRound = "river";
    game.startBettingRound();

    // Verify small blind acts first in river
    expect(game.currentPlayer).toBe(smallBlindPos);
  });
});

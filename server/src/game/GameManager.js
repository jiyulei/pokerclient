import { PrismaClient } from "@prisma/client";
import Game from "./Game.js";

const prisma = new PrismaClient();

class GameManager {
  constructor() {
    this.games = new Map(); // store game instances, key is gameId
  }

  // create new game
  async createGame(options = {}) {
    const gameRecord = await prisma.game.create({
      data: {
        status: "WAITING",
        initialChips: options.initialChips || 1000,
        smallBlind: options.smallBlind || 5,
        bigBlind: options.bigBlind || 10,
        timeLimit: options.timeLimit || 30,
        maxPlayers: options.maxPlayers || 9,
        communityCards: [],
      },
    });

    const gameInstance = new Game({
      gameId: gameRecord.id,
      ...options,
    });

    this.games.set(gameRecord.id, gameInstance);
    return gameInstance;
  }

  // player join game
  async joinGame(gameId, playerData = {}) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    // if name is not provided, generate a random name
    if (!playerData.name) {
      playerData.name = `Guest${Math.floor(Math.random() * 10000)}`;
    }

    // if userId is not provided (guest), generate a unique ID
    const generatedId = `guest_${Date.now()}_${Math.random()
      .toString(36)
      .substring(2, 11)}`;
    const playerId = playerData.userId || generatedId;

    // create player in database
    const playerRecord = await prisma.player.create({
      data: {
        id: playerId, // use generated ID
        gameId,
        userId: playerData.userId || null, // only logged in users will have userId
        chips: game.initialChips,
        position: game.players.length,
        hand: [],
      },
    });

    // add player to game instance
    const player = game.addPlayer(playerData.name, playerRecord.id);
    await this.syncGameState(gameId);
    return player;
  }

  // get game state
  getGameState(gameId, playerId = null) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");
    return game.getGameState(playerId);
  }

  // handle player action
  async handlePlayerAction(gameId, playerId, action, amount = 0) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    game.handlePlayerAction(playerId, action, amount);
    await this.syncGameState(gameId);
  }

  // sync game state to database
  async syncGameState(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    await prisma.game.update({
      where: { id: gameId },
      data: {
        status: game.isGameInProgress ? "IN_PROGRESS" : "WAITING",
        round: game.round,
        pot: game.pot,
        currentRound: game.currentRound,
        communityCards: game.communityCards.map((card) => card.toString()),
        dealerPos: game.dealer,
        smallBlindPos: game.smallBlindPos,
        bigBlindPos: game.bigBlindPos,
        currentPlayerPos: game.currentPlayer,
        currentRoundMaxBet: game.currentRoundMaxBet,
        mainPot: game.mainPot,
        sidePots: game.sidePots,
      },
    });

    for (const player of game.players) {
      await prisma.player.update({
        where: { id: player.id },
        data: {
          chips: player.chips,
          currentBet: player.currentBet,
          totalBet: player.totalBet,
          isFolded: player.isFolded,
          isAllIn: player.isAllIn,
          hand: player.hand.map((card) => card.toString()),
          position: player.position,
          isActive: player.isActive,
          hasChecked: player.hasChecked,
          totalRounds: { increment: 1 },
        },
      });
    }
  }

  // remove game instance
  removeGame(gameId) {
    this.games.delete(gameId);
  }

  async endGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    // mark game as completed
    await prisma.game.update({
      where: { id: gameId },
      data: { status: "COMPLETED" },
    });

    // remove game from memory
    this.removeGame(gameId);
  }
}

export default new GameManager();

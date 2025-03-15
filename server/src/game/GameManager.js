import prisma from "./prisma.js";
import Game from "./Game.js";

class GameManager {
  constructor() {
    this.games = new Map(); // store game instances, key is gameId
    this.prisma = prisma;
  }

  // 初始化函数，从数据库恢复内存中的游戏实例
  async init() {
    const MAX_RETRIES = 3;
    let retries = 0;

    while (retries < MAX_RETRIES) {
      try {
        const activeGames = await this.prisma.game.findMany({
          where: {
            status: { in: ["WAITING", "IN_PROGRESS"] },
          },
          include: {
            players: true,
          },
        });

        for (const gameRecord of activeGames) {
          const gameInstance = new Game({
            gameId: gameRecord.id,
            initialChips: gameRecord.initialChips,
            smallBlind: gameRecord.smallBlind,
            bigBlind: gameRecord.bigBlind,
            maxPlayers: gameRecord.maxPlayers,
            timeLimit: gameRecord.timeLimit,
            onStateChange: () => this.notifyGameStateChange(gameRecord.id),
          });

          // 恢复玩家到内存实例
          for (const playerRecord of gameRecord.players) {
            gameInstance.addPlayer(
              playerRecord.name || "Guest",
              playerRecord.id
            );
          }

          this.games.set(gameRecord.id, gameInstance);
        }

        console.log(
          `✅ GameManager initialized with ${activeGames.length} active games.`
        );
        return;
      } catch (error) {
        retries++;

        if (
          error.message.includes("prepared statement") &&
          retries < MAX_RETRIES
        ) {
          console.log(
            `⚠️ 数据库连接错误，正在重试 (${retries}/${MAX_RETRIES})...`
          );
          // 断开连接并等待一段时间
          await this.prisma.$disconnect();
          await new Promise((resolve) => setTimeout(resolve, 500 * retries));
          continue;
        }

        // 如果不是连接错误或已达到最大重试次数，抛出错误
        console.error(`❌ 初始化失败 (尝试 ${retries}/${MAX_RETRIES}):`, error);
        throw error;
      }
    }
  }

  // create new game
  async createGame(options = {}) {
    const gameRecord = await this.prisma.game.create({
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
      onStateChange: () => this.notifyGameStateChange(gameRecord.id),
    });

    this.games.set(gameRecord.id, gameInstance);
    return gameRecord;
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

    // if user is guest, don't write userId to prevent foreign key error
    const playerDataForDB = {
      id: playerId,
      gameId,
      chips: game.initialChips,
      position: game.players.length,
      hand: [],
    };

    if (playerData.userId) {
      playerDataForDB.userId = playerData.userId; // only write userId when it exists
    }

    // create player in database
    const playerRecord = await this.prisma.player.create({
      data: playerDataForDB,
    });

    // add player to game instance
    const player = game.addPlayer(playerData.name, playerRecord.id);
    await this.syncGameState(gameId);
    return player;
  }

  async notifyGameStateChange(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found"); 

    const gameState = game.getGameState();
    await this.syncGameState(gameId);

    PubSub.publish("GAME_STATE_CHANGE", { gameStateChanged: gameState });
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

    await this.prisma.$transaction(async (tx) => {
      await tx.game.update({
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
        await tx.player.update({
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
            totalRounds: player.totalRounds,
          },
        });
      }
    });
  }

  //   async syncGameState(gameId) {
  //     const game = this.games.get(gameId);
  //     if (!game) throw new Error("Game not found");

  //     await this.prisma.game.update({
  //       where: { id: gameId },
  //       data: {
  //         status: game.isGameInProgress ? "IN_PROGRESS" : "WAITING",
  //         round: game.round,
  //         pot: game.pot,
  //         currentRound: game.currentRound,
  //         communityCards: game.communityCards.map((card) => card.toString()),
  //         dealerPos: game.dealer,
  //         smallBlindPos: game.smallBlindPos,
  //         bigBlindPos: game.bigBlindPos,
  //         currentPlayerPos: game.currentPlayer,
  //         currentRoundMaxBet: game.currentRoundMaxBet,
  //         mainPot: game.mainPot,
  //         sidePots: game.sidePots,
  //       },
  //     });

  //     for (const player of game.players) {
  //       await this.prisma.player.update({
  //         where: { id: player.id },
  //         data: {
  //           chips: player.chips,
  //           currentBet: player.currentBet,
  //           totalBet: player.totalBet,
  //           isFolded: player.isFolded,
  //           isAllIn: player.isAllIn,
  //           hand: player.hand.map((card) => card.toString()),
  //           position: player.position,
  //           isActive: player.isActive,
  //           hasChecked: player.hasChecked,
  //           totalRounds: player.totalRounds, // 暂时手动控制
  //         },
  //       });
  //     }
  //   }
  // remove game instance
  removeGame(gameId) {
    this.games.delete(gameId);
  }

  async endGame(gameId) {
    const game = this.games.get(gameId);
    if (!game) throw new Error("Game not found");

    // mark game as completed
    await this.prisma.game.update({
      where: { id: gameId },
      data: { status: "COMPLETED" },
    });

    // remove game from memory
    this.removeGame(gameId);
  }

  // 添加关闭连接的方法
  async disconnect() {
    await this.prisma.$disconnect();
  }
}

export default new GameManager();

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
      name: playerData.name,
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

    await this.syncGameState(gameId);
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

    try {
      // 首先获取数据库中存在的玩家
      const existingPlayers = await this.prisma.player.findMany({
        where: { gameId: gameId },
        select: { id: true },
      });

      // 创建一个Set来快速查找玩家ID是否存在
      const existingPlayerIds = new Set(existingPlayers.map((p) => p.id));

      await this.prisma.$transaction(async (tx) => {
        // 更新游戏状态
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

        // 只更新数据库中存在的玩家
        for (const player of game.players) {
          // 检查玩家是否存在于数据库中
          if (existingPlayerIds.has(player.id)) {
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
                markedForRemoval: player.markedForRemoval,
              },
            });
          } else {
            console.warn(`尝试更新不存在的玩家: ${player.id}，将创建新记录`);
            // 如果玩家不存在，创建一个新记录
            await tx.player.create({
              data: {
                id: player.id,
                gameId: gameId,
                name: player.name,
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
                markedForRemoval: player.markedForRemoval,
              },
            });
          }
        }
      });
    } catch (error) {
      console.error(`同步游戏状态失败 (gameId: ${gameId}):`, error);
      throw error;
    }
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

  // 处理玩家离开游戏
  async leaveGame(gameId, playerId) {
    const gameInstance = this.games.get(gameId);
    if (!gameInstance) {
      throw new Error("游戏不存在");
    }

    // 获取游戏当前状态
    const isGameInProgress = gameInstance.isGameInProgress;

    if (!isGameInProgress || gameInstance.isWaiting) {
      // 游戏等待中或未开始，直接移除玩家
      gameInstance.markPlayerForRemoval(playerId);
      // gameInstance.removePlayer(playerId);

      console.log(`玩家 ${playerId} 已从等待中的游戏移除`);
    } else {
      // 游戏进行中
      const player = gameInstance.findPlayerById(playerId);

      if (!player) {
        throw new Error("玩家不存在");
      }

      // 如果玩家当前可以行动且未弃牌，执行fold
      if (!player.isFolded && gameInstance.currentPlayer === player.position) {
        try {
          // 执行 fold 操作
          await this.handlePlayerAction(gameId, playerId, "fold");
          console.log(`玩家 ${playerId} 执行了fold操作`);
        } catch (error) {
          console.error(`玩家 ${playerId} fold操作失败:`, error);
          // 即使fold失败，我们仍然标记玩家为将要离开
        }
      }

      // 标记玩家为"将要离开"状态
      gameInstance.markPlayerForRemoval(playerId);
      console.log(`玩家 ${playerId} 已标记为将在本手牌结束后离开`);
    }

    // 同步游戏状态到数据库
    await this.syncGameState(gameId);

    // 返回更新后的游戏
    return await this.prisma.game.findUnique({
      where: { id: gameId },
      include: { players: true },
    });
  }
}

export default new GameManager();

import Game from "../Game.js";

describe("Game", () => {
  let game;

  beforeEach(() => {
    // 每个测试前重置游戏实例
    game = new Game({
      smallBlind: 10,
      bigBlind: 20,
    });
  });

  test("初始化游戏", () => {
    expect(game.players).toHaveLength(0);
    expect(game.initialChips).toBe(1000);
    expect(game.smallBlind).toBe(10);
    expect(game.bigBlind).toBe(20);
  });

  test("添加玩家", () => {
    const player = game.addPlayer("测试玩家", "test_id_1");
    expect(game.players).toHaveLength(1);
    expect(player.name).toBe("测试玩家");
    expect(player.chips).toBe(1000);
  });

  test("开始游戏需要至少两名玩家", () => {
    expect(() => game.startGame()).toThrow("Need at least 2 players");

    game.addPlayer("玩家1");
    game.addPlayer("玩家2");
    expect(() => game.startGame()).not.toThrow();
  });

  // 1. 基础游戏设置测试
  describe("Game Setup", () => {
    test("should add players correctly", () => {
      game.addPlayer("player1", "id_1");
      game.addPlayer("player2", "id_2");
      expect(game.players.length).toBe(2);
    });

    test("should not allow more than max players", () => {
      for (let i = 0; i < 10; i++) {
        try {
          game.addPlayer(`player${i}`, `id_${i}`);
        } catch (e) {
          // 忽略超出最大玩家数的错误
        }
      }
      expect(game.players.length).toBe(9);
    });
  });

  // 2. 游戏流程测试
  describe("Game Flow", () => {
    beforeEach(() => {
      // 添加测试玩家
      game.addPlayer("player1", "flow_id_1");
      game.addPlayer("player2", "flow_id_2");
      game.addPlayer("player3", "flow_id_3");
    });

    describe("Game Start", () => {
      test("should start game and handle first hand correctly", () => {
        game.startGame(); // 只调用一次 startGame

        // 检查游戏状态
        expect(game.isGameInProgress).toBe(true);

        // 检查发牌
        game.players.forEach((player) => {
          expect(player.hand.length).toBe(2);
        });

        // 检查盲注
        const smallBlindPlayer = game.players[game.smallBlindPos];
        const bigBlindPlayer = game.players[game.bigBlindPos];

        expect(smallBlindPlayer.chips).toBe(990); // 1000 - 10
        expect(bigBlindPlayer.chips).toBe(980); // 1000 - 20
      });
    });

    // 其他测试...
  });

  //   // 3. 玩家行动测试
  //   describe("Player Actions", () => {
  //     beforeEach(() => {
  //       game.addPlayer("player1", 1000);
  //       game.addPlayer("player2", 1000);
  //       game.addPlayer("player3", 1000);
  //       game.startGame();
  //     });

  //     test("should handle fold correctly", () => {
  //       const playerId = game.players[game.currentPlayer].id;
  //       game.handlePlayerAction(playerId, "fold");
  //       expect(game.players[game.currentPlayer].isFolded).toBe(true);
  //     });

  //     test("should handle call correctly", () => {
  //       const playerId = game.players[game.currentPlayer].id;
  //       const initialChips = game.players[game.currentPlayer].chips;
  //       game.handlePlayerAction(playerId, "call");
  //       expect(game.players[game.currentPlayer].chips).toBe(
  //         initialChips - game.bigBlind
  //       );
  //     });

  //     test("should handle raise correctly", () => {
  //       const playerId = game.players[game.currentPlayer].id;
  //       game.handlePlayerAction(playerId, "raise", 40);
  //       expect(game.currentRoundMaxBet).toBe(40);
  //     });
  //   });

  //   // 4. 边池测试
  //   describe("Side Pots", () => {
  //     beforeEach(() => {
  //       game.addPlayer("player1", 100); // 较少筹码
  //       game.addPlayer("player2", 500);
  //       game.addPlayer("player3", 1000);
  //       game.startGame();
  //     });

  //     test("should create side pots when player is all-in", () => {
  //       const player1 = game.findPlayerById(game.players[0].id);
  //       game.handlePlayerAction(player1.id, "allin");

  //       // 其他玩家跟注
  //       const player2 = game.findPlayerById(game.players[1].id);
  //       game.handlePlayerAction(player2.id, "call");

  //       const player3 = game.findPlayerById(game.players[2].id);
  //       game.handlePlayerAction(player3.id, "call");

  //       game.calculatePots();
  //       expect(game.sidePots.length).toBeGreaterThan(0);
  //     });
  //   });

  //   // 5. 位置移动测试
  //   describe("Position Movement", () => {
  //     test("should handle button movement correctly in 2 player game", () => {
  //       game.addPlayer("player1", 1000);
  //       game.addPlayer("player2", 1000);
  //       game.startGame();

  //       const initialDealer = game.dealer;
  //       game.moveButton();
  //       expect(game.dealer).toBe((initialDealer + 1) % 2);
  //     });

  //     test("should handle button movement correctly in multi-player game", () => {
  //       game.addPlayer("player1", 1000);
  //       game.addPlayer("player2", 1000);
  //       game.addPlayer("player3", 1000);
  //       game.startGame();

  //       const initialDealer = game.dealer;
  //       game.moveButton();
  //       expect(game.dealer).toBe((initialDealer + 1) % 3);
  //     });
  //   });
});

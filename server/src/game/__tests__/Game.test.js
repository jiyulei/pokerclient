import Game from "../Game.js";

describe("Game", () => {
  let game;

  beforeEach(() => {
    game = new Game({
      smallBlind: 10,
      bigBlind: 20,
    });
  });

  test("initial game", () => {
    expect(game.players).toHaveLength(0);
    expect(game.initialChips).toBe(1000);
    expect(game.smallBlind).toBe(10);
    expect(game.bigBlind).toBe(20);
  });

  test("add player", () => {
    const player = game.addPlayer("test player", "test_id_1");
    expect(game.players).toHaveLength(1);
    expect(player.name).toBe("test player");
    expect(player.chips).toBe(1000);
  });

  test("start game need at least 2 players", () => {
    expect(() => game.startGame()).toThrow("Need at least 2 players");

    game.addPlayer("player1");
    game.addPlayer("player2");
    expect(() => game.startGame()).not.toThrow();
  });

  // 1. game setup
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
          // ignore error
        }
      }
      expect(game.players.length).toBe(9);
    });
  });

  // 2. game flow
  describe("Game Flow", () => {
    beforeEach(() => {
      // add test players
      game.addPlayer("player1", "flow_id_1");
      game.addPlayer("player2", "flow_id_2");
      game.addPlayer("player3", "flow_id_3");
    });

    describe("Game Start", () => {
      test("should start game and handle first hand correctly", () => {
        game.startGame(); // call once startGame

        // check game status
        expect(game.isGameInProgress).toBe(true);
        // check deal cards
        game.players.forEach((player) => {
          expect(player.hand.length).toBe(2);
        });

        // check blind
        const smallBlindPlayer = game.players[game.smallBlindPos];
        const bigBlindPlayer = game.players[game.bigBlindPos];

        expect(smallBlindPlayer.chips).toBe(990); // 1000 - 10
        expect(bigBlindPlayer.chips).toBe(980); // 1000 - 20
      });
    });

    // other tests...
  });

  // simulate delay environment, call action directly, not wait for real timeout
  jest.useFakeTimers();

  describe("Player Actions Scenarios", () => {
    beforeEach(() => {
      game = new Game({
        smallBlind: 10,
        bigBlind: 20,
        timeLimit: 1,
      });
      // add 3 players
      game.addPlayer("Player1", "p1");
      game.addPlayer("Player2", "p2");
      game.addPlayer("Player3", "p3");
    });

    describe("Preflop Actions", () => {
      test("Players: call, raise, call, call then proceed to flop", () => {
        // start game, auto collect blinds, deal cards, and start pre-betting round
        game.startGame();
        // currentRroundMaxBet should be equal to bigBlind
        expect(game.currentRoundMaxBet).toBe(20);

        // simulate the first player to call:
        const p2 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p2, "call");
        expect(game.currentRoundMaxBet).toBe(20);

        // simulate the next player to raise:
        const p3 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p3, "raise", 40);
        expect(game.currentRoundMaxBet).toBe(50);

        // simulate the third player to call:
        const p1 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p1, "call");
        expect(game.currentRoundMaxBet).toBe(50);

        // simulate the first player to call:
        game.handlePlayerAction(p2, "call");
        // all players' bets are equal, pre-betting round ends, reset currentRoundMaxBet to 0
        expect(game.currentRoundMaxBet).toBe(0);
        // when all players' bets are equal, pre-betting round ends, and enter flop
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(150);
      });

      test("Players: call, call then proceed to flop", () => {
        game.startGame();
        const p1 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p1, "call");

        expect(game.currentRoundMaxBet).toBe(20);

        const p2 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p2, "call");

        expect(game.currentRoundMaxBet).toBe(0);
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(60);
      });

      test("Players: fold, call, then proceed to flop", () => {
        game.startGame();
        expect(game.activePlayers.length).toBe(3);

        const p1 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p1, "fold");

        expect(game.activePlayers.length).toBe(2);
        expect(game.currentRoundMaxBet).toBe(20);

        // simulate the next player to call:
        const p2 = game.players[game.currentPlayer].id;
        game.handlePlayerAction(p2, "call");
        expect(game.currentRoundMaxBet).toBe(0);
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(40);
      });

      describe("Mutiple Raises", () => {
        test("Players: raise, raise, call, call, then proceed to flop", () => {
          game.startGame();
          const p1 = game.players[game.currentPlayer].id;
          game.handlePlayerAction(p1, "raise", 40);
          expect(game.currentRoundMaxBet).toBe(40);

          const p2 = game.players[game.currentPlayer].id;
          game.handlePlayerAction(p2, "raise", 80);
          expect(game.currentRoundMaxBet).toBe(90);

          const p3 = game.players[game.currentPlayer].id;
          game.handlePlayerAction(p3, "call");
          expect(game.currentRoundMaxBet).toBe(90);

          const p4 = game.players[game.currentPlayer].id;
          game.handlePlayerAction(p4, "call");
          expect(game.currentRoundMaxBet).toBe(0);
          expect(game.currentRound).toBe("flop");

          expect(game.pot).toBe(270);
        });
      });

      describe("Mutiple Fold", () => {
        test("Players: fold, fold, then last player wins immediately", () => {
          game.startGame();

          // first player fold
          const dealer = game.players[game.currentPlayer].id;
          game.handlePlayerAction(dealer, "fold");

          expect(game.activePlayers.length).toBe(2);

          // second player fold
          const smallBlind = game.players[game.currentPlayer].id;
          game.handlePlayerAction(smallBlind, "fold");

          expect(game.activePlayers.length).toBe(1);

          // verify the winner gets the pot
          const winner = game.activePlayers[0];
          expect(winner.chips).toBeGreaterThan(1000); // should be more than initial chips
          // fast forward time, wait for new game to start
          jest.advanceTimersByTime(3000);

          // verify the new game has started
          expect(game.round).toBe(2); // second round
          expect(game.currentRound).toBe("preflop");
          expect(game.pot).toBe(30);
          // verify all players' status has been reset
          game.players.forEach((player) => {
            expect(player.isFolded).toBe(false);
            expect(player.hand.length).toBe(2);
          });
        });
      });

      describe("All-in and Side Pot Formation", () => {
        test("Short all-in causes side pots", () => {
          // reset players
          game.players = [];
          game.addPlayer("BigBlind", "p1");
          game.addPlayer("Dealer", "p2");
          game.addPlayer("SmallBlind", "p3");
          game.players[0].chips = 50; // Player1只有50

          const initialChips = {};
          game.players.forEach((player, index) => {
            if (player && player.isActive) {
              initialChips[`p${index + 1}`] = player.chips;
            }
          });

          game.startGame();

          game.handlePlayerAction("p2", "raise", 100);
          game.handlePlayerAction("p3", "call");
          game.handlePlayerAction("p1", "allin");

          expect(game.currentRound).toBe("river");

          const finalChips = {};
          game.players.forEach((player, index) => {
            if (player && player.isActive) {
              finalChips[`p${index + 1}`] = player.chips;
            }
          });
          const totalInitialChips = Object.values(initialChips).reduce(
            (a, b) => a + b,
            0
          );
          const totalFinalChips = Object.values(finalChips).reduce(
            (a, b) => a + b,
            0
          );

          expect(game.round).toBe(1);
          expect(totalFinalChips).toBe(totalInitialChips);

          jest.advanceTimersByTime(3000);
          expect(game.round).toBe(2);
          expect(game.currentRound).toBe("preflop");
        });

        test("When two players go all-in, pot should be correct", () => {
          game.players = [];
          game.addPlayer("BigBlind", "p1");
          game.players[0].chips = 100;

          game.addPlayer("Dealer", "p2");
          game.players[1].chips = 50;

          game.addPlayer("SmallBlind", "p3");
          game.players[2].chips = 50;

          // 记录初始筹码
          const initialChips = {};
          game.players.forEach((player, index) => {
            if (player && player.isActive) {
              initialChips[`p${index + 1}`] = player.chips;
            }
          });

          game.startGame();
          // dealer all-in
          game.handlePlayerAction("p2", "allin");

          expect(game.sidePots.length).toBe(0);
          expect(game.currentRound).toBe("preflop");
          expect(game.pot).toBe(80);

          // small blind all-in
          game.handlePlayerAction("p3", "allin");

          expect(game.currentRound).toBe("preflop");
          expect(game.sidePots.length).toBe(0);
          expect(game.mainPot).toBe(120);
          expect(game.pot).toBe(120);

          // big blind call
          game.handlePlayerAction("p1", "call");

          expect(game.sidePots.length).toBe(0);
          // 1.river: 2 players left 2: preflop: 2 players eliminated(endGame)
          expect(["river", "preflop"]).toContain(game.currentRound);
          // check chips
          // 因为一局结束pot变量被重置为0，所以需要用总筹码来验证
          const finalChips = {};
          game.players.forEach((player, index) => {
            if (player && player.isActive) {
              finalChips[`p${index + 1}`] = player.chips;
            }
          });

          const totalInitialChips = Object.values(initialChips).reduce(
            (a, b) => a + b,
            0
          );
          const totalFinalChips = Object.values(finalChips).reduce(
            (a, b) => a + b,
            0
          );

          expect(totalFinalChips).toBe(totalInitialChips);
        });
      });
    });

    // describe("All-in and Side Pot Formation", () => {
    //   test("When a player goes all-in and others continue betting, side pots are formed", () => {
    //     // 调整玩家筹码：让 Player1 筹码较少
    //     game.players = []; // 重置玩家
    //     game.addPlayer("Player1", "p1");
    //     game.addPlayer("Player2", "p2");
    //     game.addPlayer("Player3", "p3");
    //     game.players[0].chips = 50; // Player1只有50
    //     // Player2和Player3保持默认筹码（1000）

    //     game.startGame();

    //     // Player1 全下
    //     game.handlePlayerAction("p1", "allin");
    //     // Player2 跟注（call）
    //     game.handlePlayerAction("p2", "call");
    //     // Player3 raise（比如 raise 到 80，总下注80）
    //     game.handlePlayerAction("p3", "raise", 80);

    //     // 计算底池
    //     game.calculatePots();
    //     // 断言 sidePots 存在（至少1个 side pot）
    //     expect(game.sidePots.length).toBeGreaterThan(0);
    //   });
    // });

    // describe("Folding on Turn/River", () => {
    //   test("A player folds on turn and game proceeds correctly", () => {
    //     game.startGame();

    //     // 模拟预下注回合：所有玩家依次call/raise，使预下注结束进入flop
    //     const p1 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p1, "call");
    //     const p2 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p2, "raise", 40);
    //     const p3 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p3, "call");

    //     // 应该进入flop
    //     expect(game.currentRound).toBe("flop");

    //     // 模拟翻牌回合：所有玩家call
    //     const f1 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(f1, "call");
    //     const f2 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(f2, "call");
    //     const f3 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(f3, "call");

    //     // 翻牌结束后应进入turn
    //     expect(game.currentRound).toBe("turn");

    //     // 在turn时，假设当前轮到 Player1，Player1选择fold
    //     // 强制设置当前玩家为Player1（测试用）
    //     game.currentPlayer = game.players.find((p) => p.id === "p1").position;
    //     game.handlePlayerAction("p1", "fold");

    //     // 验证 Player1 的状态已更新为folded
    //     expect(game.findPlayerById("p1").isFolded).toBe(true);
    //   });
    // });

    // describe("Multiple Raises Scenario", () => {
    //   test("Simulate multiple raises in a betting round", () => {
    //     game.startGame();

    //     // 模拟预下注回合中的连续加注：
    //     // 假设第一个行动玩家为 p1, 他raise到30
    //     const p1 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p1, "raise", 30);
    //     // 下一个行动玩家为 p2, 他 re-raises到50
    //     const p2 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p2, "raise", 50);
    //     // 接下来 p3, 他call到50
    //     const p3 = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p3, "call");
    //     // 轮到 p1 再次行动，他再次raise到70
    //     const p1Again = game.players[game.currentPlayer].id;
    //     game.handlePlayerAction(p1Again, "raise", 70);

    //     // 检查当前回合最大下注应为70
    //     expect(game.currentRoundMaxBet).toBe(70);
    //   });
    // });
  });

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

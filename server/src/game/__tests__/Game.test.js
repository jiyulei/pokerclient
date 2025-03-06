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
        game.players = [];
        game.addPlayer("BigBlind", "p1");
        game.addPlayer("Dealer", "p2");
        game.addPlayer("SmallBlind", "p3");
        game.startGame();

        game.handlePlayerAction("p2", "call");

        expect(game.currentRoundMaxBet).toBe(20);

        game.handlePlayerAction("p3", "call");

        // 此时应该仍然在preflop轮，并且轮到大盲行动
        expect(game.currentRound).toBe("preflop");
        expect(game.currentPlayer).toBe(game.bigBlindPos);

        // 大盲选择check
        game.handlePlayerAction("p1", "check");

        // 现在应该进入flop
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(60); // 10(SB) + 20(BB) + 20(Dealer call) + 10(SB call)
      });

      test("Players: fold, call, check, then proceed to flop", () => {
        game.players = [];
        game.addPlayer("BigBlind", "p1");
        game.addPlayer("Dealer", "p2");
        game.addPlayer("SmallBlind", "p3");
        game.startGame();
        expect(game.activePlayers.length).toBe(3);

        game.handlePlayerAction("p2", "fold");

        expect(game.activePlayers.length).toBe(2);
        expect(game.currentRoundMaxBet).toBe(20);

        game.handlePlayerAction("p3", "call");
        expect(game.currentRoundMaxBet).toBe(20);
        expect(game.currentRound).toBe("preflop");
        expect(game.pot).toBe(40);

        game.handlePlayerAction("p1", "check");
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(40);
      });

      test("Total 4 players, UTG raise, Dealer call, SmallBlind call, BigBlind call, then proceed to flop", () => {
        game.players = [];
        game.addPlayer("UTG", "p1");
        game.addPlayer("Dealer", "p2");
        game.addPlayer("SmallBlind", "p3");
        game.addPlayer("BigBlind", "p4");

        game.startGame();
        game.handlePlayerAction("p1", "raise", 100);

        expect(game.currentRound).toBe("preflop");
        expect(game.pot).toBe(130);

        game.handlePlayerAction("p2", "call");

        expect(game.pot).toBe(230);

        game.handlePlayerAction("p3", "call");

        expect(game.pot).toBe(320);

        game.handlePlayerAction("p4", "call");

        expect(game.pot).toBe(400);
        expect(game.currentRound).toBe("flop");
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

          // 记录初始round值
          const initialRound = game.round;

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
          expect(game.round).toBe(initialRound + 1); // 应该是初始round值加1
          expect(game.round).toBe(2);
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
        describe("Three players case: ", () => {
          test("Short all-in causes side pots", () => {
            // reset players
            game.players = [];
            game.addPlayer("BigBlind", "p1");
            game.addPlayer("Dealer", "p2");
            game.addPlayer("SmallBlind", "p3");
            game.players[0].chips = 50; // Player1只有50
            game.startGame();
            const totalInitialChips = game.players.reduce(
              (sum, player) => sum + player.chips,
              0
            );
            const initialPot = game.pot;
            // ---------- preflop ----------
            game.handlePlayerAction("p2", "raise", 100);
            game.handlePlayerAction("p3", "call");
            game.handlePlayerAction("p1", "allin");

            expect(game.currentRound).toBe("flop");
            expect(game.sidePots.length).toBe(1);

            // ---------- flop ----------
            game.handlePlayerAction("p3", "bet", 100);
            game.handlePlayerAction("p2", "call");

            expect(game.sidePots.length).toBe(1);
            expect(game.activePlayers.length).toBe(2);
            expect(game.currentRound).toBe("turn");

            // ---------- turn ----------
            game.handlePlayerAction("p3", "bet", 100);
            game.handlePlayerAction("p2", "call");

            expect(game.activePlayers.length).toBe(2);
            expect(game.currentRound).toBe("river");

            // ---------- river ----------
            expect(game.currentRound).toBe("river");

            game.handlePlayerAction("p3", "check");
            game.handlePlayerAction("p2", "check");
            // expect(game.activePlayers.length).toBe(2);
            const totalFinalChips = game.players.reduce(
              (sum, player) => sum + player.chips,
              0
            );
            expect(totalFinalChips).toBe(totalInitialChips + initialPot);

            jest.advanceTimersByTime(3000);
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

            // expect(game.sidePots.length).toBe(0);
            expect(game.currentRound).toBe("preflop");
            expect(game.pot).toBe(80);

            // small blind all-in
            game.handlePlayerAction("p3", "allin");

            expect(game.currentRound).toBe("preflop");
            expect(game.sidePots.length).toBe(0);

            expect(game.pot).toBe(120);

            // // big blind call
            game.handlePlayerAction("p1", "call");

            expect(game.sidePots.length).toBe(0);
            // // 1.river: 2 players left 2: preflop: 2 players eliminated(endGame)
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

            expect(totalFinalChips).toBe(totalInitialChips);
            jest.advanceTimersByTime(3000);
            expect(["waiting", "preflop"]).toContain(game.currentRound);
            // // check chips
            // // 因为一局结束pot变量被重置为0，所以需要用总筹码来验证
          });
        });

        describe("Four players case:", () => {
          test("Four players with different chip amounts should handle all-ins correctly", () => {
            game.players = [];
            game.addPlayer("UTG", "p1");
            game.players[0].chips = 100;

            game.addPlayer("Dealer", "p2");
            game.players[1].chips = 50;

            game.addPlayer("SmallBlind", "p3");
            game.players[2].chips = 50;

            game.addPlayer("BigBlind", "p4");
            game.players[3].chips = 50;

            // record initial chips
            const initialChips = {};
            game.players.forEach((player, index) => {
              if (player && player.isActive) {
                initialChips[`p${index + 1}`] = player.chips;
              }
            });

            game.startGame();
            expect(game.currentRound).toBe("preflop");
            expect(game.getAvailableActions("p1")).toContain("raise");
            expect(game.getAvailableActions("p1")).toContain("call");
            expect(game.getAvailableActions("p1")).toContain("allin");
            expect(game.getAvailableActions("p1")).toContain("fold");
            expect(game.getAvailableActions("p1")).not.toContain("check");

            // UTG raise to 100
            game.handlePlayerAction("p1", "raise", 100);

            expect(game.pot).toBe(130); // 10(SB) + 20(BB) + 100(raise)
            expect(game.getAvailableActions("p2")).toContain("allin");
            expect(game.getAvailableActions("p2")).toContain("fold");
            expect(game.getAvailableActions("p2")).not.toContain("call");
            expect(game.getAvailableActions("p2")).not.toContain("raise");
            expect(game.getAvailableActions("p2")).not.toContain("check");

            // Dealer all-in (only 50 chips)
            game.handlePlayerAction("p2", "allin");

            expect(game.pot).toBe(180); // 130 + 50
            expect(game.getAvailableActions("p3")).toContain("allin");
            expect(game.getAvailableActions("p3")).toContain("fold");
            expect(game.getAvailableActions("p3")).not.toContain("call");
            expect(game.getAvailableActions("p3")).not.toContain("raise");
            expect(game.getAvailableActions("p3")).not.toContain("check");

            // small blind all-in (already bet 10, then bet 40)
            game.handlePlayerAction("p3", "allin");

            expect(game.pot).toBe(220); // 180 + 40
            expect(game.getAvailableActions("p4")).toContain("allin");
            expect(game.getAvailableActions("p4")).toContain("fold");
            expect(game.getAvailableActions("p4")).not.toContain("call");
            expect(game.getAvailableActions("p4")).not.toContain("raise");
            expect(game.getAvailableActions("p4")).not.toContain("check");

            // big blind all-in (already bet 20, then bet 30)
            game.handlePlayerAction("p4", "allin");

            // river or preflop based on the rest number of players
            expect(["river", "preflop"]).toContain(game.currentRound);

            // check the total chips remain the same
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

          test("Short all-in causes side pots with four players", () => {
            game.players = [];
            // 设置四个玩家，筹码数量各不相同
            game.addPlayer("UTG", "p1");
            game.players[0].chips = 30; // 最少筹码

            game.addPlayer("Dealer", "p2");
            game.players[1].chips = 60; // 中等筹码

            game.addPlayer("SmallBlind", "p3");
            game.players[2].chips = 100; // 较多筹码

            game.addPlayer("BigBlind", "p4");
            game.players[3].chips = 200; // 最多筹码

            // 记录初始筹码
            const initialChips = {};
            game.players.forEach((player, index) => {
              if (player && player.isActive) {
                initialChips[`p${index + 1}`] = player.chips;
              }
            });

            game.startGame();
            expect(game.currentRound).toBe("preflop");

            // UTG 全下 (30筹码)
            game.handlePlayerAction("p1", "allin");

            // Dealer 全下 (60筹码)
            game.handlePlayerAction("p2", "allin");

            // SmallBlind 加注到 100 (已下注10，再下90)
            game.handlePlayerAction("p3", "allin");

            // BigBlind 跟注 (已下注20，再下80)
            game.handlePlayerAction("p4", "call");

            // 检查筹码总数保持不变
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

            jest.advanceTimersByTime(3000);

            expect(["waiting", "preflop"]).toContain(game.currentRound);
          });
        });
      });
    });

    describe("Flop action", () => {
      beforeEach(() => {
        game.players = [];
        game.addPlayer("BigBlind", "p1");
        game.addPlayer("Dealer", "p2");
        game.addPlayer("SmallBlind", "p3");
        // ------------- Preflop -------------
        game.startGame();

        expect(game.currentRound).toBe("preflop");
        game.handlePlayerAction("p2", "call");
        game.handlePlayerAction("p3", "call");
        game.handlePlayerAction("p1", "check");
      });

      test("Three players: players check, call, call, call, then proceed to turn. ", () => {
        // ------------- Flop -------------
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(60);

        // small blind should have check, bet, fold, allin, but not call or raise
        expect(game.getAvailableActions("p3")).toContain("check");
        expect(game.getAvailableActions("p3")).toContain("bet");
        expect(game.getAvailableActions("p3")).toContain("fold");
        expect(game.getAvailableActions("p3")).toContain("allin");
        expect(game.getAvailableActions("p3")).not.toContain("call");
        expect(game.getAvailableActions("p3")).not.toContain("raise");

        // -------------- small blind check --------------
        game.handlePlayerAction("p3", "check");
        expect(game.pot).toBe(60);

        // big blind should have check, bet, fold, allin, but not call or raise
        expect(game.getAvailableActions("p1")).toContain("check");
        expect(game.getAvailableActions("p1")).toContain("bet");
        expect(game.getAvailableActions("p1")).toContain("fold");
        expect(game.getAvailableActions("p1")).toContain("allin");
        expect(game.getAvailableActions("p1")).not.toContain("call");
        expect(game.getAvailableActions("p1")).not.toContain("raise");

        // -------------- big blind bet 10 --------------
        game.handlePlayerAction("p1", "bet", 10);
        expect(game.pot).toBe(70);

        // dealer should have call, fold, raise, allin, but not bet or check
        expect(game.getAvailableActions("p2")).toContain("fold");
        expect(game.getAvailableActions("p2")).toContain("call");
        expect(game.getAvailableActions("p2")).toContain("raise");
        expect(game.getAvailableActions("p2")).toContain("allin");
        expect(game.getAvailableActions("p2")).not.toContain("bet");
        expect(game.getAvailableActions("p2")).not.toContain("check");

        // -------------- dealer call --------------
        game.handlePlayerAction("p2", "call");
        expect(game.pot).toBe(80);

        // small blind should have fold, call, raise, allin, but not check or bet
        expect(game.getAvailableActions("p3")).toContain("fold");
        expect(game.getAvailableActions("p3")).toContain("call");
        expect(game.getAvailableActions("p3")).toContain("raise");
        expect(game.getAvailableActions("p3")).toContain("allin");
        expect(game.getAvailableActions("p3")).not.toContain("check");
        expect(game.getAvailableActions("p3")).not.toContain("bet");

        // -------------- small blind call --------------
        game.handlePlayerAction("p3", "call");
        expect(game.pot).toBe(90);

        // 进入turn
        expect(game.currentRound).toBe("turn");
      });

      test("Three players: players bet, fold, call, then proceed to turn. ", () => {
        // ------------- Flop -------------
        expect(game.currentRound).toBe("flop");
        expect(game.pot).toBe(60);

        // -------------- small blind bet --------------
        game.handlePlayerAction("p3", "bet", 10);

        expect(game.pot).toBe(70);
        expect(game.activePlayers.length).toBe(3);

        // -------------- big blind call --------------
        game.handlePlayerAction("p1", "fold");

        expect(game.pot).toBe(70);
        expect(game.activePlayers.length).toBe(2);
        // -------------- dealer call --------------
        game.handlePlayerAction("p2", "call");

        expect(game.pot).toBe(80);

        // -------------- turn --------------
        expect(game.currentRound).toBe("turn");
        expect(game.activePlayers.length).toBe(2);
      });

      describe("Mutilple raise", () => {
        test("Three players: players bet, raise, raise, call, call, then proceed to turn. ", () => {
          // ------------- Flop -------------
          expect(game.currentRound).toBe("flop");
          expect(game.pot).toBe(60);

          // -------------- small blind bet --------------
          game.handlePlayerAction("p3", "bet", 10);
          expect(game.pot).toBe(70);

          // -------------- big blind raise --------------
          game.handlePlayerAction("p1", "raise", 20);
          expect(game.pot).toBe(90);
          expect(game.currentRoundMaxBet).toBe(20);

          //------------ dealer raise --------------
          game.handlePlayerAction("p2", "raise", 40);
          expect(game.pot).toBe(130);
          expect(game.currentRoundMaxBet).toBe(40);

          //------------ small blind call --------------
          game.handlePlayerAction("p3", "call");
          expect(game.pot).toBe(160);

          //------------ big blind call --------------
          game.handlePlayerAction("p1", "call");
          expect(game.pot).toBe(180);

          // ---------- turn --------------
          expect(game.currentRound).toBe("turn");
          expect(game.activePlayers.length).toBe(3);
        });
      });

      describe("Mutiple fold", () => {
        test("Three players: players bet, fold, fold, then last player win. ", () => {
          expect(game.players[2].chips).toBe(980);
          // ------------- Flop -------------
          expect(game.currentRound).toBe("flop");
          expect(game.pot).toBe(60);

          // -------------- small blind fold --------------

          game.handlePlayerAction("p3", "bet", 10);

          expect(game.pot).toBe(70);
          expect(game.activePlayers.length).toBe(3);

          // -------------- big blind fold --------------
          game.handlePlayerAction("p1", "fold");

          expect(game.pot).toBe(70);
          expect(game.activePlayers.length).toBe(2);

          // -------------- dealer call --------------
          game.handlePlayerAction("p2", "fold");

          expect(game.activePlayers.length).toBe(1);
          expect(game.players[2].chips).toBe(1040);
          // after delay, verify the new game has started
          jest.advanceTimersByTime(3000);

          expect(game.round).toBe(2); // second round
          expect(game.currentRound).toBe("preflop");
          expect(game.pot).toBe(30);
        });
      });

      describe("All-in and side Pots formation", () => {
        test("Three players: players bet, allin, allin. ", () => {
          const initialChipsAfterPreflop = {};
          game.players.forEach((player, index) => {
            if (player && player.isActive) {
              initialChipsAfterPreflop[`p${index + 1}`] = player.chips;
            }
          });

          const preflopPot = game.pot;
          // ------------- Flop -------------
          expect(game.currentRound).toBe("flop");
          expect(game.pot).toBe(60);

          // -------------- small blind allin --------------
          game.handlePlayerAction("p3", "allin");
          expect(game.pot).toBe(1040);

          // -------------- big blind allin --------------
          game.handlePlayerAction("p1", "call");
          expect(game.pot).toBe(2020);

          // -------------- dealer allin --------------
          game.handlePlayerAction("p2", "allin");

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

          const totalInitialChipsAfterPreflop = Object.values(
            initialChipsAfterPreflop
          ).reduce((a, b) => a + b, 0);
          const totalFinalChips = Object.values(finalChips).reduce(
            (a, b) => a + b,
            0
          );

          expect(totalFinalChips).toBe(
            totalInitialChipsAfterPreflop + preflopPot
          );
        });
      });
    });

    describe("Flop action: Short all-in causes side pots", () => {
      test("Short all-in causes side pots with four players", () => {
        game.players = [];
        game.addPlayer("BigBlind", "p1");
        game.addPlayer("Dealer", "p2");
        game.addPlayer("SmallBlind", "p3");
        game.players[0].chips = 50; // Player1只有50

        game.startGame();
        // ---- preflop ----
        expect(game.currentRound).toBe("preflop");

        game.handlePlayerAction("p2", "call");
        game.handlePlayerAction("p3", "call");
        game.handlePlayerAction("p1", "check");

        // ---- flop ----
        expect(game.currentRound).toBe("flop");
        const initialChips = {};
        game.players.forEach((player, index) => {
          if (player && player.isActive) {
            initialChips[`p${index + 1}`] = player.chips;
          }
        });

        game.handlePlayerAction("p3", "bet", 100);
        game.handlePlayerAction("p1", "allin");
        game.handlePlayerAction("p2", "call");

        expect(game.currentRound).toBe("turn");
      });
    });

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

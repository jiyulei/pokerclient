import Player from "./Player";
import Deck from "./Deck";
import { getWinner } from "./actions/Evaluate";
// TODO: add spectator feature
// TODO: add game history feature
// TODO: might need to update name based on login user name
// game analysis feature
export default class Game {
  constructor(options = {}) {
    // game settings
    this.initialChips = options.initialChips || 1000;
    this.smallBlind = options.smallBlind || 5;
    this.bigBlind = options.bigBlind || 10;
    this.timeLimit = options.timeLimit || 30;

    // game state
    this.deck = new Deck();
    this.players = [];
    this.maxPlayers = 9;
    this.round = 0; // total rounds
    this.currentRound = "preflop"; // current round ['preflop', 'flop', 'turn', 'river']
    this.spectators = [];
    this.isGameInProgress = false;

    // game state
    this.pot = 0; // current pot
    this.communityCards = []; // public cards
    this.currentPlayer = null; // current player
    this.dealer = 0; // dealer position
    this.smallBlindPos = 1; // small blind position
    this.bigBlindPos = 2; // big blind position
    this.currentRoundMaxBet = 0; // current round max bet
    this.lastRaisePlayer = null; // last raise player
    this.activePlayerCount = 0; // current active players count
    this.activePlayers = []; // players who can continue except folded & all-in
    this.inHandPlayers = []; // players who can continue and not folded
    this.actionTimeout = null; // for player action timeout

    // game notification system
    this.gameMessages = {
      broadcast: [], // broadcast messages (everyone can see)
      playerMessages: {}, // messages for specific players
    };

    this.mainPot = 0; // main pot
    this.sidePots = []; // side pots, each side pot contains amount and players
    this.shownCards = new Set(); // players who have shown cards
  }

  determineWinner() {
    // 传入 communityCards
    const winners = getWinner(this.inHandPlayers, this.communityCards);
    return winners;
  }
  // add player
  addPlayer(name, id = null) {
    if (this.players.length >= this.maxPlayers) {
      throw new Error("Game is full");
    }

    if (!id) {
      id = `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
    }

    // check if id already exists
    if (this.players.some((player) => player.id === id)) {
      throw new Error("Player already in game");
    }

    const player = new Player(id, name, this.initialChips);
    player.position = this.players.length;
    this.players.push(player);
    this.activePlayerCount++;

    return player;
  }

  startGame() {
    // check if there are enough players
    if (this.players.length < 2) {
      throw new Error("Need at least 2 players to start the game");
    }
    //TODO: check if each player has enough chips
    const insufficientChipsPlayers = this.players.filter(
      (player) => player.chips < this.bigBlind
    );

    if (insufficientChipsPlayers.length > 0) {
      throw new Error("Some players don't have enough chips to play");
    }

    this.isGameInProgress = true;
    this.startNewHand();
  }

  // end game
  endGame() {
    this.isGameInProgress = false;
    this.currentRound = "preflop";
    this.pot = 0;
    this.communityCards = [];
    this.currentRoundMaxBet = 0;

    // reset all players' status
    this.players.forEach((player) => player.reset());
  }

  // start a new hand
  startNewHand() {
    if (!this.isGameInProgress) {
      throw new Error("Game has not been started");
    }

    if (this.players.length < 2) {
      throw new Error("Need at least 2 players to start the game");
    }

    // check if each player has enough chips
    const insufficientChipsPlayers = this.players.filter(
      (player) => player.chips < this.bigBlind
    );
    if (insufficientChipsPlayers.length > 0) {
      insufficientChipsPlayers.forEach((player) => {
        this.removePlayer(player.id);
      });

      if (this.players.length < 2) {
        throw new Error("Not enough players with sufficient chips to continue");
      }
    }

    this.shownCards.clear(); // clear shown cards record

    this.round++;
    this.currentRound = "preflop";
    this.pot = 0;
    this.communityCards = [];
    this.currentRoundMaxBet = 0;
    this.deck.shuffle();

    // reset all players' status
    this.players.forEach((player) => {
      if (player.chips > 0) {
        player.reset();
        player.isActive = true;
      } else {
        player.isActive = false;
      }
    });

    // reset active players list
    this.activePlayers = this.players.filter((player) => player.isActive);
    this.activePlayerCount = this.activePlayers.length;

    // update players in hand (excluding folded players)
    this.inHandPlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded
    );

    // move button position
    this.moveButton();

    // deal hole cards
    this.dealHoleCards();

    // start betting round
    this.startBettingRound();
  }

  addSpectator(name) {
    this.spectators.push(name);
  }

  removeSpectator(name) {
    this.spectators = this.spectators.filter((spectator) => spectator !== name);
  }

  // move dealer button and blind positions
  moveButton() {
    if (this.players.length === 2) {
      // 2 players special rules
      this.dealer = (this.dealer + 1) % 2;
      this.smallBlindPos = this.dealer; // dealer is also small blind
      this.bigBlindPos = (this.dealer + 1) % 2; // another player is big blind
    } else {
      // 3 players or more normal rules
      this.dealer = (this.dealer + 1) % this.players.length;
      this.smallBlindPos = (this.dealer + 1) % this.players.length;
      this.bigBlindPos = (this.dealer + 2) % this.players.length;
    }
  }

  // deal hole cards
  dealHoleCards() {
    // each player receives 2 cards
    for (let i = 0; i < 2; i++) {
      this.players.forEach((player) => {
        if (player.isActive) {
          player.receiveCard(this.deck.deal());
        }
      });
    }
  }

  // next round
  nextRound() {
    // 如果只剩一个玩家，直接结束这手牌
    if (this.activePlayers.length === 1) {
      this.endHandWithOnePlayer();
      return;
    }

    // 计算底池
    this.calculatePots();

    // 重置当前回合的下注
    this.resetBets();

    switch (this.currentRound) {
      case "preflop":
        this.currentRound = "flop";
        this.dealFlop();
        break;
      case "flop":
        this.currentRound = "turn";
        this.dealTurn();
        break;
      case "turn":
        this.currentRound = "river";
        this.dealRiver();
        break;
      case "river":
        this.endHand(); // directly call endHand
        return;
    }
    // start new betting round
    this.startBettingRound();
  }

  // deal public cards
  dealFlop() {
    for (let i = 0; i < 3; i++) {
      this.communityCards.push(this.deck.deal());
    }
  }

  dealTurn() {
    this.communityCards.push(this.deck.deal());
  }

  dealRiver() {
    this.communityCards.push(this.deck.deal());
  }

  // get game current state
  getGameState(playerId) {
    return {
      round: this.round,
      currentRound: this.currentRound,
      pot: this.pot,
      communityCards: this.communityCards,
      currentPlayer: this.currentPlayer,
      currentBet: this.currentRoundMaxBet,
      players: this.players.map((player) => player.getStatus()),
      dealer: this.dealer,
      smallBlindPos: this.smallBlindPos,
      bigBlindPos: this.bigBlindPos,
      spectators: this.spectators,
      isGameInProgress: this.isGameInProgress,
      activePlayers: this.activePlayers.map((player) => player.position),
      inHandPlayers: this.inHandPlayers.map((player) => player.position),
      activePlayerCount: this.activePlayerCount,
      messages: {
        broadcast: this.gameMessages.broadcast,
        private: this.gameMessages.playerMessages[playerId] || [],
      },
      availableActions: playerId ? this.getAvailableActions(playerId) : [],
      currentRoundMaxBet: this.currentRoundMaxBet,
      toCall: playerId
        ? this.currentRoundMaxBet -
          (this.findPlayerById(playerId)?.currentBet || 0)
        : 0,
      mainPot: this.mainPot,
      sidePots: this.sidePots,
      showdownInfo:
        this.currentRound === "river"
          ? this.inHandPlayers
              .filter((player) => this.shownCards.has(player.id))
              .map((player) => ({
                id: player.id,
                name: player.name,
                cards: player.hand,
                position: player.position,
              }))
          : null,
      canShowCards:
        playerId &&
        this.inHandPlayers.length === 1 &&
        this.inHandPlayers[0].id === playerId &&
        !this.shownCards.has(playerId),
      shownCards: Array.from(this.shownCards),
      isYourTurn:
        playerId &&
        this.findPlayerById(playerId)?.position === this.currentPlayer,
    };
  }

  // update active players list when a player folds
  updateActivePlayers() {
    this.activePlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded && !player.isAllIn
    );
    this.activePlayerCount = this.activePlayers.length;

    this.inHandPlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded
    );
  }

  // find player by id
  findPlayerById(id) {
    return this.players.find((player) => player.id === id);
  }

  // find player by position
  findPlayerByPosition(position) {
    return this.players.find((player) => player.position === position);
  }

  // end hand
  endHand() {
    // 计算底池
    this.calculatePots();

    // 分发底池
    this.distributePots();

    // if ended before river (only one player left)
    if (this.inHandPlayers.length === 1) {
      const winner = this.inHandPlayers[0];
      this.addMessage(
        `${winner.name} wins ${this.pot} chips (all other players folded)`
      );
      winner.chips += this.pot;

      console.log(
        "Winner:",
        `${winner.id} ${winner.name} (won by all others folding)`
      );

      // check players status
      this.checkPlayersStatus();
      return;
    }

    // show cards after river
    // sort players by position (starting from small blind)
    const playersToShow = [...this.inHandPlayers].sort((a, b) => {
      // calculate position relative to small blind
      const posA =
        (a.position - this.smallBlindPos + this.players.length) %
        this.players.length;
      const posB =
        (b.position - this.smallBlindPos + this.players.length) %
        this.players.length;
      return posA - posB;
    });

    playersToShow.forEach((player) => {
      this.showCards(player.id, true); // force show cards
    });

    // check players status
    this.checkPlayersStatus();

    // if game is still in progress, start a new hand after 3 seconds
    if (this.isGameInProgress && this.players.length >= 2) {
      setTimeout(() => {
        this.startNewHand();
      }, 3000); // 3 seconds delay, adjust as needed
    }
  }

  // handle player bet
  handleBet(playerId, amount) {
    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // player bet
    const betAmount = player.bet(amount);
    this.pot += betAmount;

    // update current round max bet
    this.currentRoundMaxBet = Math.max(
      this.currentRoundMaxBet,
      player.currentBet
    );

    // if player is all in, add message notification
    if (player.isAllIn) {
      this.addMessage(`Player ${player.name} is ALL IN!`);
      this.updateActivePlayers();
      this.calculatePots();
    }

    return betAmount;
  }

  // handle player fold
  handleFold(playerId) {
    const player = this.findPlayerById(playerId);
    player.fold();

    this.updateActivePlayers();

    if (this.activePlayers.length === 1) {
      this.endHandWithOnePlayer();
      return true;
    }
    return false;
  }

  // handle player check
  handleCheck(playerId) {
    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    if (player.currentBet !== this.currentRoundMaxBet) {
      throw new Error("Cannot check when there are outstanding bets");
    }

    player.check();
  }

  // reset bets when a round ends
  resetBets() {
    this.players.forEach((player) => {
      player.currentBet = 0;
    });
    this.currentRoundMaxBet = 0;
  }

  // check players status after each hand
  checkPlayersStatus() {
    // find players with insufficient chips
    const eliminatedPlayers = this.players.filter(
      (player) => player.chips < this.bigBlind
    );

    // remove these players from game
    eliminatedPlayers.forEach((player) => {
      console.log(
        `Player ${player.name} has been eliminated (insufficient chips)`
      );
      this.removePlayer(player.id);
    });

    // if there are less than 2 players in the game, end the game
    if (this.players.length < 2) {
      console.log("Not enough players to continue the game");
      this.endGame();
    }
  }

  // remove player
  removePlayer(playerId) {
    const player = this.findPlayerById(playerId);
    if (player) {
      // send message to the removed player
      this.addMessage(
        `You have been removed from the game due to insufficient chips`,
        playerId
      );
      // broadcast message to other players
      this.addMessage(`Player ${player.name} has left the game`);
    }

    // remove player from players list
    this.players = this.players.filter((player) => player.id !== playerId);

    // reassign positions
    this.players.forEach((player, index) => {
      player.position = index;
    });

    // update active player count
    this.activePlayerCount = this.players.length;

    // update active players list
    this.updateActivePlayers();
  }

  // add message method
  addMessage(message, playerId = null) {
    const timestamp = Date.now();
    const messageObj = {
      id: `msg_${timestamp}`,
      content: message,
      timestamp,
      type: playerId ? "private" : "broadcast",
    };

    if (playerId) {
      // private message
      if (!this.gameMessages.playerMessages[playerId]) {
        this.gameMessages.playerMessages[playerId] = [];
      }
      this.gameMessages.playerMessages[playerId].push(messageObj);
    } else {
      // broadcast message
      this.gameMessages.broadcast.push(messageObj);
    }
  }

  // clear messages
  clearMessages(playerId = null, messageIds = []) {
    if (playerId && messageIds.length > 0) {
      // clear specific player's specific messages
      this.gameMessages.playerMessages[playerId] =
        this.gameMessages.playerMessages[playerId]?.filter(
          (msg) => !messageIds.includes(msg.id)
        ) || [];
    }
    // clear old broadcast messages (e.g. over 5 minutes)
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    this.gameMessages.broadcast = this.gameMessages.broadcast.filter(
      (msg) => msg.timestamp > fiveMinutesAgo
    );
  }

  // start betting round
  startBettingRound() {
    // reset current round bets
    this.resetBets();

    // determine the first player to act
    if (this.currentRound === "preflop") {
      // preflop starts from the player after big blind
      this.currentPlayer = (this.bigBlindPos + 1) % this.players.length;

      // auto collect blinds
      const sbPlayer = this.players[this.smallBlindPos];
      const bbPlayer = this.players[this.bigBlindPos];

      this.handleBet(sbPlayer.id, this.smallBlind);
      this.handleBet(bbPlayer.id, this.bigBlind);

      // set initial max bet amount
      this.currentRoundMaxBet = this.bigBlind;
      this.lastRaisePlayer = this.bigBlindPos;
    } else {
      // other rounds start from small blind
      this.currentPlayer = this.smallBlindPos;
      this.lastRaisePlayer = null;
    }

    this.waitForPlayerAction();
  }

  // wait for player action
  waitForPlayerAction() {
    // if all players have acted and bet equal, go to next round
    if (this.shouldEndRound()) {
      this.nextRound();
      return;
    }

    const player = this.players[this.currentPlayer];

    // if player has folded or all in, skip to next player
    if (!player.isActive || player.isFolded || player.isAllIn) {
      this.moveToNextPlayer();
      return;
    }

    // add message notification
    this.addMessage(`It's your turn`, player.id);

    // set action timeout
    this.actionTimeout = setTimeout(() => {
      // timeout auto fold
      this.handleFold(player.id);
      this.addMessage(`Player ${player.name} fold due to timeout`);
    }, this.timeLimit * 1000);
  }

  moveToNextPlayer() {
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
    }

    // 1) First check: should we deal all cards?
    const stillInPlayers = this.inHandPlayers.filter((p) => !p.isFolded);

    // 判断是否所有玩家都全下
    const allAllIn =
      stillInPlayers.length > 1 && stillInPlayers.every((p) => p.isAllIn);
    // 判断是否除一人外都全下，且那唯一未全下的玩家已经投入了当前最大注
    const allButOneAllIn =
      stillInPlayers.length > 1 &&
      stillInPlayers.filter((p) => p.isAllIn).length ===
        stillInPlayers.length - 1 &&
      stillInPlayers.every(
        (p) => p.isAllIn || p.currentBet === this.currentRoundMaxBet
      );

    // 新增逻辑：短码 all-in 不重新打开加注
    // 如果有玩家 all-in 且其下注少于当前轮最大注，同时其他非全下玩家已都投入至少当前轮最大注，则结束本轮
    const hasShortAllIn = stillInPlayers.some(
      (p) => p.isAllIn && p.currentBet < this.currentRoundMaxBet
    );
    const othersCovered = stillInPlayers
      .filter((p) => !p.isAllIn)
      .every((p) => p.currentBet >= this.currentRoundMaxBet);

    if (allAllIn || allButOneAllIn || (hasShortAllIn && othersCovered)) {
      // 重置当前回合的下注
      this.resetBets();

      // 发完所有剩余公共牌
      while (this.currentRound !== "river") {
        switch (this.currentRound) {
          case "preflop":
            this.dealFlop();
            this.currentRound = "flop";
            break;
          case "flop":
            this.dealTurn();
            this.currentRound = "turn";
            break;
          case "turn":
            this.dealRiver();
            this.currentRound = "river";
            break;
        }
      }
      // 结束本手牌（分配底池等）
      this.endHand();
      return;
    }

    // 2) Otherwise: find next player
    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

      if (this.currentPlayer === this.lastRaisePlayer) {
        const lastRaisePlayer = this.players[this.lastRaisePlayer];
        if (lastRaisePlayer.isAllIn || this.shouldEndRound()) {
          this.nextRound();
          return;
        }
      }
    } while (
      !this.players[this.currentPlayer].isActive ||
      this.players[this.currentPlayer].isFolded ||
      this.players[this.currentPlayer].isAllIn
    );

    this.waitForPlayerAction();
  }

  // handle player action
  handlePlayerAction(playerId, action, amount = 0) {
    const player = this.findPlayerById(playerId);
    if (player.position !== this.currentPlayer) {
      throw new Error("Not your turn");
    }

    try {
      switch (action) {
        case "fold":
          this.handleFold(playerId);
          break;
        case "check":
          this.handleCheck(playerId);
          break;
        case "call":
          // 添加检查：如果玩家筹码不足以跟注，抛出错误
          const toCall = this.currentRoundMaxBet - player.currentBet;
          if (player.chips < toCall) {
            throw new Error(
              "Not enough chips to call, please go all-in instead"
            );
          }
          this.handleBet(playerId, this.currentRoundMaxBet - player.currentBet);
          break;
        case "bet":
          if (this.currentRoundMaxBet > 0) {
            throw new Error("Cannot bet when there are outstanding bets");
          }
          this.handleBet(playerId, amount);
          this.lastRaisePlayer = player.position;
          break;
        case "raise":
          if (this.currentRoundMaxBet === 0) {
            throw new Error("Cannot raise when there are no bets");
          }
          this.handleBet(playerId, amount);
          this.lastRaisePlayer = player.position;
          break;
        case "allin":
          const allinAmount = player.chips;
          this.handleBet(playerId, allinAmount);
          if (player.currentBet > this.currentRoundMaxBet) {
            this.lastRaisePlayer = player.position;
            this.currentRoundMaxBet = player.currentBet;
          }
          break;
        case "showCards":
          this.showCards(playerId);
          break;
        default:
          throw new Error("Invalid action");
      }

      // move to next player
      this.moveToNextPlayer();
    } catch (error) {
      this.addMessage(error.message, playerId);
      throw error;
    }
  }

  // get available actions for a player
  getAvailableActions(playerId) {
    const player = this.findPlayerById(playerId);
    if (!player || player.position !== this.currentPlayer) {
      return [];
    }

    const actions = ["fold"]; // always can fold
    const toCall = this.currentRoundMaxBet - player.currentBet;

    // if the first player to act after flop
    if (
      this.currentRound !== "preflop" &&
      this.currentRoundMaxBet === 0 &&
      player.position === this.smallBlindPos
    ) {
      actions.push("check");
      // if player has enough chips, can bet
      if (player.chips > 0) {
        actions.push("bet");
      }
    }
    // other cases
    else {
      // if no need to call, can check
      if (toCall === 0) {
        actions.push("check");
        // if player has enough chips, can bet
        if (player.chips > 0) {
          actions.push("bet");
        }
      } else {
        // if player has enough chips, can call
        if (player.chips >= toCall) {
          actions.push("call");
          // if player has enough chips, can raise
          if (player.chips > toCall) {
            actions.push("raise");
          }
        }
        // 如果筹码不足以跟注，不提供call选项，只能all-in
      }
    }

    // always can all-in (as long as there are chips)
    if (player.chips > 0) {
      actions.push("allin");
    }

    return actions;
  }

  // calculate all pots (main pot and side pots)
  calculatePots() {
    // 先判断是否所有玩家都 all-in 或 fold，或 round 已结束
    const allPlayersAllInOrFolded = this.inHandPlayers.every(
      (p) => p.isAllIn || p.isFolded
    );
    const roundEnded = this.shouldEndRound() || allPlayersAllInOrFolded;

    // 如果还在回合中（没有结束），就直接不拆分
    if (!roundEnded) {
      this.mainPot = this.pot;
      this.sidePots = [];
      this.pots = [
        {
          amount: this.pot,
          players: this.inHandPlayers.map((player) => ({
            id: player.id,
            name: player.name,
            hand: player.hand,
          })),
          isMainPot: true,
        },
      ];
      return;
    }

    // ====== 回合结束后，再进行正式的边池拆分 ======
    // 这里把原先的 activePlayers 过滤条件去掉，改为直接对 inHandPlayers 做 sort。
    const activePlayers = this.inHandPlayers
      .map((player) => ({
        id: player.id,
        name: player.name,
        totalBet: player.totalBet,
        hand: player.hand,
      }))
      .sort((a, b) => a.totalBet - b.totalBet);

    // 如果没有玩家，直接返回
    if (activePlayers.length === 0) {
      this.mainPot = 0;
      this.sidePots = [];
      this.pots = [];
      return;
    }

    // 找出最小和最大下注金额
    const minBet = activePlayers[0].totalBet;
    const maxBet = activePlayers[activePlayers.length - 1].totalBet;

    // 如果所有玩家下注相等，不需要创建边池
    if (minBet === maxBet) {
      this.mainPot = this.pot;
      this.sidePots = [];
      this.pots = [
        {
          amount: this.pot,
          players: activePlayers,
          isMainPot: true,
        },
      ];
      return;
    }

    // 否则，需要计算主池和边池
    let pots = [];
    let processedBet = 0;
    let remainingPlayers = [...activePlayers];
    let totalProcessed = 0; // 添加这个变量来跟踪已处理的总金额

    while (remainingPlayers.length > 0) {
      const currentBet = remainingPlayers[0].totalBet;
      const betDifference = currentBet - processedBet;

      if (betDifference > 0) {
        // 修改计算方式
        const potAmount = betDifference * remainingPlayers.length;
        totalProcessed += potAmount;

        // 只有当真正需要边池时才创建
        if (
          currentBet < maxBet ||
          remainingPlayers.length < activePlayers.length
        ) {
          const pot = {
            amount: potAmount,
            players: remainingPlayers.map((p) => ({
              id: p.id,
              name: p.name,
              hand: p.hand,
            })),
            isMainPot: pots.length === 0,
          };
          pots.push(pot);
        }
      }

      processedBet = currentBet;
      remainingPlayers.shift();
    }

    // 如果没有创建任何池，说明所有玩家下注实际上是相等的
    if (pots.length === 0) {
      this.mainPot = this.pot;
      this.sidePots = [];
      this.pots = [
        {
          amount: this.pot,
          players: activePlayers,
          isMainPot: true,
        },
      ];
      return;
    }

    // 更新游戏状态
    this.mainPot = pots[0]?.amount || 0;
    this.sidePots = pots.slice(1);
    this.pots = pots;
  }

  // distribute pots
  distributePots() {
    console.log("hasSidePots", this.sidePots);
    // 检查是否有边池
    const hasSidePots = this.sidePots && this.sidePots.length > 0;

    if (!hasSidePots) {
      // 简单情况：没有边池，直接分发总底池
      const winners = getWinner(this.inHandPlayers, this.communityCards);
      const potShare = Math.floor(this.pot / winners.length);

      winners.forEach((winner) => {
        const player = this.findPlayerById(winner.id);
        if (player) {
          player.chips += potShare;
          this.addMessage(
            `${player.name} wins ${potShare} with ${winner.descr}`
          );
        }
      });
    } else {
      // 复杂情况：有边池，分别处理主池和边池
      if (this.mainPot > 0) {
        const mainPotWinners = getWinner(
          this.pots[0].players,
          this.communityCards
        );
        const mainPotShare = Math.floor(this.mainPot / mainPotWinners.length);

        mainPotWinners.forEach((winner) => {
          const player = this.findPlayerById(winner.id);
          if (player) {
            player.chips += mainPotShare;
            this.addMessage(
              `${player.name} wins ${mainPotShare} from main pot with ${winner.descr}`
            );
          }
        });
      }

      // 分配每个边池
      this.sidePots.forEach((pot, index) => {
        if (pot.amount > 0) {
          const potWinners = getWinner(pot.players, this.communityCards);
          const potShare = Math.floor(pot.amount / potWinners.length);

          potWinners.forEach((winner) => {
            const player = this.findPlayerById(winner.id);
            if (player) {
              player.chips += potShare;
              this.addMessage(
                `${player.name} wins ${potShare} from side pot ${
                  index + 1
                } with ${winner.descr}`
              );
            }
          });
        }
      });
    }

    // 清空所有池
    this.mainPot = 0;
    this.sidePots = [];
    this.pots = [];
    this.pot = 0;
  }

  // show cards
  showCards(playerId, isForced = false) {
    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    // can only show cards in the following cases:
    // 1. forced to show (last un-folded player at river)
    // 2. the last un-folded player, and choose to show
    if (!isForced && this.inHandPlayers.length !== 1) {
      return;
    }

    // record that the player has shown cards
    this.shownCards.add(playerId);
  }

  // check if the round should end
  shouldEndRound() {
    // if there is no last raising player, the round is just starting
    if (this.lastRaisePlayer === null) {
      return false;
    }

    // check if all unfolded and not all-in players have acted and bet equal
    const activePlayers = this.players.filter(
      (p) => !p.isFolded && !p.isAllIn && p.isActive
    );

    return activePlayers.every(
      (p) => p.currentBet === this.currentRoundMaxBet || p.isAllIn
    );
  }

  // end hand with one player
  endHandWithOnePlayer() {
    const winner = this.activePlayers[0];
    winner.chips += this.pot;
    this.pot = 0;
    this.currentRound = null;
    this.currentRoundMaxBet = 0;

    // reset game state
    setTimeout(() => {
      this.startNewHand();
    }, 3000);
  }
}

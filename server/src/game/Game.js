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

    // 如果游戏处于等待状态且现在有足够的玩家，重新开始游戏
    if (this.isWaiting && this.players.length >= 2 && this.isGameInProgress) {
      console.log("New player joined, resuming game");
      this.isWaiting = false;
      this.startNewHand();
    }

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
    console.log("startNewHand called, starting a new hand");

    if (!this.isGameInProgress) {
      throw new Error("Game has not been started");
    }

    // 检查是否有足够的玩家
    if (this.players.length < 2) {
      console.log(
        "Not enough players to start a new hand, entering waiting state"
      );
      // 不再抛出错误，而是进入等待状态
      this.enterWaitingState();
      return;
    }

    // check if each player has enough chips
    const insufficientChipsPlayers = this.players.filter(
      (player) => player.chips < this.bigBlind
    );
    if (insufficientChipsPlayers.length > 0) {
      insufficientChipsPlayers.forEach((player) => {
        this.removePlayer(player.id);
      });

      // 再次检查是否有足够的玩家
      if (this.players.length < 2) {
        console.log(
          "Not enough players with sufficient chips, entering waiting state"
        );
        // 不再抛出错误，而是进入等待状态
        this.enterWaitingState();
        return;
      }
    }

    this.shownCards.clear(); // clear shown cards record

    this.round++;
    this.currentRound = "preflop"; // 明确设置为preflop
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
    // 在preflop轮，如果大盲还没有行动过，不应该进入下一轮
    // 但如果大盲已经全下，则视为已经行动过
    if (this.currentRound === "preflop" && !this.bigBlindHasActed) {
      const bigBlindPlayer = this.findPlayerByPosition(this.bigBlindPos);
      if (bigBlindPlayer && bigBlindPlayer.isAllIn) {
        // 如果大盲已经全下，视为已经行动过
        this.bigBlindHasActed = true;
      } else {
        return;
      }
    }

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
        console.log("River round ended, calling endHand");
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
    console.log("endHand called, ending the current hand");

    // 清除任何可能存在的超时
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    // 保存当前回合信息
    const currentRoundBeforeEnd = this.currentRound;

    // 计算底池
    this.calculatePots();

    // 确定赢家并分配底池
    this.distributePots();

    // 重置游戏状态
    this.communityCards = [];
    // 不将currentRound设置为null，保持当前回合状态
    // this.currentRound = null; // 注释掉这行，不再设置为null
    this.currentRoundMaxBet = 0;
    this.mainPot = 0;
    this.sidePots = [];
    this.lastRaisePlayer = null;
    this.lastRaiseAmount = 0;

    // 重置玩家状态
    this.players.forEach((player) => {
      player.reset();
    });

    // 通知所有玩家本手牌已结束
    this.addMessage("本手牌已结束");

    console.log(`Hand ended, currentRound is: ${this.currentRound}`);

    // 设置超时，开始新的一手牌
    setTimeout(() => {
      this.startNewHand();
    }, 3000);
  }

  // handle player bet
  handleBet(playerId, amount) {
    const player = this.findPlayerById(playerId);
    if (!player) {
      throw new Error("Player not found");
    }

    console.log(
      `handleBet: player ${playerId} betting ${amount}, current pot: ${this.pot}`
    );

    // player bet
    const betAmount = player.bet(amount);
    this.pot += betAmount;

    console.log(`After bet, pot: ${this.pot}, player bet: ${betAmount}`);

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

    // 记录玩家已经check过，这对于河牌轮尤其重要
    player.hasChecked = true;
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

      // 添加标记，表示大盲尚未行动
      this.bigBlindHasActed = false;
    } else {
      // other rounds start from small blind
      this.currentPlayer = this.smallBlindPos;
      this.lastRaisePlayer = null;
      this.bigBlindHasActed = true; // 非preflop轮不需要考虑大盲特权

      // 确保在河牌轮开始时不会立即结束回合
      if (this.currentRound === "river") {
        console.log("Starting river round, ensuring players can act");
        // 不设置lastRaisePlayer，让waitForPlayerAction方法处理
      }
    }

    this.waitForPlayerAction();
  }

  // wait for player action
  waitForPlayerAction() {
    // 如果当前玩家不活跃、已弃牌或已全下，则跳到下一个玩家
    if (
      !this.players[this.currentPlayer].isActive ||
      this.players[this.currentPlayer].isFolded ||
      this.players[this.currentPlayer].isAllIn
    ) {
      this.moveToNextPlayer();
      return;
    }

    // 通知当前玩家该他行动了
    this.addMessage(
      `轮到 ${this.players[this.currentPlayer].name} 行动`,
      this.players[this.currentPlayer].id
    );

    // 在河牌轮中，我们需要特别处理，确保所有玩家都有机会行动
    if (this.currentRound === "river") {
      // 不立即检查是否应该结束回合，而是等待玩家行动
      this.timeoutId = setTimeout(() => {
        // 如果玩家没有在时间限制内行动，自动弃牌
        this.handleFold(this.players[this.currentPlayer].id);
      }, this.timeLimit * 1000);
      return;
    }

    // 检查是否所有玩家都已行动且下注相等
    if (this.shouldEndRound()) {
      this.nextRound();
      return;
    }

    // 设置超时，如果玩家没有在时间限制内行动，自动弃牌
    this.timeoutId = setTimeout(() => {
      this.handleFold(this.players[this.currentPlayer].id);
    }, this.timeLimit * 1000);
  }

  moveToNextPlayer() {
    console.log("moveToNextPlayer called, currentRound:", this.currentRound);

    // 更新活跃玩家列表
    this.updateActivePlayers();

    // 如果只剩一个活跃玩家，结束本手牌
    if (this.inHandPlayers.length === 1) {
      console.log("Only one active player left, ending hand with one player");
      this.endHandWithOnePlayer();
      return;
    }

    // 获取当前仍在游戏中的玩家（未弃牌）
    const stillInPlayers = this.players.filter(
      (p) => p.isActive && !p.isFolded
    );

    // 检查是否所有玩家都全下
    const allAllIn = stillInPlayers.every((p) => p.isAllIn);

    // 检查是否除一人外都全下且那人已跟注
    const nonAllInPlayers = stillInPlayers.filter((p) => !p.isAllIn);
    const allButOneAllIn =
      nonAllInPlayers.length === 1 &&
      nonAllInPlayers[0].currentBet === this.currentRoundMaxBet;

    // 获取仍在游戏中且非全下的玩家数量
    const activePlayersRemaining = stillInPlayers.filter(
      (p) => !p.isAllIn
    ).length;

    // 如果有活跃玩家（非全下）超过1个，则不应该直接发完所有牌
    const shouldContinueNormally = activePlayersRemaining >= 2;

    // 在preflop轮，如果大盲还没有行动过，不应该直接发完所有牌
    let bigBlindNeedsToAct = false;
    if (this.currentRound === "preflop" && !this.bigBlindHasActed) {
      const bigBlindPlayer = this.findPlayerByPosition(this.bigBlindPos);
      // 如果大盲还没有行动过且不是全下状态，则需要给大盲行动机会
      if (bigBlindPlayer && !bigBlindPlayer.isAllIn) {
        bigBlindNeedsToAct = true;
      }
    }

    console.log("Game state:", {
      allAllIn,
      allButOneAllIn,
      activePlayersRemaining,
      shouldContinueNormally,
      bigBlindNeedsToAct,
      pot: this.pot,
      currentPlayer: this.currentPlayer,
      bigBlindPos: this.bigBlindPos,
    });

    // 只有在以下情况才直接发完所有牌：
    // 1. 所有玩家都全下，或
    // 2. 除一人外都全下且那人已跟注，且
    // 3. 没有足够的活跃玩家继续正常下注，且
    // 4. 不是在preflop轮且大盲需要行动
    const shouldDealAllCards =
      (allAllIn || allButOneAllIn) &&
      !shouldContinueNormally &&
      !bigBlindNeedsToAct;

    // 如果当前是preflop轮，且大盲还没有行动过，且大盲不是全下状态，则需要找到下一个玩家
    if (this.currentRound === "preflop" && !this.bigBlindHasActed) {
      const bigBlindPlayer = this.findPlayerByPosition(this.bigBlindPos);
      if (bigBlindPlayer && !bigBlindPlayer.isAllIn) {
        console.log("Big blind needs to act in preflop round");

        // 如果当前玩家不是大盲，则找到下一个玩家
        if (this.currentPlayer !== this.bigBlindPos) {
          // 找到下一个应该行动的玩家
          let nextPlayerPos = (this.currentPlayer + 1) % this.players.length;
          let loopCount = 0;
          const maxLoops = this.players.length; // 防止无限循环

          while (
            loopCount < maxLoops &&
            (!this.players[nextPlayerPos].isActive ||
              this.players[nextPlayerPos].isFolded ||
              this.players[nextPlayerPos].isAllIn) &&
            nextPlayerPos !== this.bigBlindPos // 确保不会跳过大盲
          ) {
            nextPlayerPos = (nextPlayerPos + 1) % this.players.length;
            loopCount++;
          }

          // 更新当前玩家
          this.currentPlayer = nextPlayerPos;
          this.waitForPlayerAction();
          return;
        }
      }
    }

    if (shouldDealAllCards) {
      console.log(
        "All players are all-in or only one player left who has matched the bet, dealing all cards"
      );
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

    // 检查是否所有玩家都已行动且下注相等
    // 在河牌轮中，我们需要确保所有玩家都有机会行动
    if (this.currentRound === "river") {
      // 检查是否所有非全下的活跃玩家都已经check或下注
      const allPlayersActed = this.activePlayers
        .filter((p) => !p.isAllIn && !p.isFolded)
        .every((p) => p.hasChecked || p.currentBet > 0);

      // 检查所有玩家的下注是否相等
      const allBetsEqual = this.activePlayers
        .filter((p) => !p.isAllIn && !p.isFolded)
        .every((p) => p.currentBet === this.currentRoundMaxBet);

      // 只有当所有玩家都行动过且下注相等时，才结束游戏
      if (allPlayersActed && allBetsEqual && this.shouldEndRound()) {
        this.endHand();
        return;
      }
    } else if (this.shouldEndRound()) {
      // 如果不是河牌轮，且应该结束当前回合，则进入下一回合
      this.nextRound();
      return;
    }

    // 找到下一个应该行动的玩家
    let nextPlayerPos = (this.currentPlayer + 1) % this.players.length;
    let loopCount = 0;
    const maxLoops = this.players.length; // 防止无限循环

    while (
      loopCount < maxLoops &&
      (!this.players[nextPlayerPos].isActive ||
        this.players[nextPlayerPos].isFolded ||
        this.players[nextPlayerPos].isAllIn)
    ) {
      nextPlayerPos = (nextPlayerPos + 1) % this.players.length;
      loopCount++;

      // 如果循环回到当前玩家或已经循环了一圈，说明没有其他玩家可以行动了
      if (loopCount >= maxLoops) {
        console.log("No more players can act, checking if round should end");

        // 如果当前是河牌轮，结束游戏
        if (this.currentRound === "river") {
          this.endHand();
          return;
        }
        // 否则进入下一回合
        this.nextRound();
        return;
      }
    }

    // 更新当前玩家
    this.currentPlayer = nextPlayerPos;
    this.waitForPlayerAction();
  }

  // handle player action
  handlePlayerAction(playerId, action, amount = 0) {
    console.log(
      `handlePlayerAction: ${playerId} ${action} ${amount}, currentRound: ${this.currentRound}, pot: ${this.pot}`
    );

    const player = this.findPlayerById(playerId);
    if (player.position !== this.currentPlayer) {
      throw new Error("Not your turn");
    }

    try {
      // 如果当前是preflop轮且当前玩家是大盲，标记大盲已经行动
      if (
        this.currentRound === "preflop" &&
        player.position === this.bigBlindPos
      ) {
        this.bigBlindHasActed = true;
      }

      switch (action) {
        case "fold":
          this.handleFold(playerId);
          break;
        case "check":
          this.handleCheck(playerId);
          // 在河牌轮，如果玩家check，需要设置lastRaisePlayer以便正确结束回合
          if (this.currentRound === "river" && this.lastRaisePlayer === null) {
            console.log("Setting lastRaisePlayer after check in river round");
            this.lastRaisePlayer = player.position;
          }
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
          console.log(
            `Player ${playerId} is going all-in with ${player.chips} chips`
          );
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

      console.log(
        `After action, pot: ${this.pot}, currentRound: ${this.currentRound}`
      );

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
    console.log("distributePots");
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
    console.log("Checking if round should end:", {
      currentRound: this.currentRound,
      lastRaisePlayer: this.lastRaisePlayer,
      bigBlindHasActed: this.bigBlindHasActed,
      currentPlayer: this.currentPlayer,
      bigBlindPos: this.bigBlindPos,
    });

    // if there is no last raising player, the round is just starting
    if (this.lastRaisePlayer === null) {
      console.log("No last raising player, round is just starting");
      return false;
    }

    // 在preflop轮，如果大盲还没有行动过，不应该结束回合
    // 但如果大盲已经全下，则视为已经行动过
    if (this.currentRound === "preflop" && !this.bigBlindHasActed) {
      const bigBlindPlayer = this.findPlayerByPosition(this.bigBlindPos);
      if (bigBlindPlayer && bigBlindPlayer.isAllIn) {
        // 如果大盲已经全下，视为已经行动过
        this.bigBlindHasActed = true;
      } else {
        console.log("Preflop round and big blind has not acted yet");
        return false;
      }
    }

    // 检查当前玩家是否是大盲，如果是且在preflop轮，需要给他行动机会
    if (
      this.currentRound === "preflop" &&
      this.currentPlayer === this.bigBlindPos &&
      !this.bigBlindHasActed
    ) {
      console.log("Current player is big blind in preflop round");
      return false;
    }

    // check if all unfolded and not all-in players have acted and bet equal
    const activePlayers = this.players.filter(
      (p) => !p.isFolded && !p.isAllIn && p.isActive
    );

    const allBetsEqual = activePlayers.every(
      (p) => p.currentBet === this.currentRoundMaxBet || p.isAllIn
    );

    console.log(
      "All bets equal:",
      allBetsEqual,
      "Active players:",
      activePlayers.length
    );

    return allBetsEqual;
  }

  // end hand with one player
  endHandWithOnePlayer() {
    console.log("endHandWithOnePlayer called, ending hand with one player");

    const winner = this.activePlayers[0];
    const potAmount = this.pot; // 保存当前底池金额
    winner.chips += potAmount;

    // 保存当前回合信息，以便在日志中显示
    const currentRoundBeforeEnd = this.currentRound;

    // 重置游戏状态
    this.pot = 0;
    this.currentRoundMaxBet = 0;
    this.mainPot = 0;
    this.sidePots = [];
    this.lastRaisePlayer = null;
    this.lastRaiseAmount = 0;

    // 通知所有玩家本手牌已结束
    this.addMessage(`${winner.name} 获胜并赢得 ${potAmount} 筹码`);

    // 重置玩家状态
    this.players.forEach((player) => {
      player.reset();
    });

    // 设置一个标志，表示这是由于只剩一名玩家而结束的手牌
    this._endedWithOnePlayer = true;

    console.log(
      `Hand ended with one player, currentRound was: ${currentRoundBeforeEnd}`
    );

    // 在这里不设置currentRound为null，而是在startNewHand中设置

    // reset game state
    setTimeout(() => {
      // 如果是由于只剩一名玩家而结束的手牌，不增加round计数
      if (this._endedWithOnePlayer) {
        this._endedWithOnePlayer = false;
        // 减少round计数，因为startNewHand会增加它
        this.round--;
      }
      this.startNewHand();
    }, 3000);
  }

  // 新增方法：进入等待状态
  enterWaitingState() {
    console.log("Game entering waiting state, waiting for more players");

    // 设置游戏状态为等待中
    this.isWaiting = true;

    // 保存当前回合状态
    this.currentRound = "waiting";

    // 清空底池和公共牌
    this.pot = 0;
    this.communityCards = [];
    this.currentRoundMaxBet = 0;

    // 重置玩家状态，但保留筹码
    this.players.forEach((player) => {
      player.isFolded = false;
      player.isAllIn = false;
      player.currentBet = 0;
      player.totalBet = 0;
      player.hand = [];
      player.hasChecked = false;
    });

    // 通知所有玩家游戏进入等待状态
    this.addMessage("游戏进入等待状态，等待更多玩家加入");
  }
}

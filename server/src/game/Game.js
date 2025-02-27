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
    this.activePlayers = []; // current active players list
    this.inHandPlayers = []; // players in hand (including all-in players)
    this.actionTimeout = null; // for player action timeout

    // game notification system
    this.gameMessages = {
      broadcast: [], // broadcast messages (everyone can see)
      playerMessages: {}, // messages for specific players
    };

    this.mainPot = 0; // main pot   
    this.sidePots = []; // side pots, each side pot contains amount and players
  }

  determineWinner() {
    // use players in hand (including all-in players) to determine winners
    const winners = getWinner(this.inHandPlayers);
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

    // check if each player has enough chips
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

    this.round++;
    this.currentRound = "preflop";
    this.pot = 0;
    this.communityCards = [];
    this.currentRoundMaxBet = 0;
    this.deck.shuffle();

    // reset all players' status
    this.players.forEach((player) => player.reset());

    // reset active players list
    this.activePlayers = this.players.filter((player) => player.isActive);
    this.activePlayerCount = this.activePlayers.length;

    // update players in hand (excluding folded players)
    this.inHandPlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded
    );

    // move button position
    this.moveButton();

    // collect blinds
    this.collectBlinds();

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

  // collect blinds
  collectBlinds() {
    const smallBlindPlayer = this.players[this.smallBlindPos];
    const bigBlindPlayer = this.players[this.bigBlindPos];

    // collect small blind
    const sbAmount = smallBlindPlayer.bet(this.smallBlind);
    this.pot += sbAmount;

    // collect big blind
    const bbAmount = bigBlindPlayer.bet(this.bigBlind);
    this.pot += bbAmount;

    this.currentRoundMaxBet = this.bigBlind;
  }

  // deal hole cards
  dealHoleCards() {
    // each player receives 2 cards
    for (let i = 0; i < 2; i++) {
      this.players.forEach((player) => {
        if (player.isActive) {
          player.receiveCard(this.deck.drawCard());
        }
      });
    }
  }

  // next round
  nextRound() {
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
        this.showdown();
        break;
    }
    // reset current round bets
    this.resetBets();
  }

  // deal public cards
  dealFlop() {
    for (let i = 0; i < 3; i++) {
      this.communityCards.push(this.deck.drawCard());
    }
  }

  dealTurn() {
    this.communityCards.push(this.deck.drawCard());
  }

  dealRiver() {
    this.communityCards.push(this.deck.drawCard());
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
    };
  }

  // update active players list when a player folds
  updateActivePlayers() {
    // update players who can continue (excluding folded and all-in players)
    this.activePlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded && !player.isAllIn
    );
    this.activePlayerCount = this.activePlayers.length;

    // update players in hand (excluding folded players)
    this.inHandPlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded
    );

    // if there is only one player who can continue, this round ends
    if (this.activePlayerCount === 1) {
      this.endHand();
    }
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
    const winners = this.determineWinner();
    this.distributeWinnings(winners);

    console.log(
      "Winners:",
      winners.map((winner) => `${winner.id} ${winner.name} ${winner.descr}`)
    );

    // check players status after each hand
    this.checkPlayersStatus();
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
    if (!player) {
      throw new Error("Player not found");
    }

    player.fold();
    this.updateActivePlayers();
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

    // determine first player to act
    if (this.currentRound === "preflop") {
      // preflop starts from big blind position
      this.currentPlayer = (this.bigBlindPos + 1) % this.players.length;
    } else {
      // other rounds start from dealer position
      this.currentPlayer = (this.dealer + 1) % this.players.length;
    }

    this.waitForPlayerAction();
  }

  // wait for player action
  waitForPlayerAction() {
    const player = this.players[this.currentPlayer];

    // if player has folded or is all in, move to next player
    if (!player.isActive || player.isFolded || player.isAllIn) {
      this.moveToNextPlayer();
      return;
    }

    // add notification
    this.addMessage(`It's your turn`, player.id);

    // set action timeout
    this.actionTimeout = setTimeout(() => {
      // timeout auto fold
      this.handleFold(player.id);
      this.addMessage(`Player ${player.name} fold due to timeout`);
    }, this.timeLimit * 1000);
  }

  // move to next player
  moveToNextPlayer() {
    // clear current timeout
    if (this.actionTimeout) {
      clearTimeout(this.actionTimeout);
    }

    // find next active player
    do {
      this.currentPlayer = (this.currentPlayer + 1) % this.players.length;

      // if back to last raising player, this round ends
      if (this.currentPlayer === this.lastRaisePlayer) {
        this.nextRound();
        return;
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
    // verify if it's the player's turn
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
          this.handleBet(playerId, this.currentRoundMaxBet - player.currentBet);
          break;
        case "raise":
          this.handleBet(playerId, amount);
          this.lastRaisePlayer = player.position;
          break;
        case "allin":
          const allinAmount = player.chips; // all remaining chips
          this.handleBet(playerId, allinAmount);
          if (allinAmount > this.currentRoundMaxBet) {
            this.lastRaisePlayer = player.position;
          }
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

    // if no amount to call, can check
    if (toCall === 0) {
      actions.push("check");
    }

    // if player chips are enough to call, can call
    if (toCall > 0 && player.chips >= toCall) {
      actions.push("call");
    }

    // if player chips are more than needed to call, can raise
    if (player.chips > toCall) {
      actions.push("raise");
    }

    // always can all-in (as long as there are chips)
    if (player.chips > 0) {
      actions.push("allin");
    }

    return actions;
  }

  // calculate all pots (main pot and side pots)
  calculatePots() {
    // get all players who can continue
    const activeBets = this.inHandPlayers
      .map((player) => ({
        id: player.id,
        bet: player.totalBet,
        chips: player.chips,
      }))
      .sort((a, b) => a.bet - b.bet); // sort by bet amount in ascending order

    let pots = [];
    let processedBet = 0;

    // create a pot for each different bet amount
    while (activeBets.length > 0) {
      const currentBet = activeBets[0].bet;
      const betDifference = currentBet - processedBet;

      if (betDifference > 0) {
        // create a new pot
        const pot = {
          amount: betDifference * activeBets.length,
          players: activeBets.map((bet) => bet.id),
        };
        pots.push(pot);
      }

      processedBet = currentBet;
      activeBets.shift(); // remove the smallest bet
    }

    // update main pot and side pots
    this.mainPot = pots[0]?.amount || 0;
    this.sidePots = pots.slice(1);
  }

  // distribute pots
  distributeWinnings(winners) {
    // handle main pot
    if (this.mainPot > 0) {
      const mainPotWinners = winners.filter((w) =>
        this.inHandPlayers.some((p) => p.id === w.id)
      );
      if (mainPotWinners.length > 0) {
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
    }

    // handle side pots
    this.sidePots.forEach((sidePot, index) => {
      const sidePotWinners = winners.filter((w) =>
        sidePot.players.includes(w.id)
      );
      if (sidePotWinners.length > 0) {
        const sidePotShare = Math.floor(sidePot.amount / sidePotWinners.length);
        sidePotWinners.forEach((winner) => {
          const player = this.findPlayerById(winner.id);
          if (player) {
            player.chips += sidePotShare;
            this.addMessage(
              `${player.name} wins ${sidePotShare} from side pot ${
                index + 1
              } with ${winner.descr}`
            );
          }
        });
      }
    });
  }
}

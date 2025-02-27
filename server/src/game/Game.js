import Player from "./Player";
import Deck from "./Deck";
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

    // 当前局状态
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
  }

  // add player
  addPlayer(name) {
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
      throw new Error("Not enough players");
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

    // move button position
    this.moveButton();

    // collect blinds
    this.collectBlinds();

    // deal hole cards
    this.dealHoleCards();
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

    smallBlindPlayer.bet(this.smallBlind);
    bigBlindPlayer.bet(this.bigBlind);

    this.pot += this.smallBlind + this.bigBlind;
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
    this.players.forEach((player) => {
      player.currentBet = 0;
    });

    this.currentRoundMaxBet = 0;
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
  getGameState() {
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
      activePlayerCount: this.activePlayerCount,
    };
  }

  // update active players list when a player folds
  updateActivePlayers() {
    this.activePlayers = this.players.filter(
      (player) => player.isActive && !player.isFolded && !player.isAllIn
    );
    this.activePlayerCount = this.activePlayers.length;

    // if there is only one active player, this round ends
    // TODO: winner determination
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

}

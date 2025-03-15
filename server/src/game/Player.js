export default class Player {
  constructor(id, name, initialChips) {
    this.id = id;
    this.name = name;
    // TODO: check if player is guest
    this.chips = initialChips; // initial chips set by game
    this.hand = [];
    this.isActive = true;
    this.isFolded = false;
    this.isAllIn = false;
    this.currentBet = 0; // current round bet amount
    this.position = -1;
    this.totalBet = 0; // total bet amount in all rounds
    this.hasChecked = false;
    this.totalRounds = 0; // total rounds player has participated
    this.markedForRemoval = false; // 标记玩家是否将要被移除
  }

  // receive card from deck
  receiveCard(card) {
    this.hand.push(card);
  }

  // let ui control the bet amount, max bet amount is the player's chips
  bet(amount) {
    this.chips -= amount;
    this.currentBet += amount;
    this.totalBet += amount;
    this.hasChecked = false; // reset check status
    if (this.chips === 0) {
      this.isAllIn = true;
    }
    return amount;
  }

  check() {
    this.hasChecked = true;
    return 0; // return bet amount (check is 0)
  }

  // fold
  fold() {
    this.isFolded = true;
    this.isActive = false;
    this.hand = [];
  }

  // reset player status (when a new game round starts)
  reset() {
    this.hand = [];
    this.isFolded = false;
    this.isAllIn = false;
    this.currentBet = 0;
    this.totalBet = 0;
    this.hasChecked = false;
  }

  // get player current status
  getStatus() {
    return {
      name: this.name,
      chips: this.chips,
      isActive: this.isActive,
      isFolded: this.isFolded,
      isAllIn: this.isAllIn,
      currentBet: this.currentBet,
      position: this.position,
      totalBet: this.totalBet,
      hasChecked: this.hasChecked,
      totalRounds: this.totalRounds,
      markedForRemoval: this.markedForRemoval,
    };
  }

  // increment total rounds
  incrementRounds() {
    this.totalRounds += 1;
  }
}

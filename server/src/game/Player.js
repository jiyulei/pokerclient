export default class Player {
  constructor(name, initialChips) {
    this.name = name;
    this.chips = initialChips; // initial chips set by game
    this.cards = [];
    this.isActive = true;
    this.isFolded = false;
    this.isAllIn = false;
    this.currentBet = 0; // current round bet amount
    this.position = -1;
    this.totalBet = 0; // total bet amount in all rounds
    this.hasChecked = false;
  }

  // receive card from deck
  receiveCard(card) {
    this.cards.push(card);
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
    this.cards = [];
  }

  // reset player status (when a new game round starts)
  reset() {
    this.cards = [];
    this.isActive = true;
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
    };
  }
}

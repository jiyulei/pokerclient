import Card from "./Card";

export default class Deck {
  constructor() {
    this.cards = [];
    // 使用数字表示牌面值，14代表A
    const ranks = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const suits = ["hearts", "diamonds", "clubs", "spades"];

    for (let suit of suits) {
      for (let rank of ranks) {
        this.cards.push(new Card(rank, suit));
      }
    }
  }

  shuffle() {
    for (let i = this.cards.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
    }
  }

  deal() {
    return this.cards.pop();
  }
}

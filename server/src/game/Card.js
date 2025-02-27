export default class Card {
  constructor(rank, suit) {
    this.rank = rank;
    this.suit = suit;
  }

  getRank() {
    return this.rank;
  }

  getSuit() {
    return this.suit;
  }

  toString() {
    const rankMap = {
      2: "2",
      3: "3",
      4: "4",
      5: "5",
      6: "6",
      7: "7",
      8: "8",
      9: "9",
      10: "T",
      11: "J",
      12: "Q",
      13: "K",
      14: "A",
    };

    const suitMap = {
      hearts: "h",
      diamonds: "d",
      clubs: "c",
      spades: "s",
    };

    return `${rankMap[this.rank]}${suitMap[this.suit]}`;
  }

  toDisplayString() {
    const rankMap = {
      14: "A",
      13: "K",
      12: "Q",
      11: "J",
      10: "10",
    };

    return `${rankMap[this.rank] || this.rank} of ${this.suit}`;
  }
}
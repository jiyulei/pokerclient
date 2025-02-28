import Card from "../Card"; 

describe("Card", () => {
  test("should create card with correct rank and suit", () => {
    const card = new Card(14, "hearts");
    expect(card.rank).toBe(14);
    expect(card.suit).toBe("hearts");
  });

  test("toString should return correct pokersolver format", () => {
    const testCases = [
      { rank: 14, suit: "hearts", expected: "Ah" },
      { rank: 13, suit: "spades", expected: "Ks" },
      { rank: 12, suit: "diamonds", expected: "Qd" },
      { rank: 11, suit: "clubs", expected: "Jc" },
      { rank: 10, suit: "hearts", expected: "Th" },
      { rank: 9, suit: "diamonds", expected: "9d" },
      { rank: 2, suit: "clubs", expected: "2c" },
    ];

    testCases.forEach(({ rank, suit, expected }) => {
      const card = new Card(rank, suit);
      expect(card.toString()).toBe(expected);
    });
  });

  test("toDisplayString should return human readable format", () => {
    const testCases = [
      { rank: 14, suit: "hearts", expected: "A of hearts" },
      { rank: 13, suit: "spades", expected: "K of spades" },
      { rank: 12, suit: "diamonds", expected: "Q of diamonds" },
      { rank: 11, suit: "clubs", expected: "J of clubs" },
      { rank: 10, suit: "hearts", expected: "10 of hearts" },
      { rank: 9, suit: "diamonds", expected: "9 of diamonds" },
      { rank: 2, suit: "clubs", expected: "2 of clubs" },
    ];

    testCases.forEach(({ rank, suit, expected }) => {
      const card = new Card(rank, suit);
      expect(card.toDisplayString()).toBe(expected);
    });
  });
});

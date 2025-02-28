import Deck from "../Deck";

describe("Deck", () => {
  test("should create a deck with 52 cards", () => {
    const deck = new Deck();
    expect(deck.cards.length).toBe(52);
  });

  test("should have correct number of each suit", () => {
    const deck = new Deck();
    const suits = ["hearts", "diamonds", "clubs", "spades"];

    suits.forEach((suit) => {
      const suitCount = deck.cards.filter((card) => card.suit === suit).length;
      expect(suitCount).toBe(13);
    });
  });

  test("should have correct number of each rank", () => {
    const deck = new Deck();
    for (let rank = 2; rank <= 14; rank++) {
      const rankCount = deck.cards.filter((card) => card.rank === rank).length;
      expect(rankCount).toBe(4);
    }
  });

  test("deal should return one card and reduce deck size", () => {
    const deck = new Deck();
    const initialSize = deck.cards.length;
    const card = deck.deal();

    expect(card).toBeDefined();
    expect(deck.cards.length).toBe(initialSize - 1);
  });

  test("shuffle should maintain deck size and card composition", () => {
    const deck = new Deck();
    const initialCards = [...deck.cards];
    deck.shuffle();

    // 检查大小没变
    expect(deck.cards.length).toBe(52);

    // 检查所有牌都还在，只是顺序可能变了
    const allCardsPresent = initialCards.every((initialCard) =>
      deck.cards.some(
        (shuffledCard) =>
          shuffledCard.rank === initialCard.rank &&
          shuffledCard.suit === initialCard.suit
      )
    );
    expect(allCardsPresent).toBe(true);

    // 检查是否真的打乱了（注意：理论上有极小概率会完全相同）
    const hasChanged = deck.cards.some(
      (card, index) => card !== initialCards[index]
    );
    expect(hasChanged).toBe(true);
  });
});

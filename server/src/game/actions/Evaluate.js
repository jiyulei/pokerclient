import pokersolver from "pokersolver";
const { Hand } = pokersolver;

export function getWinner(players) {
  const playerHands = players.map((player) => ({
    hand: Hand.solve([
      ...player.cards.map((card) => card.toString()),
      ...this.communityCards.map((card) => card.toString()),
    ]),
    id: player.id,
    name: player.name,
  }));

  const winners = Hand.winners(playerHands.map((ph) => ph.hand));

  // 找出获胜者的完整信息
  return winners.map((winningHand) => {
    const winningPlayer = playerHands.find((ph) => ph.hand === winningHand);
    return {
      id: winningPlayer.id,
      name: winningPlayer.name,
      descr: winningHand.descr,
    };
  });
}

// Test case
// const communityCards = ['7h', '8h', '9h', '9d', '7c'];

// const test1 = getWinner([
//   {
//     id: "player1",
//     name: "Jerry",
//     cards: [...communityCards, "7s", "8c"],
//   },
//   {
//     id: "player2",
//     name: "Tom",
//     cards: [...communityCards, "Qh", "6h"],
//   },
//   {
//     id: "player3",
//     name: "John",
//     cards: [...communityCards, "7d", "9s"],
//   },
// ]);

// console.log(test1);

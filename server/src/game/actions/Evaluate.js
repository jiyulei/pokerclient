import pokersolver from "pokersolver";
const { Hand } = pokersolver;

export function getWinner(players, communityCards) {
  const playerHands = players.map((player) => ({
    hand: Hand.solve([
      ...player.hand.map((card) => card.toString()),
      ...communityCards.map((card) => card.toString()),
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

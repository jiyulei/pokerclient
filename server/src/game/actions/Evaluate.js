import pokersolver from "pokersolver";

const { Hand } = pokersolver;

export function getWinner(players) {
  const playerHands = players.map((player) => ({
    hand: Hand.solve(player.cards),
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


console.log("========= 测试用例 =========");

// 测试1: 一对 vs 两对
const test1 = getWinner([
  {
    id: "player1",
    name: "Jerry",
    cards: ["Ad", "As", "Jc", "Th", "2d", "3c", "Kd"],
  },
  {
    id: "player2",
    name: "Tom",
    cards: ["Ad", "As", "Jc", "Th", "2d", "Qs", "Qd"],
  },
]);
console.log("测试1 - 一对vs两对:");
console.log(test1);

// 测试2: 平局情况
const test2 = getWinner([
  {
    id: "player1",
    name: "Jerry",
    cards: ["Ad", "As", "Kh", "Kd", "2d", "3c", "4d"],
  },
  {
    id: "player2",
    name: "Tom",
    cards: ["Ac", "Ah", "Ks", "Kc", "2h", "3d", "4h"],
  },
]);
console.log("\n测试2 - 相同牌型平局:");
console.log(test2);

// 测试3: 同花 vs 顺子
const test3 = getWinner([
  {
    id: "player1",
    name: "Jerry",
    cards: ["7h", "8h", "9h", "Th", "Jh", "2c", "3d"],
  },
  {
    id: "player2",
    name: "Tom",
    cards: ["8c", "9d", "Th", "Js", "Qc", "2h", "3s"],
  },
]);
console.log("\n测试3 - 同花vs顺子:");
console.log(test3);

// 测试4: 三人场景，包含同花顺
const test4 = getWinner([
  {
    id: "player1",
    name: "Jerry",
    cards: ["2h", "3h", "4h", "5h", "7h", "8c", "9d"],
  },
  {
    id: "player2",
    name: "Tom",
    cards: ["Ac", "Kc", "Qc", "Jc", "Tc", "2d", "3s"],
  },
  {
    id: "player3",
    name: "Spike",
    cards: ["As", "Ad", "Ah", "Kh", "Kd", "2c", "3d"],
  },
]);
console.log("\n测试4 - 三人场景(同花顺vs同花vs葫芦):");
console.log(test4);
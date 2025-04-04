import GameManager from "./GameManager.js";
import prisma from "./prisma.js";

async function testGameManager() {
  try {
    console.log("✅ 开始测试 GameManager...");

    // 1️⃣ 创建新游戏
    console.log("\n🎲 创建新游戏...");
    const game = await GameManager.createGame({
      initialChips: 1000,
      smallBlind: 5,
      bigBlind: 10,
      maxPlayers: 6,
      timeLimit: 1000,
    });
    console.log("🆕 新游戏创建成功:", game);

    // 2️⃣ 玩家加入游戏（测试游客 & 登录用户）
    console.log("\n🙋 玩家加入游戏...");
    const player1 = await GameManager.joinGame(game.id, {});
    const player2 = await GameManager.joinGame(game.id, {}); // 游客
    const player3 = await GameManager.joinGame(game.id, {}); // 游客

    console.log("👤 玩家 1:", player1);
    console.log("👤 玩家 2:", player2);
    console.log("👤 玩家 3:", player3);
    // 3️⃣ 开始游戏
    console.log("\n🚀 开始游戏...");

    const gameInstance = GameManager.games.get(game.id);
    await GameManager.leaveGame(game.id, player2.id);
    gameInstance.startGame();
    await GameManager.syncGameState(game.id); // 同步到数据库
    console.log("✅ 游戏状态:", gameInstance.getGameState(player1.id));
    console.log("✅ 游戏状态:", gameInstance.getGameState(player2.id));
    console.log("✅ 游戏状态:", gameInstance.getGameState(player3.id));

    // 4️⃣ 玩家行动
    // console.log("\n🎭 玩家行动...");
    // await GameManager.handlePlayerAction(game.id, player2.id, "call");
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // await GameManager.handlePlayerAction(game.id, player1.id, "check");
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // // await GameManager.syncGameState(game.id);
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // console.log("🎲 下注完成，游戏状态:", gameInstance.getGameState());

    // // 5️⃣ 进入下一轮
    // console.log("\n🔄 进入下一轮...");
    // // gameInstance.nextRound();
    // await GameManager.handlePlayerAction(game.id, player2.id, "check");
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // await GameManager.handlePlayerAction(game.id, player1.id, "check");
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // await GameManager.syncGameState(game.id);
    // await new Promise((resolve) => setTimeout(resolve, 1000)); // 等待1秒
    // console.log("📌 进入 Flop 后状态:", gameInstance.getGameState());

    // // 6️⃣ 结束游戏
    // console.log("\n🏁 结束游戏...");
    // await GameManager.endGame(game.id);
    // console.log("✅ 游戏已结束");

    // // 7️⃣ 检查数据库是否更新
    // const dbGame = await prisma.game.findUnique({ where: { id: game.id } });
    // console.log("\n🔍 数据库中的游戏状态:", dbGame);

    // console.log("\n✅ 所有测试完成！");
  } catch (error) {
    console.error("❌ 发生错误:", error);
  } finally {
    console.log("🛑 关闭 Prisma 连接...");
    await prisma.$disconnect();
    await GameManager.disconnect(); // 关闭 GameManager 的 Prisma 连接
    process.exit(0);
  }
}

// 运行测试
testGameManager();

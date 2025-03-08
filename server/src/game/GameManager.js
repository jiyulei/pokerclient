// server/src/game/GameManager.js
import Game from "./Game";

class GameManager {
  constructor() {
    this.games = new Map(); // tableId -> Game instance
  }

  // 创建新游戏或获取现有游戏
  getOrCreateGame(tableId, options = {}) {
    if (!this.games.has(tableId)) {
      console.log(`创建新游戏，桌号: ${tableId}`);
      const game = new Game(options);
      this.games.set(tableId, game);
    }
    return this.games.get(tableId);
  }

  // 获取现有游戏
  getGame(tableId) {
    return this.games.get(tableId);
  }

  // 删除游戏
  removeGame(tableId) {
    if (this.games.has(tableId)) {
      const game = this.games.get(tableId);
      game.endGame(); // 确保游戏正确结束
      this.games.delete(tableId);
      return true;
    }
    return false;
  }

  // 获取所有活跃游戏的tableId
  getActiveTableIds() {
    return Array.from(this.games.keys());
  }
}

// 创建单例实例
const gameManager = new GameManager();
export default gameManager;

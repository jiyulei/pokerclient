"use client";

import { useState } from "react";
import { use } from "react";

interface TablePageProps {
  params: Promise<{ tableId: string }>;
}

// 随机名字生成函数
const generateRandomName = () => {
   const adjectives = [
     "Happy",
     "Brave",
     "Smart",
     "Lucky",
     "Mysterious",
     "Calm",
     "Energetic",
     "Friendly",
     "Cautious",
     "Witty",
   ];

   const nouns = [
     "Tiger",
     "Fox",
     "Eagle",
     "Wolf",
     "Panda",
     "Dolphin",
     "Hawk",
     "Lion",
     "Otter",
     "Rabbit",
   ];


  const randomAdjective =
    adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];

  return `${randomAdjective}${randomNoun}`;
};

// 生成随机ID
const generateRandomId = () => {
  return `guest_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
};

export default function TablePage(props: TablePageProps) {
  // 使用 React.use() 解包 params Promise
  const { tableId } = use(props.params);

  const [isJoining, setIsJoining] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState("");

  // 处理加入桌子的逻辑
  const handleJoinTable = () => {
    setIsJoining(true);

    // 生成随机名字和ID（如果用户未登录）
    // 在实际应用中，这里应该检查用户是否已登录，如果已登录则使用其真实名字和ID
    const randomName = generateRandomName();
    const randomId = generateRandomId();

    setPlayerName(randomName);
    setPlayerId(randomId);

    console.log(`玩家 ${randomName} (ID: ${randomId}) 加入了桌子 ${tableId}`);

    // 这里应该调用游戏引擎的 addPlayer 方法
    // 例如: gameEngine.addPlayer(randomName, randomId);

    // 模拟API调用
    setTimeout(() => {
      console.log("玩家成功加入游戏");
      console.log(playerName, playerId);
      setIsJoining(false);
    }, 1000);
  };

  // 处理旁观的逻辑
  const handleSpectate = () => {
    setIsSpectating(true);

    // 生成随机名字和ID（如果用户未登录）
    const randomName = generateRandomName();
    const randomId = generateRandomId();

    console.log(`玩家 ${randomName} (ID: ${randomId}) 正在旁观桌子 ${tableId}`);

    // 这里应该调用游戏引擎的 addSpectator 方法
    // 例如: gameEngine.addSpectator(randomName);

    // 模拟API调用
    setTimeout(() => {
      console.log("玩家成功加入旁观");
      setIsSpectating(false);
    }, 1000);
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      <h1 className="text-4xl font-bold mb-8">扑克桌 #{tableId}</h1>
      <div className="w-full max-w-[900px] aspect-[8/5] bg-cyan-800 rounded-[50%] border-8 border-gray-500 flex items-center justify-center mb-8 relative">
        {playerName ? (
          <p className="text-2xl text-center px-4">
            欢迎，{playerName}！您已加入桌子 #{tableId}
          </p>
        ) : (
          <p className="text-2xl text-center px-4">
            这是扑克桌 #{tableId} 的简单页面
          </p>
        )}
      </div>
      <div className="flex gap-4 mt-6">
        <button
          className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700"
          onClick={handleJoinTable}
          disabled={isJoining || isSpectating || !!playerName}
        >
          {isJoining ? "加入中..." : playerName ? "已加入" : "Join Table"}
        </button>
        <button
          className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700"
          onClick={handleSpectate}
          disabled={isJoining || isSpectating || !!playerName}
        >
          {isSpectating ? "加入中..." : "Spectate"}
        </button>
      </div>
    </div>
  );
}

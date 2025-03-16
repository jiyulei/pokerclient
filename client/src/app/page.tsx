"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, gql } from "@apollo/client";

// 创建游戏的 GraphQL mutation
const CREATE_GAME_MUTATION = gql`
  mutation CreateGame(
    $initialChips: Int
    $smallBlind: Int
    $bigBlind: Int
    $timeLimit: Int
  ) {
    createGame(
      initialChips: $initialChips
      smallBlind: $smallBlind
      bigBlind: $bigBlind
      timeLimit: $timeLimit
    ) {
      id
      initialChips
      smallBlind
      bigBlind
      timeLimit
    }
  }
`;

export default function HomePage() {
  const router = useRouter();
  const [gameSettings, setGameSettings] = useState({
    initialChips: 1000,
    smallBlind: 5,
    timeLimit: 30,
  });

  const [showSettings, setShowSettings] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 使用 Apollo Client 的 useMutation hook
  const [createGame, { loading, error }] = useMutation(CREATE_GAME_MUTATION, {
    onCompleted: (data) => {
      // 创建成功后，跳转到游戏页面
      const gameId = data.createGame.id;
      console.log("游戏创建成功，ID:", gameId);
      router.push(`/game/${gameId}`);
    },
    onError: (error) => {
      console.error("创建游戏失败:", error);
      setIsCreating(false);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setGameSettings({
      ...gameSettings,
      [name]: parseInt(value, 10),
    });
  };

  const handleCreateGame = () => {
    setIsCreating(true);
    // 调用创建游戏的 mutation
    createGame({
      variables: {
        initialChips: gameSettings.initialChips,
        smallBlind: gameSettings.smallBlind,
        bigBlind: gameSettings.smallBlind * 2,
        timeLimit: gameSettings.timeLimit,
      },
    });
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-16 py-8 bg-[#25262b] rounded-xl text-white text-4xl font-bold
          hover:bg-[#2c2d31] hover:scale-105 hover:shadow-2xl
          transition-all duration-300 ease-in-out
          font-['Montserrat']
          tracking-wider
          animate-pulse"
          aria-label="start game"
        >
          Get Started
        </button>

        {showSettings && (
          <div className="mt-8 p-6 bg-[#25262b] rounded-xl text-white w-80 transition-all duration-300 ease-in-out">
            <h3 className="text-xl font-bold mb-4 text-center">游戏设置</h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">初始筹码</label>
              <input
                type="range"
                name="initialChips"
                min="500"
                max="5000"
                step="100"
                value={gameSettings.initialChips}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span>500</span>
                <span className="font-bold">{gameSettings.initialChips}</span>
                <span>5000</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">小盲注</label>
              <input
                type="range"
                name="smallBlind"
                min="1"
                max="50"
                step="1"
                value={gameSettings.smallBlind}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span>1</span>
                <span className="font-bold">{gameSettings.smallBlind}</span>
                <span>50</span>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                时间限制 (秒)
              </label>
              <input
                type="range"
                name="timeLimit"
                min="10"
                max="60"
                step="5"
                value={gameSettings.timeLimit}
                onChange={handleChange}
                className="w-full"
              />
              <div className="flex justify-between text-sm">
                <span>10s</span>
                <span className="font-bold">{gameSettings.timeLimit}s</span>
                <span>60s</span>
              </div>
            </div>

            {error && (
              <div className="mt-2 text-red-500 text-sm">
                创建游戏失败: {error.message}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleCreateGame}
                disabled={loading || isCreating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-bold
                transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading || isCreating ? "创建中..." : "创建游戏"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

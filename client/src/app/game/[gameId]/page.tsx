"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, gql } from "@apollo/client";

// 定义Player接口
interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
}

// 获取游戏状态的 GraphQL 查询
const GET_GAME_QUERY = gql`
  query GetGame($id: ID!) {
    game(id: $id) {
      id
      status
      initialChips
      smallBlind
      bigBlind
      timeLimit
      players {
        id
        name
        chips
        position
      }
    }
  }
`;

// 加入游戏的 GraphQL mutation
const JOIN_GAME_MUTATION = gql`
  mutation JoinGame($gameId: ID!, $name: String) {
    joinGame(gameId: $gameId, name: $name) {
      id
      name
      chips
      position
    }
  }
`;

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

export default function GamePage() {
  // 使用 useParams 获取动态路由参数
  const params = useParams();
  const gameId = params.gameId as string;

  const [isJoining, setIsJoining] = useState(false);
  const [isSpectating, setIsSpectating] = useState(false);
  const [playerName, setPlayerName] = useState("");
  const [showInfo, setShowInfo] = useState(false); // 控制信息面板显示/隐藏

  // 查询游戏状态
  const {
    loading: gameLoading,
    error: gameError,
    data: gameData,
  } = useQuery(GET_GAME_QUERY, {
    variables: { id: gameId },
    pollInterval: 0, // 不轮询，我们将使用订阅来获取实时更新
  });

  // 加入游戏的 mutation
  const [joinGame, { loading: joinLoading, error: joinError }] = useMutation(
    JOIN_GAME_MUTATION,
    {
      onCompleted: (data) => {
        const player = data.joinGame;
        setPlayerName(player.name);
        console.log(
          `Player ${player.name} (ID: ${player.id}) successfully joined the game`
        );
      },
      onError: (error) => {
        console.error("Failed to join game:", error);
        setIsJoining(false);
      },
    }
  );

  // 处理加入游戏的逻辑
  const handleJoinTable = () => {
    setIsJoining(true);
    const randomName = generateRandomName();

    // 调用加入游戏的 mutation
    joinGame({
      variables: {
        gameId: gameId,
        name: randomName,
      },
    });
  };

  // 处理旁观的逻辑
  const handleSpectate = () => {
    setIsSpectating(true);
    const randomName = generateRandomName();

    console.log(`Player ${randomName} is spectating game ${gameId}`);

    // 这里应该调用游戏引擎的 addSpectator 方法
    // 目前先模拟
    setTimeout(() => {
      console.log("Player successfully joined as spectator");
      setIsSpectating(false);
    }, 1000);
  };

  // 切换信息面板显示/隐藏
  const toggleInfo = () => {
    setShowInfo(!showInfo);
  };

  if (gameLoading)
    return (
      <div className="h-screen w-full flex items-center justify-center text-white">
        Loading game...
      </div>
    );
  if (gameError)
    return (
      <div className="h-screen w-full flex items-center justify-center text-white">
        Failed to load game: {gameError.message}
      </div>
    );

  const game = gameData?.game;

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-gray-900 text-white px-4 relative">
      <h1 className="text-4xl font-bold mb-2">Texas Hold&apos;em</h1>
      <p className="text-gray-400 mb-8">Game ID: {gameId}</p>

      {/* 信息图标按钮 */}
      <button
        className="absolute top-8 right-8 w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center hover:bg-gray-600 transition-colors"
        onClick={toggleInfo}
        aria-label="Show game information"
      >
        <span className="text-xl font-semibold">i</span>
      </button>

      {/* 游戏信息面板 - 条件渲染 */}
      {showInfo && game && (
        <div className="absolute top-20 right-8 bg-gray-800 p-4 rounded-md shadow-lg z-10 w-64 border border-gray-700 transition-all">
          <h3 className="text-lg font-semibold mb-2 border-b border-gray-700 pb-2">
            Game Information
          </h3>
          <div className="space-y-1">
            <p>Initial Chips: {game.initialChips}</p>
            <p>
              Small/Big Blind: {game.smallBlind}/{game.bigBlind}
            </p>
            <p>Time Limit: {game.timeLimit}s</p>
            <p>Status: {game.status}</p>
            <p>Players: {game.players.length}</p>
          </div>
        </div>
      )}

      <div className="w-full max-w-[900px] aspect-[8/5] bg-cyan-800 rounded-[50%] border-8 border-gray-500 flex items-center justify-center mb-8 relative">
        {playerName ? (
          <p className="text-2xl text-center px-4">
            Welcome, {playerName}! You&apos;ve joined the game
          </p>
        ) : (
          <p className="text-2xl text-center px-4">
            Welcome to Texas Hold&apos;em
          </p>
        )}

        {/* 显示玩家位置 */}
        {game &&
          game.players.map((player: Player, index: number) => (
            <div
              key={player.id}
              className="absolute bg-gray-800 p-2 rounded-full border-2 border-white"
              style={{
                top: `${
                  50 -
                  40 *
                    Math.cos(
                      (2 * Math.PI * index) / Math.max(game.players.length, 2)
                    )
                }%`,
                left: `${
                  50 +
                  40 *
                    Math.sin(
                      (2 * Math.PI * index) / Math.max(game.players.length, 2)
                    )
                }%`,
                transform: "translate(-50%, -50%)",
              }}
            >
              <p className="text-sm">{player.name}</p>
              <p className="text-xs">{player.chips} chips</p>
            </div>
          ))}
      </div>

      {joinError && (
        <div className="text-red-500 mb-4">
          Failed to join game: {joinError.message}
        </div>
      )}

      <div className="flex gap-4 mt-6">
        <button
          className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleJoinTable}
          disabled={isJoining || isSpectating || !!playerName || joinLoading}
        >
          {isJoining || joinLoading
            ? "Joining..."
            : playerName
            ? "Joined"
            : "Join Game"}
        </button>
        <button
          className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handleSpectate}
          disabled={isJoining || isSpectating || !!playerName}
        >
          {isSpectating ? "Joining..." : "Spectate"}
        </button>
      </div>
    </div>
  );
}

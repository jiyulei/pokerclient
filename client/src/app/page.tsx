"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, gql } from "@apollo/client";
import Link from "next/link";
interface Player {
  id: string;
  name: string;
  chips: number;
  position: number;
}

// 定义消息接口
interface GameMessage {
  id: string;
  content: string;
  timestamp: number;
  type: string;
  playerId: string;
}
interface Game {
  id: string;
  status: string;
  round: number;
  currentRound?: string;
  pot: number;
  communityCards: string[];
  currentPlayerPos?: number;
  dealerPos?: number;
  smallBlindPos?: number;
  bigBlindPos?: number;
  currentRoundMaxBet?: number;
  mainPot?: number;
  sidePots?: number[];
  initialChips: number;
  smallBlind: number;
  bigBlind: number;
  timeLimit: number;
  maxPlayers: number;
  players: Player[];
  availableActions?: string[];
  isYourTurn?: boolean;
  messages?: GameMessage[];
  createdAt?: string;
  updatedAt?: string;
}





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

// 获取游戏列表的 GraphQL 查询
const GET_GAMES_QUERY = gql`
  query GetGames {
    games {
      id
      status
      initialChips
      smallBlind
      bigBlind
      timeLimit
      players {
        id
      }
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
  const [showGameList, setShowGameList] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // 获取游戏列表
  const {
    data: gamesData,
    loading: gamesLoading,
    error: gamesError,
  } = useQuery(GET_GAMES_QUERY, {
    skip: !showGameList, // 只有当显示游戏列表时才执行查询
    fetchPolicy: "network-only", // 确保每次都从服务器获取最新数据
  });

  // 使用 Apollo Client 的 useMutation hook
  const [createGame, { loading, error }] = useMutation(CREATE_GAME_MUTATION, {
    onCompleted: (data) => {
      // 创建成功后，跳转到游戏页面
      const gameId = data.createGame.id;
      console.log("Game created successfully, ID:", gameId);
      router.push(`/game/${gameId}`);
    },
    onError: (error) => {
      console.error("Failed to create game:", error);
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

  const handleJoinGameClick = () => {
    setShowGameList(!showGameList);
    setShowSettings(false); // 关闭设置面板
  };

  const handleGetStartedClick = () => {
    setShowSettings(!showSettings);
    setShowGameList(false); // 关闭游戏列表
  };

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center">
      <div className="flex flex-col items-center">
        <button
          onClick={handleGetStartedClick}
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

        {/* 加入游戏按钮 */}
        <button
          onClick={handleJoinGameClick}
          className="mt-4 px-16 py-8 bg-[#25262b] rounded-xl text-white text-4xl font-bold
          hover:bg-[#2c2d31] hover:scale-105 hover:shadow-2xl
          transition-all duration-300 ease-in-out
          font-['Montserrat']
          tracking-wider"
          aria-label="join game"
        >
          Join Game
        </button>

        {showSettings && (
          <div className="mt-8 p-6 bg-[#25262b] rounded-xl text-white w-80 transition-all duration-300 ease-in-out">
            <h3 className="text-xl font-bold mb-4 text-center">
              Game Settings
            </h3>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">
                Initial Chips
              </label>
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
              <label className="block text-sm font-medium mb-1">
                Small Blind
              </label>
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
                Time Limit (sec)
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
                Failed to create game: {error.message}
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={handleCreateGame}
                disabled={loading || isCreating}
                className="w-full py-2 bg-blue-600 hover:bg-blue-700 rounded-md font-bold
                transition-colors duration-200 disabled:bg-blue-400 disabled:cursor-not-allowed"
              >
                {loading || isCreating ? "Creating..." : "Create Game"}
              </button>
            </div>
          </div>
        )}

        {/* 游戏列表 */}
        {showGameList && (
          <div className="mt-8 p-6 bg-[#25262b] rounded-xl text-white w-96 transition-all duration-300 ease-in-out">
            <h3 className="text-xl font-bold mb-4 text-center">
              Available Games
            </h3>

            {gamesLoading ? (
              <div className="text-center py-4">Loading games...</div>
            ) : gamesError ? (
              <div className="text-center py-4 text-red-400">
                Failed to load games: {gamesError.message}
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto">
                {gamesData?.games && gamesData.games.length > 0 ? (
                  <ul className="space-y-3">
                    {gamesData.games.slice(0, 10).map((game: Game) => (
                      <li key={game.id} className="bg-gray-800 p-3 rounded-md">
                        <div className="flex justify-between items-center">
                          <div>
                            <p className="font-medium">
                              Game #{game.id.substring(0, 8)}...
                            </p>
                            <p className="text-xs text-gray-400">
                              Status: {game.status} | Players:{" "}
                              {game.players.length} | SB/BB: {game.smallBlind}/
                              {game.bigBlind}
                            </p>
                          </div>
                          <Link
                            href={`/game/${game.id}`}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition-colors"
                          >
                            Join
                          </Link>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="text-center py-4 text-gray-400">
                    No games available. Please create a new game.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

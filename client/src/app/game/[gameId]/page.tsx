"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useMutation, useQuery, useSubscription, gql } from "@apollo/client";

// 定义Player接口
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

// 定义游戏接口
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

// 游戏状态订阅
const GAME_STATE_SUBSCRIPTION = gql`
  subscription GameStateChanged($gameId: ID!, $playerId: ID) {
    gameStateChanged(gameId: $gameId, playerId: $playerId) {
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
      availableActions
      isYourTurn
      messages {
        id
        content
        timestamp
        type
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

// 开始游戏的 GraphQL mutation
const START_GAME_MUTATION = gql`
  mutation StartGame($gameId: ID!) {
    startGame(gameId: $gameId) {
      id
      status
      players {
        id
        name
        chips
      }
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
  const [playerId, setPlayerId] = useState("");
  const [showInfo, setShowInfo] = useState(false); // 控制信息面板显示/隐藏
  const [gameState, setGameState] = useState<Game | null>(null);
  const [messages, setMessages] = useState<GameMessage[]>([]);

  // 在组件加载时检查URL和localStorage中是否有玩家ID
  useEffect(() => {
    // 从URL中获取玩家ID
    const url = new URL(window.location.href);
    const playerIdFromUrl = url.searchParams.get("playerId");

    // 从localStorage中获取玩家ID和游戏ID
    const storedPlayerId = localStorage.getItem(`poker_player_id_${gameId}`);
    const storedPlayerName = localStorage.getItem(
      `poker_player_name_${gameId}`
    );

    // 如果URL中有玩家ID，使用它
    if (playerIdFromUrl) {
      setPlayerId(playerIdFromUrl);
      // 尝试从localStorage获取对应的名字
      if (storedPlayerName && storedPlayerId === playerIdFromUrl) {
        // 移除未使用的playerName状态变量
      }
    }
    // 否则，如果localStorage中有玩家ID，使用它并更新URL
    else if (storedPlayerId && storedPlayerName) {
      setPlayerId(storedPlayerId);

      // 更新URL，添加玩家ID参数
      const newUrl = `${window.location.pathname}?playerId=${storedPlayerId}`;
      window.history.replaceState({}, "", newUrl);
    }
  }, [gameId]);

  // 初始查询游戏状态 - 只在组件挂载时执行一次
  const {
    loading: gameLoading,
    error: gameError,
    data: gameData,
    refetch,
  } = useQuery(GET_GAME_QUERY, {
    variables: { id: gameId },
    pollInterval: 0, // 不再使用轮询，改用订阅
  });

  // 订阅游戏状态变化
  useSubscription(GAME_STATE_SUBSCRIPTION, {
    variables: { gameId, playerId },
    onData: ({ data }) => {
      console.log("订阅收到数据:", data?.data?.gameStateChanged);
      if (data?.data?.gameStateChanged) {
        const newGameState = data.data.gameStateChanged;
        setGameState(newGameState);

        // 更新消息
        if (newGameState.messages) {
          setMessages(newGameState.messages);
        }

        // 如果当前玩家在游戏中，确保 joining 状态为 false
        if (newGameState.players?.some((p: Player) => p.id === playerId)) {
          setIsJoining(false);
        }
      }
    },
    onError: (error) => {
      console.error("订阅错误:", error);
    },
  });

  // 加入游戏的 mutation
  const [joinGame] = useMutation(JOIN_GAME_MUTATION, {
    onCompleted: (data) => {
      console.log("加入游戏成功:", data);
      const playerId = data.joinGame.id;
      // 修正 localStorage key 的名称
      localStorage.setItem(`poker_player_id_${gameId}`, playerId);
      localStorage.setItem(`poker_player_name_${gameId}`, data.joinGame.name);

      // 更新组件状态
      setPlayerId(playerId);

      // 不要在这里设置 isJoining 为 false
      // 让订阅更新来处理这个状态变化

      // 更新 URL 参数
      const searchParams = new URLSearchParams(window.location.search);
      searchParams.set("playerId", playerId);
      const newUrl = `${window.location.pathname}?${searchParams.toString()}`;
      window.history.pushState({}, "", newUrl);

      // 手动触发一次查询刷新
      refetch();
    },
    onError: (error) => {
      setIsJoining(false);
      console.error("加入游戏失败:", error);
    },
  });

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

  // 使用订阅数据或初始查询数据
  const game = gameState || gameData?.game;
  console.log("game", game);
  console.log("gameState", gameState);

  // 检查当前玩家是否在游戏中
  const isCurrentPlayerInGame = () => {
    if (!playerId || !game || !game.players) return false;
    return game.players.some((player: Player) => player.id === playerId);
  };

  // 获取当前玩家
  const getCurrentPlayer = () => {
    if (!playerId || !game || !game.players) return null;
    return game.players.find((player: Player) => player.id === playerId);
  };

  useEffect(() => {
    if (gameState?.players?.some((p) => p.id === playerId)) {
      setIsJoining(false);
    }
  }, [gameState, playerId]);

  // 在组件中添加 mutation hook
  const [startGame, { loading: startGameLoading }] = useMutation(
    START_GAME_MUTATION,
    {
      onCompleted: (data) => {
        console.log("Game started successfully:", data);
      },
      onError: (error) => {
        console.error("Failed to start game:", error);
      },
    }
  );

  // 处理开始游戏的函数
  const handleStartGame = () => {
    startGame({
      variables: {
        gameId: gameId,
      },
    });
  };

  if (gameLoading && !game)
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

  const currentPlayer = getCurrentPlayer();

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-gray-900 text-white px-4 relative">
      <h1 className="text-4xl font-bold mb-2">Texas Hold&apos;em</h1>
      <p className="text-gray-400 mb-8">Game ID: {gameId}</p>

      {/* 玩家信息显示和消息区域 - 放在左侧 */}
      <div className="absolute top-8 left-8 flex flex-col gap-3">
        {/* 玩家信息面板 */}
        {currentPlayer && (
          <div className="bg-gray-800 p-3 rounded-md w-64">
            <p className="font-semibold">You: {currentPlayer.name}</p>
            <p className="font-semibold">Chips: {currentPlayer.chips}</p>
            {game && game.isYourTurn && (
              <p className="text-sm text-yellow-400 font-bold mt-1">
                Your turn!
              </p>
            )}
          </div>
        )}

        {/* 游戏消息区域 - 放在玩家信息下方 */}
        {messages.length > 0 && (
          <div className="bg-gray-800 rounded-md p-3 w-64 max-h-48 overflow-y-auto">
            <h3 className="text-sm font-semibold mb-1">Game Messages:</h3>
            <ul className="text-xs space-y-1">
              {messages.slice(-5).map((msg) => (
                <li key={msg.id} className="text-gray-300">
                  {msg.content}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

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
        {
          <p className="text-2xl text-center px-4">
            Welcome to Texas Hold&apos;em
          </p>
        }

        {/* 显示玩家位置 */}
        {game &&
          game.players.map((player: Player, index: number) => (
            <div
              key={player.id}
              className={`absolute bg-gray-800 p-2 rounded-full border-2 ${
                player.id === playerId ? "border-yellow-400" : "border-white"
              }`}
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
              <p className="text-sm">
                {player.id === playerId ? `${player.name} (You)` : player.name}
              </p>
              <p className="text-xs">{player.chips} chips</p>
            </div>
          ))}
      </div>

      {/* 可用操作按钮 */}
      {game && game.availableActions && game.availableActions.length > 0 && (
        <div className="w-full max-w-[900px] bg-gray-800 rounded-md p-3 mb-4">
          <h3 className="text-sm font-semibold mb-2">Available Actions:</h3>
          <div className="flex flex-wrap gap-2">
            {game.availableActions.map((action: string) => (
              <button
                key={action}
                className="px-3 py-1 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
              >
                {action.charAt(0).toUpperCase() + action.slice(1)}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 只有当玩家未加入游戏时才显示加入按钮 */}
      {!isCurrentPlayerInGame() && (
        <div className="flex gap-4 mt-6">
          <button
            className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleJoinTable}
            disabled={isJoining || isSpectating}
          >
            {isJoining ? "Joining..." : "Join Game"}
          </button>
          <button
            className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleSpectate}
            disabled={isJoining || isSpectating}
          >
            {isSpectating ? "Joining..." : "Spectate"}
          </button>
        </div>
      )}

      {/* 当玩家已加入游戏时，可以显示游戏相关操作按钮 */}
      {isCurrentPlayerInGame() && game && game.status === "WAITING" && (
        <div className="mt-6">
          <button
            className="text-white px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleStartGame}
            disabled={game.players.length < 2 || startGameLoading}
          >
            {startGameLoading ? "Starting..." : "Start Game"}
          </button>
        </div>
      )}
    </div>
  );
}

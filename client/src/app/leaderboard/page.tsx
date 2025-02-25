export default function LeaderboardPage() {
  return (
    <div className="flex flex-col items-center justify-center p-4">
      <h1 className="text-4xl font-bold text-white">Leaderboard</h1>
      <div> 
      <table className="mt-8 w-full max-w-4xl bg-gray-800 rounded-lg overflow-hidden">
        <thead className="bg-gray-700">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">排名</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">玩家</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">胜率</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">总收益</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-600">
          <tr className="hover:bg-gray-700">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">1</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">玩家一</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">68%</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">+12,450</td>
          </tr>
          <tr className="hover:bg-gray-700">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">2</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">玩家二</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">55%</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">+8,320</td>
          </tr>
          <tr className="hover:bg-gray-700">
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">3</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">玩家三</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">42%</td>
            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">-3,150</td>
          </tr>
        </tbody>
      </table>
      </div>
    </div>
  );
}

interface TablePageProps {
  params: Promise<{ tableId: string }>;
}

export default async function TablePage(props: TablePageProps) {
  const { tableId } = await props.params;

  return (
    <div className="h-[calc(100vh-4rem)] w-full flex flex-col items-center justify-center bg-gray-900 text-white px-4">
      <h1 className="text-4xl font-bold mb-8">扑克桌 #{tableId}</h1>
      <div className="w-full max-w-[900px] aspect-[8/5] bg-cyan-800 rounded-[50%] border-8 border-gray-500 flex items-center justify-center mb-8 relative">
        <p className="text-2xl text-center px-4">
          这是扑克桌 #{tableId} 的简单页面
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <button className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700">
          Join Table
        </button>
        <button className="text-white px-4 py-2 rounded-md border-2 border-gray-700 hover:bg-gray-700">
          Spectate
        </button>
      </div>
    </div>
  );
}

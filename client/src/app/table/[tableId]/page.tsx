interface TablePageProps {
  params: {
    tableId: string;
  };
}

export default function TablePage({ params }: TablePageProps) {
  const { tableId } = params;

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-900 text-white">
      <div className="w-[800px] h-[500px] bg-green-800 rounded-[50%] border-8 border-green-900 flex items-center justify-center">
        <p className="text-2xl">这是扑克桌 #{tableId} 的简单页面</p>
      </div>
      
    </div>
  );
}

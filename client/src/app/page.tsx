"use client";

import { gql, useQuery } from "@apollo/client";

const GET_BOOKS = gql`
  query GetBooks {
    books {
      title
      author
    }
  }
`;

export default function Home() {
  const { loading, error, data } = useQuery(GET_BOOKS);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误： {error.message}</div>;

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">图书列表</h1>
      <div className="space-y-4">
        {data.books.map(
          (book: { title: string; author: string }, index: number) => (
            <div key={index} className="border p-4 rounded-lg">
              <h2 className="font-semibold">{book.title}</h2>
              <p className="text-gray-600">作者：{book.author}</p>
            </div>
          )
        )}
      </div>
    </div>
  );
}

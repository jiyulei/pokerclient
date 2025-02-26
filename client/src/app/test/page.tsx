"use client";
// client side rendering    
import { useQuery } from "@apollo/client";
import gql from "graphql-tag";

const GET_BOOKS = gql`
  query GetBooks {
    books {
      title
      author
    }
  }
`;

export default function TestPage() {
  const { data, loading, error } = useQuery(GET_BOOKS);

  if (loading) return <p>Loading...</p>;
  if (error) return <p>Error: {error.message}</p>;

  return (
    <div className="flex flex-col items-center justify-center h-screen">
      <h1 className="text-4xl font-bold">Test Page</h1>
      <div className="flex flex-col items-center justify-center text-white">
        {data.books.map((book: { title: string; author: string }) => (
          <div key={book.title}>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

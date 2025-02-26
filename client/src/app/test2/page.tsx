// server side rendering  
export default async function Text2Page() {
  const res = await fetch(
    "https://pokerclient-production.up.railway.app/graphql",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query GetBooks {
                books {
                    title
                    author
                }
            }`,
      }),
    }
  );

  const data = await res.json();

  return (
    <div className="flex flex-col items-center justify-center text-white">
      {data?.data?.books && data.data.books.map((book: { title: string; author: string }) => (
        <div key={book.title}>
          <h2>{book.title}</h2>
          <p>{book.author}</p>
        </div>
      ))}
    </div>
  );
}


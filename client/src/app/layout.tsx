"use client";

import "./globals.css";
import { ApolloProvider } from "@apollo/client";
import client from "@/lib/apollo-client";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body>
        <ApolloProvider client={client}>{children}</ApolloProvider>
      </body>
    </html>
  );
}

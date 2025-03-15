"use client";

import "./globals.css";
import { ApolloProvider } from "@apollo/client";
import client from "@/lib/apollo-client";
import Navbar from "@/components/Navbar";
import { Montserrat } from "next/font/google";

const montserrat = Montserrat({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh">
      <body
        className={`${montserrat.className} min-h-screen bg-gradient-to-br from-black via-gray-900 to-gray-800 flex flex-col`}
      >
        <ApolloProvider client={client}>
          <Navbar />
          <main>{children}</main>
        </ApolloProvider>
      </body>
    </html>
  );
}

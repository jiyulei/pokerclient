"use client";

import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-gray-800 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Jerry&apos;s Poker Room
            </Link>
            <div className="hidden md:block ml-10">
              <div className="flex items-baseline space-x-4">
                <Link
                  href="/"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-700"
                >
                  Home
                </Link>
                <Link
                  href="/books"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-700"
                >
                  Mystats
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

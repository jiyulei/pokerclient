"use client";

import Link from "next/link";
import { useState } from "react"; // 临时使用，之后会替换为真实的认证状态
import Image from "next/image";

export default function Navbar() {
  // 临时状态，之后会替换为真实的认证状态
  const [isLoggedIn] = useState(false);
  const [user] = useState({
    name: "测试用户",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Felix", // 使用默认头像
  });

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
                  href="/leaderboard"
                  className="px-3 py-2 rounded-md text-sm hover:bg-gray-700"
                >
                  Leaderboard
                </Link>
                {isLoggedIn && (
                  <Link
                    href="/mystats"
                    className="px-3 py-2 rounded-md text-sm hover:bg-gray-700"
                  >
                    Mystats
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* 新增的用户信息部分 */}
          <div className="flex items-center">
            {isLoggedIn ? (
              <div className="flex items-center space-x-3">
                <Image
                  src={user.avatar}
                  alt="用户头像"
                  className="w-8 h-8 rounded-full"
                />
                <span className="text-sm font-medium">{user.name}</span>
              </div>
            ) : (
              <button className="px-4 py-2 text-sm font-medium text-white bg-gray-700 rounded-md hover:bg-gray-600 transition-colors">
                登录
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

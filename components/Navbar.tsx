"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CurrentUser = {
  loggedIn: boolean;
  name?: string;
  provider?: string;
};

export default function Navbar() {
  const [user, setUser] = useState<CurrentUser>({ loggedIn: false });

  useEffect(() => {
    async function getUser() {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = (await res.json()) as CurrentUser;
      setUser(data);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST" });
    location.href = "/";
  }

  return (
    <nav className="flex w-full items-center justify-between border-b border-orange-100 bg-white px-6 py-4 shadow-sm">
      <Link href="/" className="text-2xl font-bold text-orange-600">
        字书 Zishoo
      </Link>

      <div className="flex items-center gap-6">
        <Link href="/courses" className="hover:text-orange-600">
          课程
        </Link>

        <Link href="/my-courses" className="hover:text-orange-600">
          我的课程
        </Link>

        {user.loggedIn ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {user.name || (user.provider === "wechat" ? "微信用户" : "已登录")}
            </span>

            <button
              onClick={handleLogout}
              className="rounded-xl bg-orange-500 px-4 py-2 text-white"
            >
              退出登录
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="rounded-xl bg-orange-500 px-4 py-2 text-white"
          >
            登录
          </Link>
        )}
      </div>
    </nav>
  );
}


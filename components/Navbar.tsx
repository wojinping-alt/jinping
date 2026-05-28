"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email ?? null);
    }

    getUser();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();

    location.reload();
  }

  return (
    <nav className="w-full bg-white border-b border-orange-100 shadow-sm px-6 py-4 flex items-center justify-between">
      <Link
        href="/"
        className="text-2xl font-bold text-orange-600"
      >
        字书 Zishoo
      </Link>

      <div className="flex items-center gap-6">
        <Link
          href="/courses"
          className="hover:text-orange-600"
        >
          课程
        </Link>

        <Link
          href="/my-courses"
          className="hover:text-orange-600"
        >
          我的课程
        </Link>

        {email ? (
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              {email}
            </span>

            <button
              onClick={handleLogout}
              className="bg-orange-500 text-white px-4 py-2 rounded-xl"
            >
              退出登录
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="bg-orange-500 text-white px-4 py-2 rounded-xl"
          >
            登录
          </Link>
        )}
      </div>
    </nav>
  );
}
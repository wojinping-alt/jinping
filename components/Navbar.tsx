"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

type CurrentUser = {
  loggedIn: boolean;
  name?: string;
  provider?: string;
};

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const item = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

function getLocalUserHint(): CurrentUser {
  const cookieUser = getCookie("zishoo_user_id_client");
  const cookieName = getCookie("zishoo_user_name");
  const localLoggedIn =
    typeof window !== "undefined" &&
    window.localStorage.getItem("zishoo_logged_in") === "1";

  if (!cookieUser && !localLoggedIn) {
    return { loggedIn: false };
  }

  return {
    loggedIn: true,
    name: cookieName || "已登录",
    provider: "phone",
  };
}

export default function Navbar() {
  const [user, setUser] = useState<CurrentUser>({ loggedIn: false });

  useEffect(() => {
    let active = true;

    async function refreshUser() {
      const hint = getLocalUserHint();
      if (hint.loggedIn) setUser(hint);

      try {
        const res = await fetch("/api/auth/me", {
          cache: "no-store",
          credentials: "include",
        });
        const data = (await res.json()) as CurrentUser;

        if (active) setUser(data);
      } catch {
        if (active && !hint.loggedIn) setUser({ loggedIn: false });
      }
    }

    refreshUser();

    const onFocus = () => refreshUser();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshUser();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      active = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    localStorage.removeItem("zishoo_logged_in");
    localStorage.removeItem("zishoo_user_id");
    document.cookie =
      "zishoo_user_id_client=; path=/; max-age=0; SameSite=Lax; Secure";
    document.cookie =
      "zishoo_user_id_client=; path=/; max-age=0; domain=.zishoo.cn; SameSite=Lax; Secure";
    document.cookie =
      "zishoo_user_name=; path=/; max-age=0; SameSite=Lax; Secure";
    document.cookie =
      "zishoo_user_name=; path=/; max-age=0; domain=.zishoo.cn; SameSite=Lax; Secure";
    setUser({ loggedIn: false });
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
              {user.name || "已登录"}
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

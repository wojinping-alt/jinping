"use client";

import { useState } from "react";

export default function LoginAwarePurchaseButton({
  courseId,
}: {
  courseId: string;
}) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleClick() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/me", {
        cache: "no-store",
        credentials: "include",
      });
      const data = await res.json();

      if (data.loggedIn) {
        window.location.reload();
        return;
      }

      window.location.href = `/login?next=${encodeURIComponent(
        `/lesson/${courseId}`
      )}`;
    } catch {
      setMessage("无法确认登录状态，请刷新页面后重试");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="inline-flex rounded-md bg-red-500 px-5 py-3 font-medium text-white hover:bg-red-600 disabled:bg-red-300"
      >
        {loading ? "正在检查登录状态..." : "登录后购买课程"}
      </button>
      {message && <p className="mt-2 text-sm text-red-600">{message}</p>}
    </div>
  );
}

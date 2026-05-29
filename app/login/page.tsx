"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

// Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  // 发送魔法链接/验证码
  const sendCode = async () => {
    if (!email) {
      alert("请输入邮箱");
      return;
    }
    setLoading(true);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    setLoading(false);

    if (error) {
      alert(error.message);
      return;
    }

    setSent(true);
    alert("验证码已发送，请检查邮箱");
  };

  // 这里 OTP 已经由 Supabase 验证，所以前端只跳转即可
  const login = async () => {
    alert("请在邮箱点击验证链接完成登录");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-md w-[360px]">
        <h1 className="text-2xl font-bold mb-6 text-center">
          邮箱登录
        </h1>

        <input
          type="email"
          placeholder="请输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded mb-4"
        />

        {!sent ? (
          <button
            onClick={sendCode}
            disabled={loading}
            className="w-full bg-blue-500 text-white p-3 rounded hover:bg-blue-600"
          >
            {loading ? "发送中..." : "发送验证码"}
          </button>
        ) : (
          <button
            onClick={login}
            className="w-full bg-green-500 text-white p-3 rounded hover:bg-green-600"
          >
            登录
          </button>
        )}
      </div>
    </div>
  );
}
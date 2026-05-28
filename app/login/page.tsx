"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [email, setEmail] = useState("");

  async function handleLogin() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    if (error) {
      alert(error.message);
      return;
    }

    alert("登录邮件已发送！");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50">
      <div className="bg-white p-10 rounded-2xl shadow w-[400px]">
        <h1 className="text-3xl font-bold text-orange-600 mb-6">
          登录字书
        </h1>

        <input
          type="email"
          placeholder="输入邮箱"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border p-3 rounded-xl"
        />

        <button
          onClick={handleLogin}
          className="mt-6 w-full bg-orange-500 text-white py-3 rounded-xl"
        >
          邮箱登录
        </button>
      </div>
    </div>
  );
}
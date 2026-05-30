"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function LoginContent() {
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [testMode, setTestMode] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextUrl = searchParams.get("next") || "/courses";

  useEffect(() => {
    if (!expiresAt) return;

    const timer = setInterval(() => {
      const next = Math.max(
        0,
        Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(next);
      if (next <= 0) clearInterval(timer);
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt]);

  async function sendCode() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/sms-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "验证码发送失败");
        return;
      }

      setSent(true);
      setExpiresAt(data.expiresAt);
      setTestMode(Boolean(data.testMode));
      setMessage(
        data.testMode
          ? `测试模式：请输入验证码 123456。手机号 ${data.phone} 不会收到短信。`
          : `验证码已发送到 ${data.phone}`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function verifyCode() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/sms-code", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "登录失败");
        return;
      }

      setMessage("登录成功，正在返回...");
      router.push(nextUrl);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "登录失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-center text-2xl font-bold text-gray-900">
          手机验证码登录
        </h1>
        <p className="mt-3 text-center text-sm text-gray-500">
          输入手机号和验证码后即可登录购买课程。
        </p>
        <p className="mt-2 text-center text-xs text-orange-600">
          当前可用测试验证码：123456
        </p>

        <div className="mt-6">
          <input
            type="tel"
            inputMode="numeric"
            placeholder="请输入手机号"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-green-500"
          />
        </div>

        {sent && (
          <div className="mt-4">
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              placeholder="请输入 6 位验证码"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full rounded-lg border border-gray-200 p-3 outline-none focus:border-green-500"
            />
            <p className="mt-2 text-sm text-gray-500">
              {testMode ? "测试验证码：123456，" : ""}验证码剩余 {timeLeft} 秒
            </p>
          </div>
        )}

        {message && (
          <p className="mt-4 rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
            {message}
          </p>
        )}

        {!sent ? (
          <button
            onClick={sendCode}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-green-500 px-5 py-3 font-medium text-white hover:bg-green-600 disabled:bg-green-300"
          >
            {loading ? "发送中..." : "发送验证码"}
          </button>
        ) : (
          <div className="mt-6 space-y-3">
            <button
              onClick={verifyCode}
              disabled={loading}
              className="w-full rounded-lg bg-green-500 px-5 py-3 font-medium text-white hover:bg-green-600 disabled:bg-green-300"
            >
              {loading ? "登录中..." : "登录"}
            </button>
            <button
              onClick={sendCode}
              disabled={loading || timeLeft > 240}
              className="w-full rounded-lg border border-green-500 px-5 py-3 font-medium text-green-600 hover:bg-green-50 disabled:border-green-300 disabled:text-green-300"
            >
              重新发送验证码
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}


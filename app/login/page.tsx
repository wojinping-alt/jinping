"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type CodeState = {
  code: string;
  expiresAt: string;
};

export default function LoginPage() {
  const [codeState, setCodeState] = useState<CodeState | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!codeState) return;

    const countdown = setInterval(() => {
      const next = Math.max(
        0,
        Math.ceil((new Date(codeState.expiresAt).getTime() - Date.now()) / 1000)
      );
      setTimeLeft(next);
      if (next <= 0) clearInterval(countdown);
    }, 1000);

    return () => clearInterval(countdown);
  }, [codeState]);

  function startPolling(code: string) {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      const res = await fetch(`/api/auth/wechat-code?code=${code}`, {
        cache: "no-store",
      });
      const data = await res.json();

      if (data.error) {
        setMessage(data.error);
        return;
      }

      if (data.expired) {
        if (timerRef.current) clearInterval(timerRef.current);
        setMessage("验证码已过期，请重新生成。");
        return;
      }

      if (data.loggedIn) {
        if (timerRef.current) clearInterval(timerRef.current);
        setMessage("登录成功，正在进入课程页...");
        router.push("/courses");
        router.refresh();
      }
    }, 2000);
  }

  async function createCode() {
    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/wechat-code", {
        method: "POST",
        cache: "no-store",
      });
      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "验证码生成失败");
        return;
      }

      setCodeState(data);
      setTimeLeft(
        Math.max(
          0,
          Math.ceil((new Date(data.expiresAt).getTime() - Date.now()) / 1000)
        )
      );
      startPolling(data.code);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "验证码生成失败");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 text-center shadow-md">
        <h1 className="text-2xl font-bold text-gray-900">公众号验证码登录</h1>
        <p className="mt-3 text-sm leading-6 text-gray-500">
          点击生成验证码，然后打开微信给公众号发送这 6 位数字。验证成功后网页会自动登录。
        </p>

        {codeState ? (
          <div className="mt-6">
            <div className="rounded-xl bg-green-50 px-6 py-5">
              <div className="font-mono text-5xl font-bold tracking-[0.25em] text-green-700">
                {codeState.code}
              </div>
              <p className="mt-3 text-sm text-green-700">
                剩余 {timeLeft} 秒
              </p>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              请在微信里向公众号发送：{codeState.code}
            </p>
          </div>
        ) : (
          <button
            onClick={createCode}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-green-500 px-5 py-3 font-medium text-white hover:bg-green-600 disabled:bg-green-300"
          >
            {loading ? "生成中..." : "生成微信登录验证码"}
          </button>
        )}

        {codeState && (
          <button
            onClick={createCode}
            disabled={loading}
            className="mt-4 w-full rounded-lg border border-green-500 px-5 py-3 font-medium text-green-600 hover:bg-green-50 disabled:border-green-300 disabled:text-green-300"
          >
            重新生成验证码
          </button>
        )}

        {message && (
          <p className="mt-5 rounded-lg bg-orange-50 p-3 text-left text-sm text-orange-700">
            {message}
          </p>
        )}

        <div className="mt-6 rounded-lg bg-gray-50 p-4 text-left text-xs leading-5 text-gray-500">
          <p>公众号消息转发接口：</p>
          <p className="mt-1 break-all font-mono">
            https://www.zishoo.cn/api/wechat/message
          </p>
          <p className="mt-2">
            元器/公众号需要把微信用户 ID 作为 userID，把验证码作为 yzm 提交。
          </p>
        </div>
      </div>
    </div>
  );
}


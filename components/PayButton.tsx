"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type PayResponse = {
  paid?: boolean;
  orderId?: string;
  mode?: "native" | "h5" | "jsapi";
  codeUrl?: string;
  h5Url?: string;
  error?: string;
};

async function getAuthHeaders(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token
    ? { Authorization: `Bearer ${session.access_token}` }
    : {};
}

async function hasSiteSession() {
  const res = await fetch("/api/auth/me", { cache: "no-store" });
  if (!res.ok) return false;
  const data = await res.json();
  return Boolean(data.loggedIn);
}

export default function PayButton({
  courseId,
  price,
  userId,
}: {
  courseId: string;
  price: number;
  userId?: string;
}) {
  const [showQr, setShowQr] = useState(false);
  const [qrImg, setQrImg] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const router = useRouter();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const startPolling = (nextOrderId: string) => {
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(async () => {
      const res = await fetch(
        `/api/pay/status?orderId=${nextOrderId}&courseId=${courseId}`,
        {
          cache: "no-store",
          headers: await getAuthHeaders(),
        }
      );
      const result = await res.json();

      if (result.paid) {
        if (timerRef.current) clearInterval(timerRef.current);
        setShowQr(false);
        setMessage("支付成功，课程已解锁");
        router.refresh();
      }
    }, 3000);
  };

  const pay = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const siteLoggedIn = await hasSiteSession();

    if (!userId && !session?.user && !siteLoggedIn) {
      setMessage("请先登录后再购买课程");
      router.push(`/login?next=${encodeURIComponent(window.location.pathname)}`);
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await getAuthHeaders()),
        },
        body: JSON.stringify({ courseId }),
      });

      const data = (await res.json()) as PayResponse;

      if (!res.ok) {
        setMessage(data.error || "创建支付失败");
        return;
      }

      if (data.paid) {
        setMessage("你已经购买过这门课程");
        router.refresh();
        return;
      }

      if (!data.orderId) {
        setMessage("订单创建异常，请稍后重试");
        return;
      }

      setOrderId(data.orderId);
      startPolling(data.orderId);

      if (data.mode === "h5" && data.h5Url) {
        const redirectUrl = encodeURIComponent(window.location.href);
        window.location.href = `${data.h5Url}&redirect_url=${redirectUrl}`;
        return;
      }

      if (data.mode === "native" && data.codeUrl) {
        const img = await QRCode.toDataURL(data.codeUrl, {
          width: 260,
          margin: 1,
        });
        setQrImg(img);
        setShowQr(true);
        return;
      }

      setMessage(data.error || "当前环境暂不支持自动支付");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "支付请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={pay}
        disabled={loading}
        className="rounded-lg bg-red-500 px-5 py-3 font-medium text-white hover:bg-red-600 disabled:cursor-not-allowed disabled:bg-red-300"
      >
        {loading ? "创建订单中..." : `购买课程 ￥${price}`}
      </button>

      {message && <p className="mt-3 text-sm text-red-600">{message}</p>}

      {showQr && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl bg-white p-6 text-center shadow-xl">
            <h2 className="mb-2 text-xl font-bold text-gray-900">
              微信扫码支付
            </h2>
            <p className="mb-5 text-sm text-gray-500">
              支付成功后页面会自动解锁课程
            </p>

            {qrImg ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                alt="微信支付二维码"
                src={qrImg}
                className="mx-auto h-[260px] w-[260px]"
              />
            ) : (
              <div className="mx-auto flex h-[260px] w-[260px] items-center justify-center bg-gray-100 text-gray-500">
                正在生成二维码...
              </div>
            )}

            {orderId && (
              <p className="mt-4 break-all text-xs text-gray-400">
                订单号：{orderId}
              </p>
            )}

            <button
              onClick={() => setShowQr(false)}
              className="mt-5 rounded-lg border border-gray-200 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


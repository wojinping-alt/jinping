"use client";

import { useState } from "react";

export default function BuyButton({
  courseId,
  price = 1,
}: {
  courseId: string;
  price?: number;
}) {
  const [loading, setLoading] = useState(false);

  async function handlePay() {
    setLoading(true);

    try {
      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          courseId,
          price,
        }),
      });

      const data = await res.json();
      console.log("支付返回：", data);

      if (data.success && data.code_url) {
        // 打开微信支付二维码页面
        window.open(data.code_url);
      } else {
        alert("支付接口异常，请查看控制台 debug");
      }
    } catch (err) {
      console.error("支付请求失败：", err);
      alert("支付请求失败，请检查网络或控制台");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      onClick={handlePay}
      disabled={loading}
      className="bg-orange-500 text-white px-6 py-2 rounded-lg hover:bg-orange-600"
    >
      {loading ? "生成支付..." : "购买课程"}
    </button>
  );
}

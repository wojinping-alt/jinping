"use client";

import { useState } from "react";
import QRCode from "qrcode";

export default function PayButton({ price }: { price: number }) {
  const [show, setShow] = useState(false);
  const [codeUrl, setCodeUrl] = useState("");
  const [qrImg, setQrImg] = useState("");
  const [loading, setLoading] = useState(false);

  // 发起支付
  const pay = async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/pay", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ price }),
      });

      const data = await res.json();

      if (!data.code_url) {
        alert("支付创建失败");
        return;
      }

      setCodeUrl(data.code_url);

      // 生成二维码图片（关键！避免UI库问题）
      const img = await QRCode.toDataURL(data.code_url);
      setQrImg(img);

      setShow(true);
    } catch (err: any) {
      alert("支付异常：" + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* 购买按钮 */}
      <button
        onClick={pay}
        className="bg-red-500 text-white px-4 py-2 rounded"
      >
        {loading ? "创建支付中..." : `购买课程 ¥${price}`}
      </button>

      {/* 弹窗 */}
      {show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl text-center w-[300px]">
            <h2 className="text-lg font-bold mb-4">微信扫码支付</h2>

            {qrImg ? (
              <img src={qrImg} className="w-[220px] h-[220px] mx-auto" />
            ) : (
              <p>生成二维码中...</p>
            )}

            <p className="text-sm text-gray-500 mt-3">
              使用微信扫一扫完成支付
            </p>

            <button
              onClick={() => setShow(false)}
              className="mt-4 text-red-500"
            >
              关闭
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

export default function WechatLoginButton() {
  return (
    <button
      onClick={() => {
        window.location.href = "/api/wechat/login";
      }}
      className="rounded-lg bg-green-500 px-5 py-3 font-medium text-white hover:bg-green-600"
    >
      微信登录
    </button>
  );
}


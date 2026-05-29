"use client";

export default function WechatLoginButton() {
  const handleLogin = () => {
    const appid = process.env.NEXT_PUBLIC_WECHAT_APP_ID;

    if (!appid) {
      alert("APPID 未加载，请检查 .env");
      return;
    }

    const redirectUri = encodeURIComponent(
      `${process.env.NEXT_PUBLIC_SITE_URL}/api/wechat/callback`
    );

    const url =
      `https://open.weixin.qq.com/connect/oauth2/authorize` +
      `?appid=${appid}` +
      `&redirect_uri=${redirectUri}` +
      `&response_type=code` +
      `&scope=snsapi_userinfo` +
      `&state=123#wechat_redirect`;

    window.location.href = url;
  };

  return (
    <button onClick={handleLogin}>
      微信登录
    </button>
  );
}
import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const userAgent = req.headers.get("user-agent") || "";
  const isWechatBrowser = userAgent.toLowerCase().includes("micromessenger");
  const baseUrl = getBaseUrl(req);
  const redirectUri = encodeURIComponent(`${baseUrl}/api/wechat/callback`);
  const state = crypto.randomUUID();

  if (isWechatBrowser) {
    const appid = process.env.WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_ID;

    if (!appid) {
      return NextResponse.json(
        { error: "缺少 WECHAT_APP_ID 配置" },
        { status: 500 }
      );
    }

    const url =
      "https://open.weixin.qq.com/connect/oauth2/authorize" +
      `?appid=${appid}` +
      `&redirect_uri=${redirectUri}` +
      "&response_type=code" +
      "&scope=snsapi_userinfo" +
      `&state=${state}` +
      "#wechat_redirect";

    return NextResponse.redirect(url);
  }

  const appid = process.env.WECHAT_OPEN_APP_ID;

  if (!appid) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_open_app`);
  }

  const url =
    "https://open.weixin.qq.com/connect/qrconnect" +
    `?appid=${appid}` +
    `&redirect_uri=${redirectUri}` +
    "&response_type=code" +
    "&scope=snsapi_login" +
    `&state=${state}` +
    "#wechat_redirect";

  return NextResponse.redirect(url);
}

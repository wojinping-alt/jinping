import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

function getSafeNextUrl(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return "/courses";
  }

  return value;
}

export async function GET(req: Request) {
  const userAgent = req.headers.get("user-agent") || "";
  const isWechatBrowser = userAgent.toLowerCase().includes("micromessenger");
  const baseUrl = getBaseUrl(req);
  const url = new URL(req.url);
  const nextUrl = getSafeNextUrl(url.searchParams.get("next"));
  const requestedScope = url.searchParams.get("scope");
  const redirectUri = encodeURIComponent(`${baseUrl}/api/wechat/callback`);
  const state = Buffer.from(
    JSON.stringify({ next: nextUrl, scope: requestedScope || "" }),
    "utf8"
  ).toString("base64url");

  if (isWechatBrowser) {
    const appid = process.env.WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_ID;

    if (!appid) {
      return NextResponse.json(
        { error: "缺少 WECHAT_APP_ID 配置" },
        { status: 500 }
      );
    }

    const scope = requestedScope === "snsapi_userinfo" ? "snsapi_userinfo" : "snsapi_base";
    const authUrl =
      "https://open.weixin.qq.com/connect/oauth2/authorize" +
      `?appid=${appid}` +
      `&redirect_uri=${redirectUri}` +
      "&response_type=code" +
      `&scope=${scope}` +
      `&state=${state}` +
      "#wechat_redirect";

    return NextResponse.redirect(authUrl);
  }

  const appid = process.env.WECHAT_OPEN_APP_ID;

  if (!appid) {
    return NextResponse.redirect(`${baseUrl}/login?error=missing_open_app`);
  }

  const authUrl =
    "https://open.weixin.qq.com/connect/qrconnect" +
    `?appid=${appid}` +
    `&redirect_uri=${redirectUri}` +
    "&response_type=code" +
    "&scope=snsapi_login" +
    `&state=${state}` +
    "#wechat_redirect";

  return NextResponse.redirect(authUrl);
}

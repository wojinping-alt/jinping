import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
    }

    const userAgent = req.headers.get("user-agent") || "";
    const isWechatBrowser = userAgent.toLowerCase().includes("micromessenger");
    const appid = isWechatBrowser
      ? process.env.WECHAT_APP_ID || process.env.NEXT_PUBLIC_WECHAT_APP_ID
      : process.env.WECHAT_OPEN_APP_ID;
    const secret = isWechatBrowser
      ? process.env.WECHAT_APP_SECRET
      : process.env.WECHAT_OPEN_APP_SECRET;

    if (!appid || !secret) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_wechat_config`);
    }

    const tokenRes = await fetch(
      "https://api.weixin.qq.com/sns/oauth2/access_token" +
        `?appid=${appid}` +
        `&secret=${secret}` +
        `&code=${code}` +
        "&grant_type=authorization_code",
      { cache: "no-store" }
    );
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token || !tokenData.openid) {
      console.error("WeChat token failed:", tokenData);
      return NextResponse.redirect(`${baseUrl}/login?error=wechat_token_failed`);
    }

    const userRes = await fetch(
      "https://api.weixin.qq.com/sns/userinfo" +
        `?access_token=${tokenData.access_token}` +
        `&openid=${tokenData.openid}` +
        "&lang=zh_CN",
      { cache: "no-store" }
    );
    const wechatUser = await userRes.json();

    const stableId = `wechat:${wechatUser.unionid || tokenData.openid}`;
    const displayName = wechatUser.nickname || "微信用户";
    const response = NextResponse.redirect(`${baseUrl}/courses`);

    response.cookies.set("zishoo_user_id", stableId, {
      httpOnly: true,
      sameSite: "lax",
      secure: baseUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("zishoo_user_name", encodeURIComponent(displayName), {
      httpOnly: false,
      sameSite: "lax",
      secure: baseUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    response.cookies.set("zishoo_wechat_openid", tokenData.openid, {
      httpOnly: true,
      sameSite: "lax",
      secure: baseUrl.startsWith("https://"),
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });

    return response;
  } catch (err) {
    console.error("WeChat login failed:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=wechat_login_failed`);
  }
}

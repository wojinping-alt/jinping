import { NextResponse } from "next/server";

function getBaseUrl(req: Request) {
  return (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    new URL(req.url).origin
  ).replace(/\/$/, "");
}

function getCookieDomain(req: Request) {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL || "";
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(":")[0];
  const host =
    forwardedHost ||
    req.headers.get("host")?.split(":")[0] ||
    new URL(req.url).hostname;

  return configuredSite.includes("zishoo.cn") || host.endsWith("zishoo.cn")
    ? ".zishoo.cn"
    : undefined;
}

function getState(value: string | null) {
  if (!value) return { next: "/courses", scope: "" };

  try {
    const parsed = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    const next =
      typeof parsed.next === "string" &&
      parsed.next.startsWith("/") &&
      !parsed.next.startsWith("//")
        ? parsed.next
        : "/courses";

    return {
      next,
      scope: typeof parsed.scope === "string" ? parsed.scope : "",
    };
  } catch {
    return { next: "/courses", scope: "" };
  }
}

function parseCookie(header: string | null, name: string) {
  if (!header) return "";
  const item = header
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));

  return item ? decodeURIComponent(item.slice(name.length + 1)) : "";
}

export async function GET(req: Request) {
  const baseUrl = getBaseUrl(req);

  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");
    const state = getState(searchParams.get("state"));

    if (!code) {
      return NextResponse.redirect(`${baseUrl}/login?error=missing_code`);
    }

    const userAgent = req.headers.get("user-agent") || "";
    const isWechatBrowser = userAgent.toLowerCase().includes("micromessenger");
    const appid = isWechatBrowser
      ? process.env.WECHAT_APP_ID ||
        process.env.NEXT_PUBLIC_WECHAT_APP_ID ||
        process.env.WECHAT_PAY_APPID
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

    const existingUserId =
      parseCookie(req.headers.get("cookie"), "zishoo_user_id") ||
      parseCookie(req.headers.get("cookie"), "zishoo_user_id_client");
    let stableId = existingUserId || `wechat:${tokenData.openid}`;
    let displayName =
      parseCookie(req.headers.get("cookie"), "zishoo_user_name") || "微信用户";

    if (state.scope === "snsapi_userinfo" || !existingUserId) {
      const userRes = await fetch(
        "https://api.weixin.qq.com/sns/userinfo" +
          `?access_token=${tokenData.access_token}` +
          `&openid=${tokenData.openid}` +
          "&lang=zh_CN",
        { cache: "no-store" }
      );
      const wechatUser = await userRes.json();

      stableId = existingUserId || `wechat:${wechatUser.unionid || tokenData.openid}`;
      displayName = wechatUser.nickname || displayName;
    }

    const response = NextResponse.redirect(`${baseUrl}${state.next}`);
    const secure = baseUrl.startsWith("https://");
    const domain = getCookieDomain(req);

    response.cookies.set("zishoo_user_id", stableId, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      domain,
    });
    response.cookies.set("zishoo_user_id_client", stableId, {
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      domain,
    });
    response.cookies.set("zishoo_user_name", encodeURIComponent(displayName), {
      httpOnly: false,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      domain,
    });
    response.cookies.set("zishoo_wechat_openid", tokenData.openid, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      domain,
    });

    return response;
  } catch (err) {
    console.error("WeChat login failed:", err);
    return NextResponse.redirect(`${baseUrl}/login?error=wechat_login_failed`);
  }
}
